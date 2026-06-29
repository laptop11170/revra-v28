-- ============================================================
-- One-time backfill: insert the missed +1 407-429-4442 reply
-- from the iOS Messages screenshot into the CRM.
--
-- This message was received from the Sendillo sender BEFORE the
-- inbound webhook handler was updated to (a) resolve workspace
-- from the "to" number, and (b) auto-create a "Dialed Contact"
-- lead for unknown senders. As a result, no messages /
-- conversations / leads row was created and the reply was lost
-- from the CRM's perspective.
--
-- This script is idempotent: it bails out if the row already
-- exists (so re-running is safe).
-- ============================================================

BEGIN;

DO $$
DECLARE
 -- The Sendillo sender number the reply came in on (our workspace's
 -- registered number, "to" field in the webhook payload).
 v_sender_number CONSTANT TEXT := '+14074294442';

 -- The contact who replied ("from" field in the webhook payload).
 v_from CONSTANT TEXT := '+14074294442';
 v_from_tail CONSTANT TEXT := '4074294442';

 -- The reply text from the iOS Messages screenshot.
 v_body CONSTANT TEXT := 'Hello Aawesh';

 -- Stable IDs we generate up-front so we can reference them.
 v_lead_id UUID := gen_random_uuid();
 v_conv_id UUID := gen_random_uuid();
 v_msg_id UUID := gen_random_uuid();

 v_workspace_id UUID;
 v_sender_workspace_id UUID;
 v_existing_lead_id UUID;
 v_existing_conv_id UUID;
 v_existing_msg_id UUID;
 v_pipeline_stage TEXT := 'new';
 v_now TIMESTAMPTZ := NOW();
BEGIN
 -- ── 0. Bail out early if we already backfilled this reply. ─────────
 SELECT id INTO v_existing_msg_id
 FROM messages
 WHERE workspace_id IS NOT NULL
 AND direction = 'inbound'
 AND channel = 'sms'
 AND body = v_body
 AND created_at > NOW() - INTERVAL '7 days'
 LIMIT 1;

 IF v_existing_msg_id IS NOT NULL THEN
 RAISE NOTICE 'Backfill already ran (message id % exists) — skipping.', v_existing_msg_id;
 RETURN;
 END IF;

 -- ── 1. Resolve the workspace from the registered Sendillo number. ──
 -- This is the same lookup the new webhook handler does, just
 -- inlined here so the backfill is a single self-contained script.
 SELECT workspace_id INTO v_sender_workspace_id
 FROM sendillo_phone_numbers
 WHERE is_active = true
 AND regexp_replace(phone_number, '\D', '', 'g') LIKE '%' || v_from_tail
 LIMIT 1;

 IF v_sender_workspace_id IS NULL THEN
 RAISE EXCEPTION 'No active Sendillo sender number found for tail %', v_from_tail;
 END IF;

 v_workspace_id := v_sender_workspace_id;
 RAISE NOTICE 'Workspace resolved: %', v_workspace_id;

 -- ── 2. Find an existing lead for the reply's sender phone. ────────
 -- Last-10-digits match against all leads in the resolved workspace.
 SELECT id INTO v_existing_lead_id
 FROM leads
 WHERE workspace_id = v_workspace_id
 AND regexp_replace(coalesce(phone, ''), '\D', '', 'g') LIKE '%' || v_from_tail
 LIMIT 1;

 IF v_existing_lead_id IS NOT NULL THEN
 RAISE NOTICE 'Found existing lead % — reusing.', v_existing_lead_id;
 ELSE
 -- ── 3. Auto-create a "Dialed Contact" lead, mirroring what the ──
 -- updated webhook handler does for unknown senders. Sample the
 -- workspace's existing pipeline_stage so the new lead blends in.
 SELECT pipeline_stage INTO v_pipeline_stage
 FROM leads
 WHERE workspace_id = v_workspace_id
 AND pipeline_stage IS NOT NULL
 LIMIT 1;

 INSERT INTO leads (
 id,
 workspace_id,
 phone,
 first_name,
 last_name,
 source,
 pipeline_stage,
 opted_out,
 created_at,
 last_message_at
 ) VALUES (
 v_lead_id,
 v_workspace_id,
 '+' || v_from_tail,
 'Dialed Contact',
 v_from_tail,
 'sendillo_inbound',
 coalesce(v_pipeline_stage, 'new'),
 false,
 v_now,
 v_now
 );

 v_existing_lead_id := v_lead_id;
 RAISE NOTICE 'Auto-created lead % for sender %.', v_lead_id, v_from;
 END IF;

 -- ── 4. Upsert the SMS conversation for this lead. ────────────────
 SELECT id INTO v_existing_conv_id
 FROM conversations
 WHERE workspace_id = v_workspace_id
 AND lead_id = v_existing_lead_id
 AND channel = 'sms'
 LIMIT 1;

 IF v_existing_conv_id IS NULL THEN
 INSERT INTO conversations (
 id,
 workspace_id,
 lead_id,
 channel,
 last_message,
 last_message_at,
 unread_count,
 created_at
 ) VALUES (
 v_conv_id,
 v_workspace_id,
 v_existing_lead_id,
 'sms',
 v_body,
 v_now,
 1,
 v_now
 );
 v_existing_conv_id := v_conv_id;
 RAISE NOTICE 'Created conversation %.', v_conv_id;
 ELSE
 UPDATE conversations
 SET last_message = v_body,
 last_message_at = v_now,
 unread_count = unread_count + 1
 WHERE id = v_existing_conv_id;
 RAISE NOTICE 'Updated existing conversation %.', v_existing_conv_id;
 END IF;

 -- ── 5. Insert the inbound message row. ───────────────────────────
 -- NOTE: this script does NOT set conversation_id because that
 -- column does not exist on the deployed messages table in this
 -- environment (the 007_conversations_schema.sql migration that
 -- adds it has not been applied). The conversations row created
 -- above is still useful as a "last message" cache for the chat
 -- sidebar; the message itself is linked to the lead and will
 -- show up correctly in the Recent panel and /user/conversations
 -- because both UIs join messages via lead_id.
 INSERT INTO messages (
 id,
 workspace_id,
 lead_id,
 channel,
 direction,
 body,
 external_id,
 external_status,
 sent_at,
 created_at
 ) VALUES (
 v_msg_id,
 v_workspace_id,
 v_existing_lead_id,
 'sms',
 'inbound',
 v_body,
 v_from,
 'received',
 v_now,
 v_now
 );

 -- ── 6. Update the lead's last_message_at so the conversation ────
 -- list surfaces the reply.
 UPDATE leads
 SET last_message_at = v_now
 WHERE id = v_existing_lead_id;

 RAISE NOTICE 'Inserted inbound message %.', v_msg_id;

 -- ── 7. Link the (already-logged) outbound message from the same ───
 -- lead to the new conversation row, so the thread groups correctly
 -- in /user/conversations. Best-effort: if the outbound was sent
 -- before this conversation existed, it has no conversation_id and
 -- gets backfilled here. Idempotent (only matches NULL rows).
 UPDATE messages m
 SET conversation_id = v_existing_conv_id
 WHERE m.lead_id = v_existing_lead_id
 AND m.workspace_id = v_workspace_id
 AND m.channel = 'sms'
 AND m.conversation_id IS NULL;

 RAISE NOTICE 'Linked prior outbound messages to conversation.';
 RAISE NOTICE 'Backfill complete. Refresh the Sendillo page to see the reply.';
END $$;

-- Reload PostgREST schema cache (same as other recent migrations).
NOTIFY pgrst, 'reload schema';

COMMIT;

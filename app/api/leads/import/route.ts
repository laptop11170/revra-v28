import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  // 1. Get user and workspace info
  const { data: user } = await supabase
    .from("users")
    .select("id, workspace_id, role")
    .eq("clerk_user_id", userId)
    .single();

  if (!user?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  // 2. Parse request body
  const body = await req.json();
  const { leads = [], options = {}, filename = "import.csv" } = body;
  const duplicateAction = options.duplicate_action || "skip"; // "skip" | "merge" | "create"
  const defaultStage = options.stage || "new_lead";
  const assignedAgentId = options.assigned_agent_id || user.id;

  if (!Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json({ error: "No leads provided for import" }, { status: 400 });
  }

  // 3. Initialize import job tracking
  const { data: job, error: jobError } = await supabase
    .from("import_jobs")
    .insert({
      workspace_id: user.workspace_id,
      created_by: user.id,
      filename,
      status: "processing",
      total_rows: leads.length,
      inserted: 0,
      updated: 0,
      failed: 0,
      errors: [],
    })
    .select()
    .single();

  if (jobError) {
    return NextResponse.json({ error: "Failed to create import job: " + jobError.message }, { status: 500 });
  }

  let insertedCount = 0;
  let updatedCount = 0;
  let failedCount = 0;
  const errorDetails: any[] = [];
  const batchId = job.id;

  // 4. Process leads sequentially (or in small batches) to avoid rate limits / timeouts
  for (let idx = 0; idx < leads.length; idx++) {
    const rowNum = idx + 1;
    const leadData = leads[idx];
    const firstName = leadData.first_name || leadData.firstName;
    const lastName = leadData.last_name || leadData.lastName || "";
    const phone = leadData.phone || leadData.phonePrimary;
    const email = leadData.email;
    const leadType = leadData.lead_type || leadData.coverageType || null;
    const source = leadData.source || leadData.leadSource || "CSV Import";

    // Validation
    if (!firstName || !phone) {
      failedCount++;
      errorDetails.push({
        row: rowNum,
        name: `${firstName || ""} ${lastName}`.trim() || "Unknown",
        error: "Missing required fields: First Name and Phone are required",
      });
      continue;
    }

    const normalizedPhone = phone.replace(/\D/g, "");
    if (normalizedPhone.length < 10) {
      failedCount++;
      errorDetails.push({
        row: rowNum,
        name: `${firstName} ${lastName}`.trim(),
        error: "Invalid phone number format",
      });
      continue;
    }

    try {
      // Duplicate detection within workspace
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id, first_name, last_name, pipeline_stage, email")
        .eq("workspace_id", user.workspace_id)
        .eq("phone_normalized", normalizedPhone)
        .maybeSingle();

      if (existingLead) {
        if (duplicateAction === "skip") {
          // Skip duplicate, log as skipped/failed
          failedCount++;
          errorDetails.push({
            row: rowNum,
            name: `${firstName} ${lastName}`.trim(),
            error: `Duplicate phone number: already exists as lead ${existingLead.first_name} ${existingLead.last_name}`,
          });
          continue;
        } else if (duplicateAction === "merge") {
          // Update/Merge fields
          const updates: any = {
            updated_at: new Date().toISOString(),
          };
          if (email && !existingLead.email) updates.email = email;
          if (lastName && !existingLead.last_name) updates.last_name = lastName;
          if (leadType) updates.lead_type = leadType;
          if (source) updates.source = source;

          const { error: updateError } = await supabase
            .from("leads")
            .update(updates)
            .eq("id", existingLead.id);

          if (updateError) throw updateError;

          updatedCount++;
          continue;
        }
      }

      // Insert new lead (or duplicateAction === "create")
      const { data: newLead, error: insertError } = await supabase
        .from("leads")
        .insert({
          workspace_id: user.workspace_id,
          first_name: firstName,
          last_name: lastName,
          phone,
          email: email || null,
          lead_type: leadType,
          source,
          assigned_agent_id: assignedAgentId,
          pipeline_stage: defaultStage,
          score: 0,
          tags: ["imported"],
          import_batch_id: batchId,
          import_row_number: rowNum,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Log pipeline move
      await supabase.from("pipeline_moves").insert({
        lead_id: newLead.id,
        from_stage: null,
        to_stage: defaultStage,
        moved_by: user.id,
        note: `Imported via CSV/File: ${filename}`,
      });

      insertedCount++;
    } catch (err: any) {
      failedCount++;
      errorDetails.push({
        row: rowNum,
        name: `${firstName} ${lastName}`.trim(),
        error: err.message || "Database insertion error",
      });
    }
  }

  // 5. Update import job status
  const jobStatus = failedCount === leads.length ? "failed" : failedCount > 0 ? "partial" : "completed";
  const { error: updateJobError } = await supabase
    .from("import_jobs")
    .update({
      status: jobStatus,
      inserted: insertedCount,
      updated: updatedCount,
      failed: failedCount,
      errors: errorDetails,
      completed_at: new Date().toISOString(),
    })
    .eq("id", batchId);

  if (updateJobError) {
    console.error("Failed to finalise import job status:", updateJobError);
  }

  return NextResponse.json({
    success: true,
    jobId: batchId,
    status: jobStatus,
    inserted: insertedCount,
    updated: updatedCount,
    failed: failedCount,
    errors: errorDetails,
  });
}

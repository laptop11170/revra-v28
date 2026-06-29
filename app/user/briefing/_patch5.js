const fs = require('fs');
const path = 'app/user/briefing/page.tsx';
const src = fs.readFileSync(path, 'utf8');
const nl = '\n';
const DQUOTE = '"';
let newSrc = src;

// ── Step 1: Mic import ────────────────────────────────────────────────────────
const imp1 = ' CheckSquare,' + nl + '} from "lucide-react";';
const imp2 = ' CheckSquare,' + nl + ' Mic,' + nl + '} from "lucide-react";';
if (!newSrc.includes(imp1)) { console.error('Import not found'); process.exit(1); }
newSrc = newSrc.replace(imp1, imp2);
console.log('Step 1: Mic import added');

// ── Step 2: Type fields ────────────────────────────────────────────────────
const t1 = ' priority?: string | null;' + nl + ' };' + nl + '};' + nl + nl + 'function PipelineFunnel';
const t2 = ' priority?: string | null;' + nl
 + ' lastCall: {' + nl
 + ' id: string; status: string | null; duration_seconds: number | null;' + nl
 + ' started_at: string | null; direction: string | null; lead_name: string | null;' + nl
 + ' } | null;' + nl
 + ' lastSms: {' + nl
 + ' id: string; body: string | null; direction: string | null;' + nl
 + ' created_at: string | null; lead_name: string | null;' + nl
 + ' } | null;' + nl
 + ' lastRecording: {' + nl
 + ' id: string; status: string | null; duration_seconds: number | null;' + nl
 + ' started_at: string | null; recording_sid: string | null;' + nl
 + ' transcription: string | null; ai_summary: string | null;' + nl
 + ' ai_disposition: string | null; lead_name: string | null;' + nl
 + ' } | null;' + nl
 + ' };' + nl + nl + 'function PipelineFunnel';
if (!newSrc.includes(t1)) { console.error('Type end not found'); process.exit(1); }
newSrc = newSrc.replace(t1, t2);
console.log('Step 2: Types updated');

// ── Step 3: Replace AI Insights card ────────────────────────────────────────
// Find the start of the AI Insights card
const aiStart = ' {/* AI Insights Card */}' + nl
 + ' <Card className="bg-[var(--surface-2)]/60 backdrop-blur-md border border-[var(--line-2)] shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300">' + nl
 + ' <CardContent className="p-6">' + nl
 + ' <div className="flex items-center justify-between mb-4">' + nl
 + ' <h3 className="text-base font-bold text-[var(--ink)] tracking-tight">AI Insights</h3>' + nl
 + ' <Bot size={18} className="text-[var(--viol-400)]" />' + nl
 + ' </div>' + nl
 + ' <div className="space-y-3">' + nl
 + ' {[}';
if (!newSrc.includes(aiStart)) { console.error('AI card start not found'); process.exit(1); }
const aiStartIdx = newSrc.indexOf(aiStart);

// Find the end of the card — the closing </Card> followed by </div></div> then xl:col-span-4
let aiEndIdx = newSrc.indexOf('</Card>' + nl + ' </div>' + nl + ' </div>' + nl + nl + ' <div className="xl:col-span-4', aiStartIdx);
if (aiEndIdx < 0) {
 aiEndIdx = newSrc.indexOf('</Card>' + nl + ' </div>' + nl + ' </div>' + nl + ' <div className="xl:col-span-4', aiStartIdx);
}
if (aiEndIdx < 0) {
 // Try a simpler search: the </Card> that closes the AI insights card
 const cardEnd = '</Card>' + nl + ' </div>' + nl + ' </div>';
 aiEndIdx = newSrc.indexOf(cardEnd, aiStartIdx);
 aiEndIdx += cardEnd.length;
}
console.log('aiStartIdx:', aiStartIdx, 'aiEndIdx:', aiEndIdx);

// Build the 3 new activity cards as plain string (no template literals to avoid ${} issues)
const VC = '[var(--ink)]';
const VM = '[var(--ink-mute)]';
const VF = '[var(--ink-faint)]';
const SB2 = '[var(--surface-2)]';
const SB3 = '[var(--surface-3)]';
const LN2 = '[var(--line-2)]';
const VIOL = '[var(--viol-400)]';

function card(icon, label, leadField, badgeField, contentField, fallbackIcon, fallbackText, gradient, iconBg) {
 const cardHtml = [
 ' {data?' + leadField + ' ? (',
 ' <Card className="bg-' + SB2 + '/60 backdrop-blur-md border border-' + LN2 + ' shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300">',
 ' <CardContent className="p-5">',
 ' <div className="flex items-center gap-2 mb-3">',
 ' <div className="w-8 h-8 rounded-xl bg-gradient-to-br ' + gradient + ' flex items-center justify-center shadow-md">',
 ' ' + icon,
 ' </div>',
 ' <div className="flex-1 min-w-0">',
 ' <p className="text-[10px] font-extrabold uppercase tracking-wider text-' + VM + '">' + label + '</p>',
 ' <p className="text-xs font-bold text-' + VC + ' mt-0.5 truncate">{' + leadField + ' ?? "Unknown Lead"}</p>',
 ' </div>',
 ' <Badge variant={' + badgeField + ' ? "success" : "default"} className="ml-auto text-[9px] shrink-0">',
 ' {' + badgeField + ' ?? "n/a"}',
 ' </Badge>',
 ' </div>',
 ' ' + contentField,
 ' </CardContent>',
 ' </Card>',
 ' ) : (',
 ' <Card className="bg-' + SB2 + '/60 backdrop-blur-md border border-' + LN2 + ' shadow-xl rounded-2xl">',
 ' <CardContent className="p-5 flex flex-col items-center justify-center py-6">',
 ' ' + fallbackIcon,
 ' <p className="text-xs font-bold text-' + VM + '">' + fallbackText + '</p>',
 ' </CardContent>',
 ' </Card>',
 ' )}',
 ].join(nl);
 return cardHtml;
}

const callContent = [
 '{data?.lastCall?.duration_seconds ? (',
 ' <p className="text-lg font-extrabold text-' + VC + '">{Math.floor(data.lastCall.duration_seconds / 60)}m {data.lastCall.duration_seconds % 60}s</p>',
 ' ) : (',
 ' <p className="text-sm font-medium text-' + VM + '">No duration recorded</p>',
 ' )}',
 ' <p className="text-[10px] text-' + VF + ' mt-1 font-medium">',
 ' {data?.lastCall?.started_at ? new Date(data.lastCall.started_at).toLocaleString() : ""}',
 ' </p>',
].join(nl);

const smsContent = [
 ' <p className="text-xs text-' + VM + ' line-clamp-2 leading-relaxed">',
 ' {data?.lastSms?.body ?? ""}',
 ' </p>',
 ' <p className="text-[10px] text-' + VF + ' mt-2 font-medium">',
 ' {data?.lastSms?.created_at ? new Date(data.lastSms.created_at).toLocaleString() : ""}',
 ' </p>',
].join(nl);

const recContent = [
 '{data?.lastRecording?.ai_summary ? (',
 ' <p className="text-xs text-' + VM + ' line-clamp-2 leading-relaxed italic">"{data.lastRecording.ai_summary}"</p>',
 ' ) : (',
 ' <p className="text-xs text-' + VF + ' italic">No AI summary</p>',
 ' )}',
 ' <div className="flex items-center gap-3 mt-2">',
 ' {data?.lastRecording?.duration_seconds ? (',
 ' <span className="text-[10px] text-' + VF + ' font-medium">{Math.floor(data.lastRecording.duration_seconds / 60)}m {data.lastRecording.duration_seconds % 60}s</span>',
 ' ) : null}',
 ' <span className="text-[10px] text-' + VF + ' font-medium">',
 ' {data?.lastRecording?.started_at ? new Date(data.lastRecording.started_at).toLocaleString() : ""}',
 ' </span>',
 ' </div>',
].join(nl);

const phoneIcon = '<PhoneCall size={15} className="text-white" />';
const msgIcon = '<MessageSquare size={15} className="text-white" />';
const micIcon = '<Mic size={15} className="text-white" />';
const phoneFallback = '<PhoneCall size={22} className="text-' + VF + ' mb-2" />';
const msgFallback = '<MessageSquare size={22} className="text-' + VF + ' mb-2" />';
const micFallback = '<Mic size={22} className="text-' + VF + ' mb-2" />';

const lastCallCard = card(
 phoneIcon, 'Last Call',
 'data?.lastCall?.lead_name',
 'data?.lastCall?.status === "completed"',
 callContent,
 phoneFallback,
 'No calls yet',
 'from-emerald-500 to-teal-600',
 'from-emerald-500 to-teal-600'
);

const lastSmsCard = card(
 msgIcon, 'Last SMS',
 'data?.lastSms?.lead_name',
 'data?.lastSms?.direction === "inbound"',
 smsContent,
 msgFallback,
 'No SMS yet',
 'from-blue-500 to-indigo-600',
 'from-blue-500 to-indigo-600'
);

const lastRecCard = card(
 micIcon, 'Last Recording',
 'data?.lastRecording?.lead_name',
 'data?.lastRecording?.ai_disposition',
 recContent,
 micFallback,
 'No recordings yet',
 'from-rose-500 to-orange-500',
 'from-rose-500 to-orange-500'
);

const header = ' {/* Recent Activity — Last Call / SMS / Recording */}' + nl;
const newCardBlock = header + nl + lastCallCard + nl + nl + lastSmsCard + nl + nl + lastRecCard;

newSrc = newSrc.slice(0, aiStartIdx) + newCardBlock + newSrc.slice(aiEndIdx);
console.log('Step 3: Card replaced');

fs.writeFileSync(path, newSrc);
console.log('All done. Length:', newSrc.length);

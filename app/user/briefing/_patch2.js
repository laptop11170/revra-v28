const fs = require('fs');
const path = 'app/user/briefing/page.tsx';
const src = fs.readFileSync(path, 'utf8');
const sp = ' ';
const crlf = '\r\n';

// Inner lines indented 1 space (matching the existing {group.items.map...}).
const oldBlock = [
 sp + '{group.items.map((apt) => {',
 sp + 'const typeMeta = APT_TYPE_META[apt.type] || APT_TYPE_META.Phone;',
 sp + 'const statusMeta = APT_STATUS_META[apt.status] || APT_STATUS_META.pending;',
 sp + 'const leadName = apt.lead',
 sp + sp + '? `${apt.lead.first_name || ""} ${apt.lead.last_name || ""}`.trim() || "No lead"',
 sp + sp + ': "No lead";',
 sp + 'const initials = leadName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();',
 sp + 'const gUrl = googleEventUrl(apt.meeting_link);',
 sp + 'const isNext = apt.id === nextId;',
].join(crlf);

const newBlock = [
 sp + '{group.items.map((apt) => {',
 sp + 'const isTask = apt.kind === "task";',
 sp + '// Appointment metadata (phone/video/in-person). Tasks fall back to a',
 sp + '// neutral indigo gradient so they read as "work", not "meeting".',
 sp + 'const typeMeta = isTask',
 sp + sp + '? { gradient: "from-indigo-500 to-violet-600", ring: "ring-indigo-500/30", chip: "bg-indigo-500/10 text-indigo-300 border-indigo-400/20" }',
 sp + sp + ': (APT_TYPE_META[apt.type] || APT_TYPE_META.Phone);',
 sp + 'const statusMeta = APT_STATUS_META[apt.status] || APT_STATUS_META.pending;',
 sp + 'const leadName = (apt.lead_name && apt.lead_name.trim()) || (isTask ? "Unassigned" : "No lead");',
 sp + 'const initials = (leadName || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();',
 sp + '// Tasks navigate to /user/tasks; appointments go to the calendar page.',
 sp + 'const itemHref = isTask ? "/user/tasks" : "/user/calendar";',
 sp + 'const gUrl = googleEventUrl(apt.meeting_link);',
 sp + 'const isNext = apt.id === nextId;',
].join(crlf);

console.log('Found:', src.includes(oldBlock));
if (!src.includes(oldBlock)) { console.error('oldBlock not found'); process.exit(1); }

const newSrc = src.replace(oldBlock, newBlock);
fs.writeFileSync(path, newSrc);
console.log('Replaced metadata block. New length:', newSrc.length);
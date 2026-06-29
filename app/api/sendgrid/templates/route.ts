// app/api/sendgrid/templates/route.ts
// GET /api/sendgrid/templates — return the list of built-in email templates

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { EMAIL_TEMPLATES } from "@/lib/sendgrid/templates";

export async function GET(req: NextRequest) {
 const { userId } = await auth();
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 // Return metadata only (no html body) so the API response stays small.
 // The wizard fetches the full html via the "email" creation flow which loads the template server-side.
 const meta = EMAIL_TEMPLATES.map(({ html, ...rest }) => rest);
 return NextResponse.json({ templates: meta });
}

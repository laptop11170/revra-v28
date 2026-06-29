// app/api/sendgrid/config/route.ts
// Returns the verified sender identity for the email campaigns wizard.
// Values come from env (workspace-level) since v1 uses a single sender per workspace.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
 const { userId } = await auth();
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const fromEmail = process.env.SENDGRID_FROM_EMAIL ?? "hello@yourdomain.com";
 const fromName = process.env.SENDGRID_FROM_NAME ?? "RevRa CRM";

 // Don't expose whether the API key is set (config check happens at send time)
 return NextResponse.json({
 from_email: fromEmail,
 from_name: fromName,
 });
}

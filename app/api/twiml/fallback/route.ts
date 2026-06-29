// app/api/twiml/fallback/route.ts
// Fallback TwiML endpoint for when the primary outbound endpoint fails
// or doesn't respond within 15 seconds (Twilio's timeout)

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
 const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
 <Say voice="Polly.Joanna">Sorry, we're having trouble connecting your call right now. Please try again later.</Say>
 <Hangup/>
</Response>`;

 return new NextResponse(twiml, {
 headers: { "Content-Type": "application/xml" },
 });
}
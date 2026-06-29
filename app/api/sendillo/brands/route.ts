// app/api/sendillo/brands/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listBrands } from "@/lib/sendillo/client";

// GET /api/sendillo/brands — list Sendillo brands (superadmin)

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const brands = await listBrands();
    return NextResponse.json({ brands });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message ?? "Sendillo error" }, { status: 500 });
  }
}
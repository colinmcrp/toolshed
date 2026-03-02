import { NextResponse } from "next/server";
import { isAllowedEmail } from "@/lib/auth";

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ allowed: false }, { status: 400 });
  }

  return NextResponse.json({ allowed: isAllowedEmail(email) });
}

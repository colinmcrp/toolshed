import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isStaffEmail, getEmailDomainPart } from "@/lib/auth";

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ allowed: false }, { status: 400 });
  }

  // Check if staff domain
  if (isStaffEmail(email)) {
    return NextResponse.json({ allowed: true, type: "staff" });
  }

  // Check partner_domains table
  const domain = getEmailDomainPart(email);
  if (!domain) {
    return NextResponse.json({ allowed: false });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("partner_domains")
    .select("id")
    .eq("domain", domain)
    .single();

  if (data) {
    return NextResponse.json({ allowed: true, type: "partner" });
  }

  return NextResponse.json({ allowed: false });
}

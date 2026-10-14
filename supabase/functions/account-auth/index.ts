import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function normalizePhone(value: unknown): string {
  let phone = String(value ?? "").replace(/[\s()-]/g, "");
  if (phone.startsWith("09") && phone.length === 10) phone = "+251" + phone.slice(1);
  else if (phone.startsWith("9") && phone.length === 9) phone = "+251" + phone;
  else if (phone.startsWith("251")) phone = "+" + phone;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("INVALID_PHONE");
  return phone;
}

function normalizeName(value: unknown): string {
  return String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

async function recoveryHash(secret: string, phone: string, motherName: string, birthDate: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new TextEncoder().encode([phone, normalizeName(motherName), birthDate].join("|"));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, bytes));
  return Array.from(signature, b => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return reply(500, { error: "Account service is not configured." });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply(400, { error: "Invalid request." }); }
  const action = String(body.action ?? "");
  let phone = "";
  try { phone = normalizePhone(body.phone); } catch { return reply(400, { error: "Enter a valid phone number with country code, or an Ethiopian 09/9 number." }); }

  const forwarded = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
  const ipAddress = forwarded.split(",")[0].trim().slice(0, 100) || "unknown";
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  async function limited(): Promise<boolean> {
    const [phoneCount, ipCount] = await Promise.all([
      admin.from("account_recovery_attempts").select("id", { count: "exact", head: true }).eq("phone", phone).gte("attempted_at", cutoff),
      admin.from("account_recovery_attempts").select("id", { count: "exact", head: true }).eq("ip_address", ipAddress).gte("attempted_at", cutoff),
    ]);
    return (phoneCount.count ?? 0) >= 5 || (ipCount.count ?? 0) >= 12;
  }
  async function record(succeeded: boolean) {
    await admin.from("account_recovery_attempts").insert({ phone, ip_address: ipAddress, succeeded });
    await admin.from("account_recovery_attempts").delete().lt("attempted_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  }

  if (await limited()) return reply(429, { error: "Too many attempts. Please wait 15 minutes and try again." });

  if (action === "signup") {
    const fullName = String(body.fullName ?? "").trim().replace(/\s+/g, " ");
    const fatherName = String(body.fatherName ?? "").trim().replace(/\s+/g, " ");
    const motherName = String(body.motherName ?? "").trim().replace(/\s+/g, " ");
    const birthDate = String(body.birthDate ?? "").trim();
    const password = String(body.password ?? "");
    if (fullName.length < 2 || fullName.length > 120 || fatherName.length < 2 || fatherName.length > 120 || motherName.length < 2 || motherName.length > 120) {
      await record(false);
      return reply(400, { error: "Enter your full name and both parents' full names." });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(Date.parse(birthDate)) || birthDate >= new Date().toISOString().slice(0, 10)) {
      await record(false);
      return reply(400, { error: "Enter a valid birth date." });
    }
    if (password.length < 8 || password.length > 128) {
      await record(false);
      return reply(400, { error: "Password must be at least 8 characters." });
    }
    const { data: existing } = await admin.from("profiles").select("id").eq("phone", phone).maybeSingle();
    if (existing?.id) {
      await record(false);
      return reply(409, { error: "This phone number is already registered." });
    }

    const { data, error } = await admin.auth.admin.createUser({
      phone,
      password,
      phone_confirm: true,
      user_metadata: {
        full_name: fullName,
        preferred_language: body.language === "am" ? "am" : "en",
      },
    });
    if (error || !data.user) {
      await record(false);
      const duplicate = /already|exists|registered|unique/i.test(error?.message || "");
      return reply(duplicate ? 409 : 400, { error: duplicate ? "This phone number is already registered." : "Could not create the account. Check the information and try again." });
    }

    const hash = await recoveryHash(serviceKey, phone, motherName, birthDate);
    const { error: profileError } = await admin.from("profiles").update({
      full_name: fullName,
      phone,
      father_full_name: fatherName,
      birth_date: birthDate,
      recovery_hash: hash,
      preferred_language: body.language === "am" ? "am" : "en",
    }).eq("id", data.user.id);
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      await record(false);
      return reply(500, { error: "Could not finish account setup. Please try again." });
    }
    await record(true);
    return reply(200, { ok: true });
  }

  if (action === "recover") {
    const motherName = String(body.motherName ?? "").trim();
    const birthDate = String(body.birthDate ?? "").trim();
    if (motherName.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      await record(false);
      return reply(400, { error: "Enter your phone number, mother's full name, and birth date." });
    }
    const { data: profile } = await admin.from("profiles").select("id,recovery_hash").eq("phone", phone).maybeSingle();
    const expected = profile?.recovery_hash || "";
    const provided = await recoveryHash(serviceKey, phone, motherName, birthDate);
    if (!profile?.id || !expected || !constantTimeEqual(expected, provided)) {
      await record(false);
      return reply(401, { error: "The phone number or recovery details could not be verified." });
    }
    const { data: recent } = await admin.from("account_recovery_requests")
      .select("id,status,created_at")
      .eq("user_id", profile.id)
      .eq("status", "pending")
      .maybeSingle();
    if (recent?.id) {
      await record(true);
      return reply(200, { ok: true, message: "A password reset request is already waiting for the administrator." });
    }
    const { error } = await admin.from("account_recovery_requests").insert({
      user_id: profile.id,
      phone,
      status: "pending",
    });
    if (error) {
      await record(false);
      return reply(500, { error: "Could not send the reset request. Please try again." });
    }
    await record(true);
    return reply(200, { ok: true, message: "Your reset request has been recorded. Contact the administrator to complete the reset." });
  }

  await record(false);
  return reply(400, { error: "Unsupported account action." });
});

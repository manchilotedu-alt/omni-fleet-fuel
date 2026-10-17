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

function loginEmailForPhone(phone: string): string {
  return `${phone.replace(/\D/g, "")}@users.omni-fleet-fuel.invalid`;
}

function sessionIdFromJwt(token: string): string {
  try {
    const part = token.split(".")[1];
    if (!part) return "";
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const payload = JSON.parse(atob(normalized));
    return typeof payload.session_id === "string" ? payload.session_id : "";
  } catch {
    return "";
  }
}

function safeText(value: unknown, max: number): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed." });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !anonKey) return reply(500, { error: "Platform account service is not configured." });

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply(400, { error: "Invalid request body." }); }
  const action = String(body.action ?? "");
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return reply(401, { error: "Sign in is required." });

  const callerClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser(token);
  if (callerError || !callerData.user) return reply(401, { error: "Your session is invalid. Sign in again." });
  const caller = callerData.user;

  // All administrative actions require the explicitly provisioned Platform Owner allowlist.
  const { data: owner, error: ownerError } = await admin.from("platform_owner_access")
    .select("user_id,is_active").eq("user_id", caller.id).maybeSingle();
  if (ownerError) return reply(500, { error: "Could not verify Platform Owner access. Check that the approved migration is installed." });
  if (!owner?.is_active) return reply(403, { error: "This account is not authorized as the Platform Owner." });

  // Require the same server-bound session and approved device used by account-auth.
  const jwtSessionId = sessionIdFromJwt(token);
  if (!jwtSessionId || jwtSessionId !== String(caller.app_metadata?.active_supabase_session_id || "")) {
    return reply(401, { error: "This secure session is no longer active. Sign in again." });
  }
  const activeDeviceId = String(caller.app_metadata?.active_device_access_id || "");
  if (!activeDeviceId) return reply(403, { error: "An approved device is required for Platform Owner access." });
  const { data: device, error: deviceError } = await admin.from("device_access_controls")
    .select("id,status").eq("id", activeDeviceId).maybeSingle();
  if (deviceError) return reply(500, { error: "Could not verify this device." });
  if (device?.status !== "approved") return reply(403, { error: "This device is not approved for Platform Owner access." });

  const { data: ownerAccountControl, error: ownerAccountError } = await admin.from("account_access_controls")
    .select("status,reason").eq("user_id", caller.id).maybeSingle();
  if (ownerAccountError) return reply(500, { error: "Could not verify Platform Owner account status." });
  if (ownerAccountControl?.status === "blocked") {
    return reply(403, { error: ownerAccountControl.reason || "This account has been blocked." });
  }

  const audit = async (targetUserId: string | null, event: string, details: Record<string, unknown> = {}) => {
    const { error } = await admin.from("platform_owner_audit_events").insert({
      actor_user_id: caller.id,
      target_user_id: targetUserId,
      action: event,
      details,
    });
    return error;
  };

  if (action === "list-users") {
    const page = Math.max(1, Math.min(10000, Number(body.page) || 1));
    const perPage = Math.max(1, Math.min(100, Number(body.perPage) || 50));
    const { data: authUsers, error: usersError } = await admin.auth.admin.listUsers({ page, perPage });
    if (usersError) return reply(500, { error: "Could not load users." });
    const ids = authUsers.users.map(user => user.id);
    const [profilesResult, subscriptionsResult, accessResult] = await Promise.all([
      ids.length ? admin.from("profiles").select("id,full_name,phone,alternate_phone,created_at").in("id", ids) : Promise.resolve({ data: [], error: null }),
      ids.length ? admin.from("platform_user_subscriptions").select("user_id,trial_starts_at,trial_ends_at,payment_status,paid_through,access_note,updated_at").in("user_id", ids) : Promise.resolve({ data: [], error: null }),
      ids.length ? admin.from("account_access_controls").select("user_id,status,reason,blocked_at").in("user_id", ids) : Promise.resolve({ data: [], error: null }),
    ]);
    if (profilesResult.error || subscriptionsResult.error || accessResult.error) {
      return reply(500, { error: "Could not load account, trial, payment, or access status. Verify the feature migrations are installed." });
    }
    const profiles = new Map((profilesResult.data || []).map((x: any) => [x.id, x]));
    const subscriptions = new Map((subscriptionsResult.data || []).map((x: any) => [x.user_id, x]));
    const access = new Map((accessResult.data || []).map((x: any) => [x.user_id, x]));
    return reply(200, {
      users: authUsers.users.map(user => ({
        id: user.id,
        email: user.email?.endsWith("@users.omni-fleet-fuel.invalid") ? "" : (user.email || ""),
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at || null,
        profile: profiles.get(user.id) || null,
        subscription: subscriptions.get(user.id) || null,
        account_access: access.get(user.id) || { status: "active", reason: null, blocked_at: null },
        must_change_password: user.app_metadata?.must_change_password === true,
      })),
      page,
      perPage,
      total: authUsers.total ?? null,
    });
  }

  if (action === "create-user") {
    const fullName = safeText(body.fullName, 120);
    const alternatePhoneRaw = safeText(body.alternatePhone, 40);
    const temporaryPassword = String(body.temporaryPassword || "");
    const trialDays = Number(body.trialDays);
    let phone: string;
    let alternatePhone = "";
    try {
      phone = normalizePhone(body.phone);
      if (alternatePhoneRaw) alternatePhone = normalizePhone(alternatePhoneRaw);
    } catch {
      return reply(400, { error: "Enter a valid main phone number and, if supplied, a valid alternate phone number." });
    }
    if (fullName.length < 2) return reply(400, { error: "Full name is required." });
    if (alternatePhone && alternatePhone === phone) return reply(400, { error: "The alternate phone must differ from the main phone." });
    if (temporaryPassword.length < 12 || temporaryPassword.length > 128) {
      return reply(400, { error: "The temporary password must contain 12–128 characters." });
    }
    if (!Number.isInteger(trialDays) || trialDays < 0 || trialDays > 3650) {
      return reply(400, { error: "Trial days must be a whole number from 0 to 3650." });
    }

    const { data: duplicate, error: duplicateError } = await admin.from("profiles").select("id").eq("phone", phone).maybeSingle();
    if (duplicateError) return reply(500, { error: "Could not check the phone number." });
    if (duplicate) return reply(409, { error: "This main phone number is already registered." });
    if (alternatePhone) {
      const { data: alternateDuplicate, error: alternateError } = await admin.from("profiles").select("id")
        .or(`phone.eq.${alternatePhone},alternate_phone.eq.${alternatePhone}`).maybeSingle();
      if (alternateError) return reply(500, { error: "Could not check the alternate phone number." });
      if (alternateDuplicate) return reply(409, { error: "This phone number is already used by another account." });
    }

    const now = new Date();
    const trialStart = trialDays > 0 ? now.toISOString() : null;
    const trialEnd = trialDays > 0 ? new Date(now.getTime() + trialDays * 86400000).toISOString() : null;
    const loginEmail = loginEmailForPhone(phone);
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: loginEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone, alternate_phone: alternatePhone || null, preferred_language: "en" },
      app_metadata: { must_change_password: true },
    });
    if (createError || !created.user) {
      const msg = String(createError?.message || "");
      if (/already|registered|exists/i.test(msg)) return reply(409, { error: "An account already exists for this phone number." });
      return reply(400, { error: "The account could not be created. Verify the details and try again." });
    }

    const userId = created.user.id;
    // Auth creation invokes the existing bootstrap trigger; organization and fleet data are not rewritten.
    const { error: profileError } = await admin.from("profiles").upsert({
      id: userId, full_name: fullName, phone, alternate_phone: alternatePhone || null, preferred_language: "en",
    }, { onConflict: "id" });
    if (profileError) return reply(500, { error: "The auth account was created, but profile setup needs operator repair. The account was not deleted." });

    const { error: subscriptionError } = await admin.from("platform_user_subscriptions").upsert({
      user_id: userId,
      trial_starts_at: trialStart,
      trial_ends_at: trialEnd,
      payment_status: trialDays > 0 ? "trial" : "unpaid",
      updated_by: caller.id,
      updated_at: now.toISOString(),
    }, { onConflict: "user_id" });
    if (subscriptionError) return reply(500, { error: "The account and profile were created, but trial/payment setup needs operator repair. The account was not deleted." });

    const auditError = await audit(userId, "user_created", { trial_days: trialDays, payment_status: trialDays > 0 ? "trial" : "unpaid" });
    if (auditError) return reply(500, { error: "The account was created, but audit recording failed. Review before continuing." });
    return reply(201, { ok: true, userId, message: "User created. The temporary password is not stored by the platform management service; share it securely with the user." });
  }

  if (action === "set-subscription") {
    const targetUserId = String(body.userId || "");
    if (!/^[0-9a-f-]{36}$/i.test(targetUserId)) return reply(400, { error: "Select a valid user." });
    const paymentStatus = String(body.paymentStatus || "");
    if (!["trial", "unpaid", "paid", "overdue", "expired", "comped"].includes(paymentStatus)) {
      return reply(400, { error: "Select a valid payment status." });
    }
    const trialDays = body.trialDays === undefined || body.trialDays === null || body.trialDays === "" ? null : Number(body.trialDays);
    if (trialDays !== null && (!Number.isInteger(trialDays) || trialDays < 0 || trialDays > 3650)) {
      return reply(400, { error: "Trial extension must be a whole number from 0 to 3650." });
    }
    const paidThrough = body.paidThrough ? String(body.paidThrough) : null;
    if (paidThrough && !/^\d{4}-\d{2}-\d{2}$/.test(paidThrough)) return reply(400, { error: "Enter a valid paid-through date." });
    const now = new Date();
    const update: Record<string, unknown> = { payment_status: paymentStatus, updated_by: caller.id, updated_at: now.toISOString() };
    if (trialDays !== null) {
      update.trial_starts_at = now.toISOString();
      update.trial_ends_at = trialDays > 0 ? new Date(now.getTime() + trialDays * 86400000).toISOString() : now.toISOString();
    }
    if (paidThrough !== null) update.paid_through = paidThrough;
    if (body.accessNote !== undefined) update.access_note = safeText(body.accessNote, 500) || null;
    const { error } = await admin.from("platform_user_subscriptions").upsert({ user_id: targetUserId, ...update }, { onConflict: "user_id" });
    if (error) return reply(500, { error: "Subscription status could not be saved." });
    const event = trialDays !== null ? "trial_extended" : "payment_status_changed";
    const auditError = await audit(targetUserId, event, { payment_status: paymentStatus, trial_days: trialDays, paid_through: paidThrough });
    if (auditError) return reply(500, { error: "Subscription was saved, but audit recording failed. Review the audit trail." });
    return reply(200, { ok: true });
  }

  if (action === "set-account-access") {
    const targetUserId = String(body.userId || "");
    const operation = String(body.operation || "");
    const reason = safeText(body.reason, 500);
    if (!/^[0-9a-f-]{36}$/i.test(targetUserId)) return reply(400, { error: "Select a valid user." });
    if (!["block", "unblock"].includes(operation)) return reply(400, { error: "Select block or unblock." });
    if (targetUserId === caller.id) return reply(400, { error: "The Platform Owner cannot block their own account here." });
    if (operation === "block" && reason.length < 3) return reply(400, { error: "Enter a reason for blocking this account." });
    const status = operation === "block" ? "blocked" : "active";
    const { error } = await admin.from("account_access_controls").upsert({
      user_id: targetUserId, status, reason: reason || null, updated_by: caller.id,
      updated_at: new Date().toISOString(), blocked_at: operation === "block" ? new Date().toISOString() : null,
    }, { onConflict: "user_id" });
    if (error) return reply(500, { error: "Account access status could not be saved." });
    const auditError = await audit(targetUserId, operation === "block" ? "account_access_blocked" : "account_access_restored", { reason: reason || null });
    if (auditError) return reply(500, { error: "Access status was saved, but audit recording failed. Review the audit trail." });
    return reply(200, { ok: true });
  }

  if (action === "reset-user-password") {
    const targetUserId = String(body.userId || "");
    const temporaryPassword = String(body.temporaryPassword || "");
    if (!/^[0-9a-f-]{36}$/i.test(targetUserId)) return reply(400, { error: "Select a valid user." });
    if (temporaryPassword.length < 12 || temporaryPassword.length > 128) return reply(400, { error: "The temporary password must contain 12–128 characters." });
    const { data: target, error: targetError } = await admin.auth.admin.getUserById(targetUserId);
    if (targetError || !target.user) return reply(404, { error: "User not found." });
    const nextMetadata = { ...(target.user.app_metadata || {}), must_change_password: true };
    const { error } = await admin.auth.admin.updateUserById(targetUserId, {
      password: temporaryPassword,
      app_metadata: nextMetadata,
    });
    if (error) return reply(400, { error: "The temporary password could not be set." });
    const auditError = await audit(targetUserId, "temporary_password_reset", { must_change_password: true });
    if (auditError) return reply(500, { error: "Password reset succeeded, but audit recording failed. Review the audit trail." });
    return reply(200, { ok: true, message: "Temporary password set. The user must change it after signing in." });
  }

  if (action === "change-own-password") {
    const oldPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    if (newPassword.length < 12 || newPassword.length > 128) return reply(400, { error: "The new password must contain 12–128 characters." });
    if (newPassword === oldPassword) return reply(400, { error: "Choose a password different from the current password." });
    // Verify current password against the phone-based internal login email before updating.
    const phone = String(caller.user_metadata?.phone || "");
    let normalizedPhone: string;
    try { normalizedPhone = normalizePhone(phone); } catch { return reply(400, { error: "Your account phone number needs support review before changing the password." }); }
    const verifyClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error: verifyError } = await verifyClient.auth.signInWithPassword({ email: loginEmailForPhone(normalizedPhone), password: oldPassword });
    if (verifyError) return reply(401, { error: "Current password is incorrect." });
    const { error: updateError } = await admin.auth.admin.updateUserById(caller.id, {
      password: newPassword,
      app_metadata: { ...(caller.app_metadata || {}), must_change_password: false },
    });
    if (updateError) return reply(400, { error: "The new password could not be saved." });
    const auditError = await audit(caller.id, "password_change_required", { completed: true });
    if (auditError) return reply(500, { error: "Password changed, but audit recording failed." });
    return reply(200, { ok: true, message: "Password changed successfully. Sign in again with your new password." });
  }

  return reply(400, { error: "Unsupported Platform Owner action." });
});

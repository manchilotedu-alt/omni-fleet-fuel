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


async function deviceHash(secret: string, deviceId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("omni-device|" + deviceId)));
  return Array.from(signature, b => b.toString(16).padStart(2, "0")).join("");
}

function supabaseSessionId(accessToken: string): string {
  try {
    const part = accessToken.split(".")[1];
    if (!part) return "";
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const payload = JSON.parse(atob(base64));
    return typeof payload.session_id === "string" ? payload.session_id : "";
  } catch {
    return "";
  }
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

  // Self-registration is disabled: accounts are provisioned only by the verified Platform Owner.
  // Keep the existing login/recovery/device flows intact.
  if (action === "signup") {
    return reply(403, { error: "Self-registration is disabled. Contact the OMNI Fleet Fuel Platform Owner to receive an account." });
  }

  // Administrative recovery actions are authenticated with the caller's Supabase access token.
  // The service-role client is used only after the caller is verified and scoped to their own organization.
  if (action === "admin-recovery-list" || action === "admin-recovery-resolve") {
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authorization = req.headers.get("Authorization") || "";
    const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!anonKey || !accessToken) return reply(401, { error: "Please sign in as an organization administrator." });
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser(accessToken);
    if (callerError || !callerData.user) return reply(401, { error: "Your session is invalid. Please sign in again." });
    const recoveryCaller = callerData.user;
    const recoveryJwtSessionId = supabaseSessionId(accessToken);
    if (!recoveryJwtSessionId || recoveryJwtSessionId !== String(recoveryCaller.app_metadata?.active_supabase_session_id || "")) {
      return reply(401, { error: "Your secure login session is no longer active." });
    }
    const { data: recoveryAccountControl, error: recoveryAccountError } = await admin.from("account_access_controls")
      .select("status,reason").eq("user_id", recoveryCaller.id).maybeSingle();
    if (recoveryAccountError) return reply(500, { error: "Could not verify administrator account status." });
    if (recoveryAccountControl?.status === "blocked") return reply(403, { error: recoveryAccountControl.reason || "This account has been blocked by an administrator." });
    const recoveryDeviceId = String(recoveryCaller.app_metadata?.active_device_access_id || "");
    const recoverySessionId = String(body.sessionId || "");
    const recoveryLocalDeviceId = String(body.deviceId || "");
    if (!recoveryDeviceId || !recoverySessionId ||
        String(recoveryCaller.app_metadata?.active_session_id || "") !== recoverySessionId ||
        !/^[0-9a-f-]{36}$/i.test(recoveryLocalDeviceId)) {
      return reply(401, { error: "This administrator session is no longer active." });
    }
    const recoveryDeviceKeyHash = await deviceHash(serviceKey, recoveryLocalDeviceId);
    const { data: recoveryDevice, error: recoveryDeviceError } = await admin.from("device_access_controls")
      .select("status").eq("id", recoveryDeviceId).eq("device_key_hash", recoveryDeviceKeyHash).maybeSingle();
    if (recoveryDeviceError) return reply(500, { error: "Could not verify administrator device status." });
    if (recoveryDevice?.status !== "approved") return reply(403, { error: "Only an approved device can manage recovery requests." });
    const { data: adminMembership, error: membershipError } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", callerData.user.id)
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();
    if (membershipError || !adminMembership?.organization_id) return reply(403, { error: "Only an organization administrator can manage recovery requests." });

    const { data: members, error: membersError } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", adminMembership.organization_id);
    if (membersError) return reply(500, { error: "Could not load organization members." });
    const memberIds = (members || []).map((member: { user_id: string }) => member.user_id);
    if (action === "admin-recovery-list") {
      if (!memberIds.length) return reply(200, { requests: [] });
      const { data: requests, error: requestsError } = await admin
        .from("account_recovery_requests")
        .select("id,user_id,phone,status,created_at")
        .in("user_id", memberIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(100);
      if (requestsError) return reply(500, { error: "Could not load recovery requests." });
      const userIds = [...new Set((requests || []).map((request: { user_id: string }) => request.user_id))];
      const { data: profiles } = userIds.length
        ? await admin.from("profiles").select("id,full_name").in("id", userIds)
        : { data: [] as { id: string; full_name: string }[] };
      const names = new Map<string, string>((profiles || []).map((profile: { id: string; full_name: string }) => [profile.id, profile.full_name] as [string, string]));
      return reply(200, { requests: (requests || []).map((request: Record<string, unknown>) => ({ ...request, full_name: names.get(String(request.user_id)) || "Fleet user" })) });
    }

    const requestId = String(body.requestId || "");
    const newPassword = String(body.newPassword || "");
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) return reply(400, { error: "Select a valid recovery request." });
    if (newPassword.length < 8 || newPassword.length > 128) return reply(400, { error: "The new password must be 8–128 characters." });
    const { data: recoveryRequest, error: recoveryError } = await admin
      .from("account_recovery_requests")
      .select("id,user_id,status")
      .eq("id", requestId)
      .eq("status", "pending")
      .maybeSingle();
    if (recoveryError || !recoveryRequest) return reply(404, { error: "This request is no longer pending." });
    if (!memberIds.includes(recoveryRequest.user_id)) return reply(403, { error: "This request is outside your organization." });
    const { error: passwordError } = await admin.auth.admin.updateUserById(recoveryRequest.user_id, { password: newPassword });
    if (passwordError) return reply(400, { error: "The password could not be reset. Please try again." });
    const { error: updateError } = await admin.from("account_recovery_requests").update({
      status: "approved",
      resolved_at: new Date().toISOString(),
      resolved_by: callerData.user.id,
    }).eq("id", requestId).eq("status", "pending");
    if (updateError) return reply(500, { error: "The password was reset, but the request status could not be updated. Please contact support." });
    return reply(200, { ok: true, message: "Password reset completed. Tell the user to sign in with the new password." });
  }


  if (action === "activate-session" || action === "deactivate-session" || action === "access-check" || action === "admin-access-list" || action === "admin-access-set" || action === "change-password") {
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authorization = req.headers.get("Authorization") || "";
    const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!anonKey || !accessToken) return reply(401, { error: "Please sign in to continue." });
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: callerData, error: callerError } = await callerClient.auth.getUser(accessToken);
    if (callerError || !callerData.user) return reply(401, { error: "Your session is invalid. Please sign in again." });
    const caller = callerData.user;

    if (action === "change-password") {
      const currentPassword = String(body.currentPassword || "");
      const newPassword = String(body.newPassword || "");
      const sessionId = String(body.sessionId || "");
      const deviceId = String(body.deviceId || "");
      const jwtSessionId = supabaseSessionId(accessToken);
      if (!jwtSessionId || jwtSessionId !== String(caller.app_metadata?.active_supabase_session_id || "") ||
          !sessionId || sessionId !== String(caller.app_metadata?.active_session_id || "")) {
        return reply(401, { error: "Your secure session is no longer active. Sign in again." });
      }
      if (!/^[0-9a-f-]{36}$/i.test(deviceId)) return reply(400, { error: "A valid device identifier is required." });
      if (newPassword.length < 12 || newPassword.length > 128) return reply(400, { error: "The new password must contain 12–128 characters." });
      if (currentPassword.length < 8 || currentPassword === newPassword) return reply(400, { error: "Enter your current password and choose a different new password." });

      const accountControl = await admin.from("account_access_controls").select("status,reason").eq("user_id", caller.id).maybeSingle();
      if (accountControl.error) return reply(500, { error: "Could not verify account access." });
      if (accountControl.data?.status === "blocked") return reply(403, { error: accountControl.data.reason || "This account has been blocked." });

      const activeDeviceId = String(caller.app_metadata?.active_device_access_id || "");
      const hash = await deviceHash(serviceKey, deviceId);
      const deviceResult = await admin.from("device_access_controls").select("id,status")
        .eq("id", activeDeviceId).eq("device_key_hash", hash).maybeSingle();
      if (deviceResult.error) return reply(500, { error: "Could not verify this device." });
      if (deviceResult.data?.status !== "approved") return reply(403, { error: "This device is not approved." });

      const loginEmail = String(caller.email || "");
      if (!loginEmail || !loginEmail.endsWith("@users.omni-fleet-fuel.invalid")) {
        return reply(400, { error: "This account needs support assistance to change its password." });
      }
      const verifyClient = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
      const { error: verifyError } = await verifyClient.auth.signInWithPassword({ email: loginEmail, password: currentPassword });
      if (verifyError) return reply(401, { error: "Current password is incorrect." });

      const appMetadata = { ...(caller.app_metadata || {}), must_change_password: false };
      const { error: passwordError } = await admin.auth.admin.updateUserById(caller.id, {
        password: newPassword,
        app_metadata: appMetadata,
      });
      if (passwordError) return reply(400, { error: "The new password could not be saved." });
      return reply(200, { ok: true, mustChangePassword: false, message: "Password changed. Sign in again with your new password." });
    }

    if (action === "deactivate-session") {
      const sessionId = String(body.sessionId || "");
      const deviceId = String(body.deviceId || "");
      const currentAppSessionId = String(caller.app_metadata?.active_session_id || "");
      const currentSupabaseSessionId = String(caller.app_metadata?.active_supabase_session_id || "");
      const requestSupabaseSessionId = supabaseSessionId(accessToken);
      if (currentAppSessionId !== sessionId || !sessionId ||
          currentSupabaseSessionId !== requestSupabaseSessionId || !requestSupabaseSessionId) {
        return reply(200, { ok: true, alreadyInactive: true });
      }
      if (!/^[0-9a-f-]{36}$/i.test(deviceId)) return reply(400, { error: "A valid device identifier is required." });
      const activeDeviceId = String(caller.app_metadata?.active_device_access_id || "");
      const hash = await deviceHash(serviceKey, deviceId);
      const { data: device, error: deviceError } = await admin.from("device_access_controls")
        .select("id").eq("id", activeDeviceId).eq("device_key_hash", hash).maybeSingle();
      if (deviceError) return reply(500, { error: "Could not verify this device." });
      if (!device) return reply(403, { error: "This session does not match this device." });
      const appMetadata = { ...(caller.app_metadata || {}) };
      delete appMetadata.active_session_id;
      delete appMetadata.active_supabase_session_id;
      delete appMetadata.active_device_access_id;
      const { error: updateError } = await admin.auth.admin.updateUserById(caller.id, { app_metadata: appMetadata });
      if (updateError) return reply(500, { error: "Could not deactivate the secure session." });
      return reply(200, { ok: true });
    }

    if (action === "activate-session") {
      const sessionId = String(body.sessionId || "");
      const deviceId = String(body.deviceId || "");
      if (!/^[0-9a-f-]{36}$/i.test(sessionId) || !/^[0-9a-f-]{36}$/i.test(deviceId)) {
        return reply(400, { error: "A valid session and device identifier are required." });
      }
      const { data: activationAccountControl, error: activationAccountError } = await admin.from("account_access_controls")
        .select("status,reason").eq("user_id", caller.id).maybeSingle();
      if (activationAccountError) return reply(500, { error: "Could not verify account access." });
      if (activationAccountControl?.status === "blocked") {
        return reply(403, { error: activationAccountControl.reason || "This account has been blocked by an administrator." });
      }
      const supabaseSession = supabaseSessionId(accessToken);
      if (!supabaseSession) return reply(401, { error: "Your secure login session could not be verified. Please sign in again." });
      const hash = await deviceHash(serviceKey, deviceId);
      let { data: device, error: deviceError } = await admin
        .from("device_access_controls")
        .select("id,status")
        .eq("device_key_hash", hash)
        .maybeSingle();
      if (deviceError) return reply(500, { error: "Could not verify this device." });
      if (device?.status === "blocked") return reply(403, { error: "This device has been blocked by an administrator." });

      if (!device) {
        const { data: created, error: createError } = await admin
          .from("device_access_controls")
          .insert({ device_key_hash: hash, status: "pending", device_label: String(body.deviceLabel || "Android / Web device").slice(0, 100) })
          .select("id,status")
          .single();
        if (createError || !created) return reply(500, { error: "Could not register this device." });
        device = created;
      } else {
        await admin.from("device_access_controls").update({ last_seen_at: new Date().toISOString() }).eq("id", device.id);
      }

      const { data: memberships, error: membershipsError } = await admin
        .from("organization_members")
        .select("organization_id,role")
        .eq("user_id", caller.id);
      if (membershipsError) return reply(500, { error: "Could not verify your organization access." });

      let shouldAutoApprove = false;
      const { data: accessSettings } = await admin.from("account_device_access_settings")
        .select("enforced_since").eq("id", true).maybeSingle();
      const bootstrapCutoff = accessSettings?.enforced_since ? Date.parse(accessSettings.enforced_since) : Number.NEGATIVE_INFINITY;
      const callerCreatedAt = Date.parse(String(caller.created_at || ""));
      for (const membership of memberships || []) {
        const { error: linkError } = await admin.from("device_access_memberships").upsert({
          device_id: device.id,
          user_id: caller.id,
          organization_id: membership.organization_id,
          last_seen_at: new Date().toISOString(),
        }, { onConflict: "device_id,user_id,organization_id" });
        if (linkError) return reply(500, { error: "Could not link this device to your account." });

        if (membership.role === "admin" && callerCreatedAt < bootstrapCutoff) {
          const { data: organization, error: organizationError } = await admin.from("organizations")
            .select("created_at").eq("id", membership.organization_id).maybeSingle();
          const organizationCreatedAt = Date.parse(String(organization?.created_at || ""));
          if (organizationError || !Number.isFinite(organizationCreatedAt) || organizationCreatedAt >= bootstrapCutoff) {
            continue;
          }
          const { count, error: countError } = await admin
            .from("device_access_memberships")
            .select("device_id", { count: "exact", head: true })
            .eq("organization_id", membership.organization_id);
          if (!countError && (count || 0) <= 1) shouldAutoApprove = true;
        }
      }
      if (device.status === "pending" && shouldAutoApprove) {
        const { error: approveError } = await admin.from("device_access_controls").update({
          status: "approved", approved_by: caller.id, updated_at: new Date().toISOString(),
        }).eq("id", device.id);
        if (approveError) return reply(500, { error: "Could not approve the initial administrator device." });
        device.status = "approved";
      }

      if (device.status !== "approved") {
        return reply(200, { ok: true, deviceStatus: "pending", deviceId: device.id });
      }

      const appMetadata = {
        ...(caller.app_metadata || {}),
        active_session_id: sessionId,
        active_supabase_session_id: supabaseSession,
        active_device_access_id: device.id,
      };
      const { error: updateError } = await admin.auth.admin.updateUserById(caller.id, { app_metadata: appMetadata });
      if (updateError) return reply(500, { error: "Could not activate the secure session." });
      return reply(200, { ok: true, deviceStatus: device.status, deviceId: device.id });
    }

    if (action === "access-check") {
      const jwtSessionId = supabaseSessionId(accessToken);
      if (!jwtSessionId || jwtSessionId !== String(caller.app_metadata?.active_supabase_session_id || "")) {
        return reply(401, { error: "This secure login session is no longer active." });
      }
      const deviceId = String(caller.app_metadata?.active_device_access_id || "");
      const sessionId = String(body.sessionId || "");
      const localDeviceId = String(body.deviceId || "");
      if (!deviceId || !sessionId || !localDeviceId) return reply(403, { error: "This session is not registered to an approved device." });
      if (String(caller.app_metadata?.active_session_id || "") !== sessionId) return reply(401, { error: "This account was signed in on another device. Please sign in again." });
      const hash = await deviceHash(serviceKey, localDeviceId);
      const { data: device, error: deviceError } = await admin.from("device_access_controls")
        .select("id,status").eq("id", deviceId).eq("device_key_hash", hash).maybeSingle();
      if (deviceError) return reply(500, { error: "Could not verify device access." });
      if (!device) return reply(403, { error: "This device is not registered." });
      if (device.status === "blocked") return reply(403, { error: "This device has been blocked by an administrator." });
      if (device.status !== "approved") return reply(200, { ok: false, deviceStatus: "pending", message: "This device is waiting for administrator approval." });
      const { data: accountControl, error: accountError } = await admin.from("account_access_controls")
        .select("status,reason").eq("user_id", caller.id).maybeSingle();
      if (accountError) return reply(500, { error: "Could not verify account access." });
      if (accountControl?.status === "blocked") return reply(403, { error: accountControl.reason || "This account has been blocked by an administrator." });
      return reply(200, { ok: true });
    }

    const adminJwtSessionId = supabaseSessionId(accessToken);
    if (!adminJwtSessionId || adminJwtSessionId !== String(caller.app_metadata?.active_supabase_session_id || "")) {
      return reply(401, { error: "This secure administrator session is no longer active." });
    }
    const { data: adminMembership, error: adminMembershipError } = await admin
      .from("organization_members").select("organization_id")
      .eq("user_id", caller.id).eq("role", "admin").limit(1).maybeSingle();
    if (adminMembershipError || !adminMembership?.organization_id) return reply(403, { error: "Only an organization administrator can manage access controls." });
    const organizationId = adminMembership.organization_id;
    // Because account/device blocks are global, the operator must administer every organization
    // affected by the target. A single-organization admin must not affect another tenant.
    const { data: callerAdminMemberships, error: callerAdminMembershipsError } = await admin
      .from("organization_members").select("organization_id")
      .eq("user_id", caller.id).eq("role", "admin");
    if (callerAdminMembershipsError) return reply(500, { error: "Could not verify administrator scope." });
    const callerAdminOrganizationIds = new Set((callerAdminMemberships || []).map((m: { organization_id: string }) => m.organization_id));

    const { data: callerControl, error: callerControlError } = await admin.from("account_access_controls")
      .select("status,reason").eq("user_id", caller.id).maybeSingle();
    if (callerControlError) return reply(500, { error: "Could not verify administrator account status." });
    if (callerControl?.status === "blocked") return reply(403, { error: callerControl.reason || "This account has been blocked by an administrator." });
    const callerDeviceId = String(caller.app_metadata?.active_device_access_id || "");
    const adminSessionId = String(body.sessionId || "");
    const adminLocalDeviceId = String(body.deviceId || "");
    if (!callerDeviceId || !adminSessionId || String(caller.app_metadata?.active_session_id || "") !== adminSessionId ||
        !/^[0-9a-f-]{36}$/i.test(adminLocalDeviceId)) {
      return reply(401, { error: "This administrator session is no longer active." });
    }
    const adminDeviceHash = await deviceHash(serviceKey, adminLocalDeviceId);
    const { data: callerDevice, error: callerDeviceError } = await admin.from("device_access_controls")
      .select("status").eq("id", callerDeviceId).eq("device_key_hash", adminDeviceHash).maybeSingle();
    if (callerDeviceError) return reply(500, { error: "Could not verify administrator device status." });
    if (!callerDevice) return reply(403, { error: "This device is not registered." });
    if (callerDevice.status !== "approved") {
      return reply(403, { error: callerDevice.status === "blocked"
        ? "This device has been blocked by an administrator."
        : "Only an approved device can manage access controls." });
    }

    if (action === "admin-access-list") {
      const { data: members, error: membersError } = await admin.from("organization_members")
        .select("user_id,role").eq("organization_id", organizationId);
      if (membersError) return reply(500, { error: "Could not load organization members." });
      const memberIds = (members || []).map((m: { user_id: string }) => m.user_id);
      const { data: profiles } = memberIds.length
        ? await admin.from("profiles").select("id,full_name,phone").in("id", memberIds)
        : { data: [] as { id: string; full_name: string; phone: string }[] };
      const { data: accounts, error: accountsError } = memberIds.length
        ? await admin.from("account_access_controls").select("user_id,status,reason,updated_at,blocked_at").in("user_id", memberIds)
        : { data: [] as Record<string, unknown>[], error: null };
      if (accountsError) return reply(500, { error: "Could not load account access status." });
      const { data: links, error: linksError } = await admin.from("device_access_memberships")
        .select("device_id,user_id,first_seen_at,last_seen_at").eq("organization_id", organizationId)
        .order("last_seen_at", { ascending: false }).limit(500);
      if (linksError) return reply(500, { error: "Could not load registered devices." });
      const deviceIds = [...new Set((links || []).map((x: { device_id: string }) => x.device_id))];
      const { data: devices, error: devicesError } = deviceIds.length
        ? await admin.from("device_access_controls").select("id,status,device_label,reason,first_seen_at,last_seen_at,blocked_at").in("id", deviceIds)
        : { data: [] as Record<string, unknown>[], error: null };
      if (devicesError) return reply(500, { error: "Could not load device status." });
      const profileMap = new Map<string, any>((profiles || []).map((p: any) => [p.id, p] as [string, any]));
      const accountMap = new Map<string, any>((accounts || []).map((a: any) => [a.user_id, a] as [string, any]));
      const deviceMap = new Map<string, any>((devices || []).map((d: any) => [d.id, d] as [string, any]));
      return reply(200, {
        accounts: (members || []).map((m: any) => ({ ...profileMap.get(m.user_id), role: m.role, status: accountMap.get(m.user_id)?.status || "active", reason: accountMap.get(m.user_id)?.reason || "", blocked_at: accountMap.get(m.user_id)?.blocked_at || null })),
        devices: (links || []).map((link: any) => ({ ...deviceMap.get(link.device_id), user_id: link.user_id, user_name: profileMap.get(link.user_id)?.full_name || "Fleet user", first_seen_at: link.first_seen_at, last_seen_at: link.last_seen_at })),
      });
    }

    const kind = String(body.kind || "");
    const targetId = String(body.targetId || "");
    const operation = String(body.operation || "");
    const reason = String(body.reason || "").trim().slice(0, 500);
    if (!["account", "device"].includes(kind) || !targetId || !["block", "unblock", "approve"].includes(operation)) {
      return reply(400, { error: "Choose a valid account/device access action." });
    }
    if (kind === "account") {
      if (operation === "approve") return reply(400, { error: "Account access can only be blocked or unblocked." });
      const { data: targetMemberships, error: memberError } = await admin.from("organization_members")
        .select("organization_id").eq("user_id", targetId);
      if (memberError) return reply(500, { error: "Could not verify the target account's organization scope." });
      const targetOrganizationIds = [...new Set((targetMemberships || []).map((m: { organization_id: string }) => m.organization_id))];
      if (!targetOrganizationIds.includes(organizationId)) return reply(403, { error: "This account is outside your organization." });
      if (targetOrganizationIds.some((id) => !callerAdminOrganizationIds.has(id))) {
        return reply(403, { error: "This account belongs to another organization you do not administer. A global account block requires authorization across every organization linked to the account." });
      }
      if (targetId === caller.id && operation === "block") return reply(400, { error: "You cannot block your own administrator account." });
      const status = operation === "block" ? "blocked" : "active";
      const { error } = await admin.from("account_access_controls").upsert({
        user_id: targetId, status, reason: status === "blocked" ? (reason || "Blocked by organization administrator.") : null,
        updated_by: caller.id, updated_at: new Date().toISOString(), blocked_at: status === "blocked" ? new Date().toISOString() : null,
      }, { onConflict: "user_id" });
      if (error) return reply(500, { error: "Could not update account access." });
      return reply(200, { ok: true, message: status === "blocked" ? "Account blocked on all devices." : "Account access restored." });
    }

    if (operation === "block" && targetId === callerDeviceId) return reply(400, { error: "Use another approved administrator device to block this device." });
    const { data: deviceLinks, error: deviceLinkError } = await admin.from("device_access_memberships")
      .select("organization_id").eq("device_id", targetId);
    if (deviceLinkError) return reply(500, { error: "Could not verify the target device's organization scope." });
    const deviceOrganizationIds = [...new Set((deviceLinks || []).map((link: { organization_id: string }) => link.organization_id))];
    if (!deviceOrganizationIds.includes(organizationId)) return reply(403, { error: "This device is outside your organization." });
    if (deviceOrganizationIds.some((id) => !callerAdminOrganizationIds.has(id))) {
      return reply(403, { error: "This device is linked to another organization you do not administer. A global device action requires authorization across every linked organization." });
    }
    const status = operation === "block" ? "blocked" : "approved";
    const { error } = await admin.from("device_access_controls").update({
      status, reason: status === "blocked" ? (reason || "Blocked by organization administrator.") : null,
      blocked_by: status === "blocked" ? caller.id : null, approved_by: status === "approved" ? caller.id : null,
      updated_at: new Date().toISOString(), blocked_at: status === "blocked" ? new Date().toISOString() : null,
    }).eq("id", targetId);
    if (error) return reply(500, { error: "Could not update device access." });
    return reply(200, { ok: true, message: status === "blocked" ? "Device blocked for every account." : "Device approved." });
  }

  let phone = "";
  try { phone = normalizePhone(body.phone); } catch { return reply(400, { error: "Enter a valid phone number with country code, or an Ethiopian 09/9 number." }); }


  if (action === "prepare-login" || action === "signup") {
    const deviceId = String(body.deviceId || "");
    if (!/^[0-9a-f-]{36}$/i.test(deviceId)) return reply(400, { error: "This app could not identify the device. Please update the app and try again." });
    const hash = await deviceHash(serviceKey, deviceId);
    const { data: knownDevice, error: knownDeviceError } = await admin.from("device_access_controls")
      .select("status").eq("device_key_hash", hash).maybeSingle();
    if (knownDeviceError) return reply(500, { error: "Could not verify device access." });
    if (knownDevice?.status === "blocked") return reply(403, { error: "This device has been blocked by an administrator." });
    if (action === "prepare-login") {
      const { data: profile } = await admin.from("profiles").select("id").eq("phone", phone).maybeSingle();
      if (profile?.id) {
        const { data: accountControl, error: accountControlError } = await admin.from("account_access_controls")
          .select("status,reason").eq("user_id", profile.id).maybeSingle();
        if (accountControlError) return reply(500, { error: "Could not verify account access." });
        if (accountControl?.status === "blocked") return reply(403, { error: accountControl.reason || "This account has been blocked by an administrator." });
      }
    }
  }

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
    // This table is exclusively for password-recovery throttling. Sign-in and signup
    // attempts must never consume the recovery rate-limit budget.
    if (action !== "recover") return;
    await admin.from("account_recovery_attempts").insert({ phone, ip_address: ipAddress, succeeded });
    await admin.from("account_recovery_attempts").delete().lt("attempted_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  }

  // Keep recovery verification rate-limited, but do not lock users out of normal sign-in on another device.
  if (action === "recover" && await limited()) return reply(429, { error: "Too many recovery attempts. Please wait 15 minutes and try again." });

  // Prepare legacy phone-only accounts for password sign-in without enabling SMS/OTP.
  if (action === "prepare-login") {
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (profileError || !profile?.id) {
      await record(false);
      return reply(200, { ok: true });
    }
    const { data: authData, error: authError } = await admin.auth.admin.getUserById(profile.id);
    const authUser = authData?.user;
    if (authError || !authUser) {
      await record(false);
      return reply(200, { ok: true });
    }
    const loginEmail = loginEmailForPhone(phone);
    // Never overwrite a real email address; migrate only legacy phone-only users.
    if (authUser.email && authUser.email !== loginEmail) {
      await record(false);
      return reply(200, { ok: true });
    }
    if (!authUser.email) {
      const { error: updateError } = await admin.auth.admin.updateUserById(authUser.id, {
        email: loginEmail,
        email_confirm: true,
      });
      if (updateError) {
        await record(false);
        return reply(200, { ok: true });
      }
    }
    await record(true);
    return reply(200, { ok: true });
  }

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
      email: loginEmailForPhone(phone),
      email_confirm: true,
      phone,
      password,
      phone_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
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

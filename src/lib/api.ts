import { supabase } from './supabase';

type ApiResponse<T = any> = { data: T };
type ApiError = Error & { response?: { status: number; data: { message: string } } };

const result = <T,>(data: T): ApiResponse<T> => ({ data });

function fail(message: string, status = 400): never {
  const error = new Error(message) as ApiError;
  error.response = { status, data: { message } };
  throw error;
}

function throwSupabaseError(error: { message?: string; status?: number } | null): void {
  if (error) fail(error.message || 'The request could not be completed.', error.status || 400);
}



function currentDeviceId(): string {
  const key = "omni_ffm_device_id";
  let id = localStorage.getItem(key) || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  throwSupabaseError(error);
  if (!data.user) fail('Please sign in to continue.', 401);
  const activeSessionId = String(data.user.app_metadata?.active_session_id || '');
  const localSessionId = localStorage.getItem('omni_ffm_active_session_id') || '';
  if (activeSessionId && activeSessionId !== localSessionId) {
    localStorage.removeItem('omni_ffm_active_session_id');
    await supabase.auth.signOut();
    fail('This account was signed in on another device. Please sign in again.', 401);
  }
  const access = await invokeAccountAuth({
    action: 'access-check',
    sessionId: localSessionId,
    deviceId: currentDeviceId(),
  });
  if (access?.ok !== true) {
    fail(access?.message || 'This device is waiting for administrator approval.', 403);
  }
  return data.user;
}

async function currentOrganizationId(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  throwSupabaseError(error);
  if (!data?.organization_id) fail('No fleet workspace is linked to this account. Please contact support.', 403);
  return data.organization_id as string;
}

function userPayload(user: any) {
  const email = String(user.email || '');
  const isInternalLoginEmail = email.endsWith('@users.omni-fleet-fuel.invalid');
  return {
    id: user.id,
    email: isInternalLoginEmail ? '' : email,
    phone: user.phone || user.user_metadata?.phone || '',
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.phone || email || 'Fleet Manager',
  };
}

function normalizePhone(value: unknown): string {
  let phone = String(value ?? '').replace(/[\s()-]/g, '');
  if (phone.startsWith('09') && phone.length === 10) phone = '+251' + phone.slice(1);
  else if (phone.startsWith('9') && phone.length === 9) phone = '+251' + phone;
  else if (phone.startsWith('251')) phone = '+' + phone;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) fail('Enter a valid phone number with country code, or an Ethiopian 09/9 number.');
  return phone;
}

function loginEmailForPhone(phone: string): string {
  return `${phone.replace(/\D/g, '')}@users.omni-fleet-fuel.invalid`;
}


async function invokeAccountAuth(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('account-auth', { body });
  if (error) {
    const context = (error as any).context;
    if (context && typeof context.clone === 'function') {
      try {
        const payload = await context.clone().json();
        fail(payload?.error || error.message || 'Account request failed.', context.status || 400);
      } catch (parseError) {
        if ((parseError as any)?.response) throw parseError;
      }
    }
    fail(error.message || 'Account request failed.', 400);
  }
  if (data?.error) fail(String(data.error), 400);
  return data;
}

async function invokePlatformAdmin(body: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('platform-admin', { body });
  if (error) {
    const context = (error as any).context;
    if (context && typeof context.clone === 'function') {
      try {
        const payload = await context.clone().json();
        fail(payload?.error || error.message || 'Platform Owner request failed.', context.status || 400);
      } catch (parseError) {
        if ((parseError as any)?.response) throw parseError;
      }
    }
    fail(error.message || 'Platform Owner request failed.', 400);
  }
  if (data?.error) fail(String(data.error), 400);
  return data;
}

const emptyState = {
  vehicles: [] as unknown[],
  fuel: [] as unknown[],
  offDays: [] as unknown[],
  users: [] as unknown[],
  settings: {},
};

export const api = {
  async get(path: string): Promise<ApiResponse<any>> {
    if (path === '/api/platform-admin/check') {
      const response = await invokePlatformAdmin({ action: 'status' });
      return result({ isPlatformOwner: response?.allowed === true });
    }

    if (path === '/api/platform-admin/users') {
      const response = await invokePlatformAdmin({ action: 'list-users', page: 1, perPage: 100 });
      return result({ users: response?.users || [], page: response?.page || 1, total: response?.total ?? null });
    }

    if (path === '/api/auth/me') {
      const user = await currentUser();
      const { data: profile } = await supabase.from('profiles').select('full_name,phone').eq('id', user.id).maybeSingle();
      return result({ user: { ...userPayload(user), phone: profile?.phone || user.phone || '', name: profile?.full_name || userPayload(user).name } });
    }

    if (path === '/api/admin/recovery-requests') {
      const response = await invokeAccountAuth({
        action: 'admin-recovery-list',
        sessionId: localStorage.getItem('omni_ffm_active_session_id') || '',
        deviceId: currentDeviceId(),
      });
      return result({ requests: response?.requests || [] });
    }

    if (path === '/api/admin/access-controls') {
      const response = await invokeAccountAuth({
        action: 'admin-access-list',
        sessionId: localStorage.getItem('omni_ffm_active_session_id') || '',
        deviceId: currentDeviceId(),
      });
      return result({ accounts: response?.accounts || [], devices: response?.devices || [] });
    }

    if (path === '/api/fleet-data') {
      const user = await currentUser();
      const organizationId = await currentOrganizationId(user.id);
      const { data, error } = await supabase
        .from('organization_app_state')
        .select('data')
        .eq('organization_id', organizationId)
        .maybeSingle();
      throwSupabaseError(error);
      return result({ data: data?.data || emptyState });
    }

    fail('This endpoint is not supported.', 404);
  },

  async post(path: string, body: any = {}): Promise<ApiResponse<any>> {
    if (path === '/api/platform-admin') {
      const response = await invokePlatformAdmin(body);
      return result(response || { ok: true });
    }

    if (path === '/api/admin/recovery-requests/resolve') {
      const response = await invokeAccountAuth({
        action: 'admin-recovery-resolve',
        sessionId: localStorage.getItem('omni_ffm_active_session_id') || '',
        deviceId: currentDeviceId(),
        requestId: String(body.requestId || ''),
        newPassword: String(body.newPassword || ''),
      });
      return result({ ok: true, message: response?.message || 'Password reset completed.' });
    }

    if (path === '/api/admin/access-controls') {
      const response = await invokeAccountAuth({
        action: 'admin-access-set',
        sessionId: localStorage.getItem('omni_ffm_active_session_id') || '',
        deviceId: currentDeviceId(),
        kind: String(body.kind || ''),
        targetId: String(body.targetId || ''),
        operation: String(body.operation || ''),
        reason: String(body.reason || ''),
      });
      return result({ ok: true, message: response?.message || 'Access status updated.' });
    }

    if (path === '/api/auth/logout') {
      try {
        await invokeAccountAuth({
          action: 'deactivate-session',
          sessionId: localStorage.getItem('omni_ffm_active_session_id') || '',
          deviceId: currentDeviceId(),
        });
      } catch {
        // Continue local sign-out even if the server cannot be reached.
      }
      const { error } = await supabase.auth.signOut();
      throwSupabaseError(error);
      localStorage.removeItem('omni_ffm_active_session_id');
      return result({ ok: true });
    }

    if (path === '/api/auth/signup') {
      await invokeAccountAuth({
        action: 'signup',
        deviceId: currentDeviceId(),
        phone: body.phone,
        password: String(body.password || ''),
        fullName: String(body.name || '').trim(),
        motherName: String(body.motherName || '').trim(),
        fatherName: String(body.fatherName || '').trim(),
        birthDate: String(body.birthDate || ''),
        language: body.language === 'am' ? 'am' : 'en',
      });
      const phone = normalizePhone(body.phone);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmailForPhone(phone),
        password: String(body.password || ''),
      });
      throwSupabaseError(error);
      if (!data.user) fail('The account was created, but sign-in could not be completed. Please sign in manually.', 401);
      const sessionId = crypto.randomUUID();
      const activation = await invokeAccountAuth({ action: 'activate-session', sessionId, deviceId: currentDeviceId(), deviceLabel: 'OMNI Fleet Fuel app' });
      if (activation?.deviceStatus !== 'approved') {
        await supabase.auth.signOut();
        localStorage.removeItem('omni_ffm_active_session_id');
        fail('This device is waiting for administrator approval. An existing approved administrator or platform support must approve it before you can continue.', 403);
      }
      localStorage.setItem('omni_ffm_active_session_id', sessionId);
      const refreshedSession = await supabase.auth.refreshSession();
      throwSupabaseError(refreshedSession.error);
      return result({ user: userPayload(refreshedSession.data.user || data.user) });
    }

    if (path === '/api/auth/login') {
      const phone = normalizePhone(body.phone);
      await invokeAccountAuth({ action: 'prepare-login', phone, deviceId: currentDeviceId() });
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmailForPhone(phone),
        password: String(body.password || ''),
      });
      if (error) {
        try { await invokeAccountAuth({ action: 'login-failed', phone }); } catch {}
        throwSupabaseError(error);
      }
      if (!data.user) fail('Sign-in was not accepted. Check the phone number and password.', 401);
      const sessionId = crypto.randomUUID();
      const activation = await invokeAccountAuth({ action: 'activate-session', sessionId, deviceId: currentDeviceId(), deviceLabel: 'OMNI Fleet Fuel app' });
      if (activation?.deviceStatus !== 'approved') {
        await supabase.auth.signOut();
        localStorage.removeItem('omni_ffm_active_session_id');
        fail('This device is waiting for administrator approval. An existing approved administrator or platform support must approve it before you can continue.', 403);
      }
      localStorage.setItem('omni_ffm_active_session_id', sessionId);
      return result({ user: userPayload(data.user) });
    }

    if (path === '/api/auth/recover-password') {
      const response = await invokeAccountAuth({
        action: 'recover',
        phone: body.phone,
        motherName: String(body.motherName || '').trim(),
        birthDate: String(body.birthDate || ''),
      });
      return result({ ok: true, message: response?.message || 'Your reset request has been recorded. Contact the administrator to complete the reset.' });
    }

    if (path === '/api/auth/request-reset') {
      const email = String(body.email || body.contact || '').trim().toLowerCase();
      if (!email) fail('Email is required.');
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      throwSupabaseError(error);
      return result({ ok: true });
    }

    if (path === '/api/auth/reset-password') {
      const { error } = await supabase.auth.updateUser({ password: String(body.password || '') });
      throwSupabaseError(error);
      return result({ ok: true });
    }

    fail('This endpoint is not supported.', 404);
  },

  async put(path: string, body: any = {}): Promise<ApiResponse<any>> {
    if (path === '/api/fleet-data') {
      const user = await currentUser();
      const organizationId = await currentOrganizationId(user.id);
      const { error } = await supabase.from('organization_app_state').upsert({
        organization_id: organizationId,
        data: body.data || emptyState,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id' });
      throwSupabaseError(error);
      return result({ ok: true });
    }
    fail('This endpoint is not supported.', 404);
  },
};

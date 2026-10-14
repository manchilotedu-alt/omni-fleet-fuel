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


async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  throwSupabaseError(error);
  if (!data.user) fail('Please sign in to continue.', 401);
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
  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.phone || user.email || 'Fleet Manager',
  };
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
    if (path === '/api/auth/me') {
      const user = await currentUser();
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      return result({ user: { ...userPayload(user), name: profile?.full_name || userPayload(user).name } });
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
    if (path === '/api/auth/logout') {
      const { error } = await supabase.auth.signOut();
      throwSupabaseError(error);
      return result({ ok: true });
    }

    if (path === '/api/auth/signup') {
      const email = String(body.email || '').trim().toLowerCase();
      if (!email) fail('Email is required.');
      const { data, error } = await supabase.auth.signUp({
        email,
        password: String(body.password || ''),
        options: {
          data: {
            full_name: String(body.name || '').trim(),
            preferred_language: localStorage.getItem('omni_ffm_lang') === 'am' ? 'am' : 'en',
          },
        },
      });
      throwSupabaseError(error);
      if (!data.user) fail('The account could not be created.', 500);
      return result({ user: userPayload(data.user), requiresEmailConfirmation: !data.session });
    }

    if (path === '/api/auth/login') {
      const email = String(body.email || '').trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: String(body.password || ''),
      });
      throwSupabaseError(error);
      if (!data.user) fail('Sign-in was not accepted. Check the email and password.', 401);
      return result({ user: userPayload(data.user) });
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

import { router, json, error, db, secrets } from '@appdeploy/sdk';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import {
  realtimeSubscriptionRoutes,
} from './realtime-subscribers';

type UserRecord = {
  email: string;
  phone?: string;
  birthDate?: string;
  motherName?: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
};

type SessionRecord = {
  userId: string;
  tokenHash: string;
  expiresAt: string;
};

const SESSION_DAYS = 7;

function normalizeName(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function displayName(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + derived;
}

function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, 'hex');
  return expectedBuffer.length === actual.length && timingSafeEqual(actual, expectedBuffer);
}

function hashToken(token: string) {
  return scryptSync(token, 'omni-fleet-session', 32).toString('hex');
}
function normalizeEmail(value: unknown) { return String(value ?? '').trim().toLowerCase(); }
function normalizePhone(value: unknown) { const raw = String(value ?? '').replace(/[^+\d]/g, '').trim(); if (raw.startsWith('09') && raw.length === 10) return '+251' + raw.slice(1); if (raw.startsWith('9') && raw.length === 9) return '+251' + raw; if (raw.startsWith('2519') && raw.length === 12) return '+' + raw; return raw; }
function normalizeMother(value: unknown) { return displayName(value).toLowerCase(); }
function isEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function isPhone(value: string) { return /^\+2519\d{8}$/.test(value); }
function hashOtp(code: string) { return createHash('sha256').update(code).digest('hex'); }
function makeOtp() { return String(Math.floor(100000 + Math.random() * 900000)); }

function makeToken() {
  return randomBytes(32).toString('hex');
}

function getCookie(event: any, name: string) {
  const headerBag = event?.headers || event?.request?.headers;
  const raw = (typeof headerBag?.get === 'function' ? headerBag.get('cookie') : '') || event?.headers?.cookie || event?.headers?.Cookie || event?.request?.headers?.cookie || event?.cookies?.[name] || '';
  const match = String(raw).split(';').map((part: string) => part.trim()).find((part: string) => part.startsWith(name + '='));
  if (!match) return '';
  try { return decodeURIComponent(match.slice(name.length + 1)); } catch { return match.slice(name.length + 1); }
}

function sessionCookie(token: string, maxAge = SESSION_DAYS * 86400) {
  return 'omni_fleet_session=' + encodeURIComponent(token) + '; HttpOnly; Path=/; SameSite=Lax; Secure; Max-Age=' + maxAge;
}

async function findUserByName(name: string) {
  const { items } = await db.list<UserRecord>('auth_users', { limit: 1000 });
  const key = normalizeName(name);
  return items.find(item => normalizeName(item.name) === key) ?? null;
}

async function createSession(userId: string) {
  const { items } = await db.list<SessionRecord>('auth_sessions', { limit: 100 });
  const existing = items.filter(item => item.userId === userId);
  if (existing.length) await db.delete('auth_sessions', existing.map(item => item.id));

  const token = makeToken();
  await db.add('auth_sessions', [{
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000).toISOString(),
  }]);
  return token;
}

async function getSessionUser(event: any) {
  const token = getCookie(event, 'omni_fleet_session');
  if (!token) return null;
  const tokenHash = hashToken(token);
  const { items } = await db.list<SessionRecord>('auth_sessions', { limit: 100 });
  const session = items.find(item => item.tokenHash === tokenHash);
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) return null;
  const [user] = await db.get<UserRecord>('auth_users', [session.userId]);
  if (!user) return null;
  return { id: session.userId, email: user.email, name: user.name };
}

async function findUserByContact(contact: string) {
  const { items } = await db.list<UserRecord>('auth_users', { limit: 1000 });
  const email = normalizeEmail(contact);
  const phone = normalizePhone(contact);
  return items.find(item => normalizeEmail(item.email) === email || (phone && normalizePhone(item.phone) === phone)) ?? null;
}
async function sendOtp(channel: 'email' | 'phone', target: string, code: string, purpose: 'signup' | 'reset') {
  const names = await secrets.listSecretNames();
  if (channel === 'email') {
    if (!names.includes('RESEND_API_KEY') || !names.includes('RESEND_FROM_EMAIL')) return false;
    const apiKey = await secrets.readSecret('RESEND_API_KEY');
    const from = await secrets.readSecret('RESEND_FROM_EMAIL');
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [target], subject: purpose === 'signup' ? 'omni-Fleet verification code' : 'omni-Fleet password reset code', text: 'Your omni-Fleet verification code is ' + code + '. It expires in 10 minutes.' }) });
    return response.ok;
  }
  if (!names.includes('TWILIO_ACCOUNT_SID') || !names.includes('TWILIO_AUTH_TOKEN') || !names.includes('TWILIO_FROM_NUMBER')) return false;
  const sid = await secrets.readSecret('TWILIO_ACCOUNT_SID');
  const auth = await secrets.readSecret('TWILIO_AUTH_TOKEN');
  const from = await secrets.readSecret('TWILIO_FROM_NUMBER');
  const body = new URLSearchParams({ To: target, From: from, Body: 'omni-Fleet verification code: ' + code + '. Expires in 10 minutes.' });
  const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + sid + '/Messages.json', { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(sid + ':' + auth).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  return response.ok;
}
async function createOtp(userId: string | undefined, channel: 'email' | 'phone', target: string, purpose: 'signup' | 'reset') {
  const code = makeOtp();
  const { items } = await db.list<any>('auth_otps', { limit: 1000 });
  const old = items.filter((item: any) => item.target === target && item.purpose === purpose);
  if (old.length) await db.delete('auth_otps', old.map((item: any) => item.id));
  const [id] = await db.add('auth_otps', [{ userId, target, channel, purpose, codeHash: hashOtp(code), expiresAt: new Date(Date.now() + 10 * 60000).toISOString(), attempts: 0, createdAt: new Date().toISOString() }]);
  const delivered = await sendOtp(channel, target, code, purpose);
  if (!delivered && id) await db.delete('auth_otps', [id]);
  return delivered;
}
async function verifyOtp(target: string, purpose: 'signup' | 'reset', code: string) {
  const { items } = await db.list<any>('auth_otps', { limit: 1000 });
  const record = items.find((item: any) => item.target === target && item.purpose === purpose);
  if (!record) return { ok: false, message: 'Verification code not found or expired.' };
  if (new Date(record.expiresAt).getTime() <= Date.now()) { await db.delete('auth_otps', [record.id]); return { ok: false, message: 'Verification code has expired.' }; }
  if (record.attempts >= 5) { await db.delete('auth_otps', [record.id]); return { ok: false, message: 'Too many attempts. Request a new code.' }; }
  if (hashOtp(code) !== record.codeHash) { await db.update('auth_otps', [{ id: record.id, record: { ...record, attempts: record.attempts + 1 } }]); return { ok: false, message: 'Incorrect verification code.' }; }
  await db.delete('auth_otps', [record.id]);
  return { ok: true, userId: record.userId };
}
function maskEmail(value: string) { const parts = value.split('@'); return parts.length === 2 ? parts[0].slice(0, 2) + '***@' + parts[1] : '***'; }
function maskPhone(value: string) { return value.length > 5 ? value.slice(0, 3) + '******' + value.slice(-2) : '****'; }

const authRoutes = {
  'POST /api/auth/signup': [async ({ body }: { body: unknown }) => {
    try {
      const input = body as { name?: string; phone?: string; birthDate?: string; motherName?: string; password?: string };
      const name = displayName(input.name); const phone = normalizePhone(input.phone); const birthDate = String(input.birthDate ?? '').trim(); const motherName = displayName(input.motherName); const password = String(input.password ?? '');
      if (!name || name.length > 20) return error('Full name must be 1 to 20 characters.', 400);
      if (!phone || !isPhone(phone)) return error('Please enter a valid Ethiopian phone number.', 400);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return error('Birth date is required.', 400);
      if (!motherName) return error("Mother's full name is required.", 400);
      if (phone && !isPhone(phone)) return error('Please enter a phone number in international format.', 400);
      if (password.length < 8) return error('Password must be at least 8 characters.', 400);
      const { items: registeredUsers } = await db.list<UserRecord>('auth_users', { limit: 1000 });
      const duplicatePhone = registeredUsers.some(item => Boolean(item.phone) && normalizePhone(item.phone) === phone);
      if (duplicatePhone) { console.warn('Signup duplicate phone check matched', maskPhone(phone)); return error('ይህ ስልክ ቁጥር ከዚህ በፊት ተመዝግቧል።', 409); }
      const [userId] = await db.add('auth_users', [{ email: '', phone, birthDate, motherName, name, passwordHash: hashPassword(password), createdAt: new Date().toISOString(), emailVerified: false, phoneVerified: false }]);
      if (!userId) return error('The account could not be created.', 500);
      const token = await createSession(userId); return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie(token) }, body: JSON.stringify({ user: { id: userId, email: '', phone, name } }) };
    } catch { return error('The account could not be created right now.', 500); }
  }],

  'POST /api/auth/verify-signup': [async ({ body }: { body: unknown }) => {
    try {
      const input = body as { contact?: string; code?: string }; const contact = String(input.contact ?? '').trim(); const code = String(input.code ?? '').trim();
      if (!contact || !/^\d{6}$/.test(code)) return error('A valid 6-digit verification code is required.', 400);
      const result = await verifyOtp(contact, 'signup', code); if (!result.ok || !result.userId) return error(result.message || 'Verification failed.', 400);
      const [user] = await db.get<UserRecord>('auth_users', [result.userId]); if (!user) return error('Account not found.', 404);
      await db.update('auth_users', [{ id: result.userId, record: { ...user, emailVerified: user.email === contact ? true : Boolean(user.emailVerified), phoneVerified: user.phone === contact ? true : Boolean(user.phoneVerified) } }]);
      const token = await createSession(result.userId);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie(token) }, body: JSON.stringify({ user: { id: result.userId, email: user.email, phone: user.phone || '', name: user.name } }) };
    } catch { return error('Verification is temporarily unavailable.', 500); }
  }],

  'POST /api/auth/login': [async ({ body }: { body: unknown }) => {
    try {
      const input = body as { phone?: string; password?: string };
      const phone = normalizePhone(input.phone);
      const password = String(input.password ?? '');

      if (!phone || !password) return error('Phone number and password are required.', 400);
      if (!isPhone(phone)) return error('Please enter a valid Ethiopian phone number.', 400);

      const user = await findUserByContact(phone);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return error('Incorrect phone number or password.', 401);
      }

      const token = await createSession(user.id);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie(token) },
        body: JSON.stringify({ user: { id: user.id, email: user.email, name: user.name } }),
      };
    } catch {
      return error('Login service is temporarily unavailable. Please try again.', 500);
    }
  }],

  'GET /api/auth/me': [async ({ event }: { event: any }) => {
    const user = await getSessionUser(event);
    if (!user) return error('Not signed in.', 401);
    return json({ user });
  }],

  'POST /api/auth/request-reset': [async ({ body }: { body: unknown }) => {
    try {
      const input = body as { phone?: string; motherName?: string; birthDate?: string }; const phone = normalizePhone(input.phone); const motherName = normalizeMother(input.motherName); const birthDate = String(input.birthDate ?? '').trim(); if (!phone || !motherName || !birthDate) return error('Phone, mother name and birth date are required.', 400);
      const { items } = await db.list<UserRecord>('auth_users', { limit: 1000 }); const userByPhone = items.find(item => normalizePhone(item.phone) === phone); if (!userByPhone) return json({ ok: false, message: 'The phone number does not match our records.' }); if (normalizeMother(userByPhone.motherName) !== motherName) return json({ ok: false, message: "The mother's full name does not match our records." }); if (String(userByPhone.birthDate ?? '') !== birthDate) return json({ ok: false, message: 'The birth date does not match our records.' }); const recoveryToken = makeToken(); await db.add('auth_recovery', [{ userId: userByPhone.id, tokenHash: hashToken(recoveryToken), expiresAt: new Date(Date.now() + 10 * 60000).toISOString() }]); return json({ ok: true, recoveryToken });
    } catch { return error('Password recovery is temporarily unavailable.', 500); }
  }],

  'POST /api/auth/verify-reset': [async ({ body }: { body: unknown }) => {
    const input = body as { contact?: string; code?: string }; const contact = String(input.contact ?? '').trim(); const code = String(input.code ?? '').trim();
    if (!contact || !/^\d{6}$/.test(code)) return error('A valid 6-digit verification code is required.', 400);
    const result = await verifyOtp(contact, 'reset', code); if (!result.ok || !result.userId) return error(result.message || 'Verification failed.', 400);
    return json({ ok: true, userId: result.userId });
  }],

  'POST /api/auth/reset-password': [async ({ body }: { body: unknown }) => {
    try {
      const input = body as { recoveryToken?: string; password?: string }; const recoveryToken = String(input.recoveryToken ?? ''); const password = String(input.password ?? '');
      if (!recoveryToken) return error('Recovery verification is required.', 400); if (password.length < 8) return error('Password must be at least 8 characters.', 400);
      const { items: recovery } = await db.list<any>('auth_recovery', { limit: 1000 }); const record = recovery.find((item: any) => item.tokenHash === hashToken(recoveryToken) && new Date(item.expiresAt).getTime() > Date.now()); if (!record) return error('Recovery verification has expired. Please try again.', 401); const [user] = await db.get<UserRecord>('auth_users', [record.userId]); if (!user) return error('Account not found.', 404);
      const ok = await db.update('auth_users', [{ id: record.userId, record: { ...user, passwordHash: hashPassword(password) } }]); if (!ok[0]) return error('Password could not be reset.', 500); await db.delete('auth_recovery', [record.id]);
      const { items } = await db.list<SessionRecord>('auth_sessions', { limit: 1000 }); const sessions = items.filter(item => item.userId === record.userId); if (sessions.length) await db.delete('auth_sessions', sessions.map(item => item.id));
      return json({ ok: true });
    } catch { return error('Password reset is temporarily unavailable.', 500); }
  }],

  'POST /api/auth/logout': [async ({ event }: { event: any }) => {
    const token = getCookie(event, 'omni_fleet_session');
    if (token) {
      const tokenHash = hashToken(token);
      const { items } = await db.list<SessionRecord>('auth_sessions', { limit: 100 });
      const session = items.find(item => item.tokenHash === tokenHash);
      if (session) await db.delete('auth_sessions', [session.id]);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie('', 0) },
      body: JSON.stringify({ ok: true }),
    };
  }],
};

const fleetDataCategories = ['vehicles', 'fuel', 'offDays', 'users', 'settings'] as const;
type FleetDataCategory = typeof fleetDataCategories[number];
type FleetDataRecord = { category: FleetDataCategory; data: unknown };

const fleetDataRoutes = {
  'GET /api/fleet-data': [async ({ event }: { event: any }) => {
    try {
      const user = await getSessionUser(event);
      if (!user) return error('Not signed in.', 401);
      const { items } = await db.list<FleetDataRecord>('fleet_data_' + user.id, { limit: 10 });
      const data: Record<string, unknown> = {};
      for (const item of items) {
        if (fleetDataCategories.includes(item.category)) data[item.category] = item.data;
      }
      return json({ data });
    } catch {
      return error('Could not load your fleet data.', 500);
    }
  }],
  'PUT /api/fleet-data': [async ({ event, body }: { event: any; body: unknown }) => {
    try {
      const user = await getSessionUser(event);
      if (!user) return error('Not signed in.', 401);
      const input = body as { data?: Record<string, unknown> };
      if (!input?.data || typeof input.data !== 'object') return error('Fleet data is required.', 400);
      const table = 'fleet_data_' + user.id;
      const { items } = await db.list<FleetDataRecord>(table, { limit: 10 });
      for (const category of fleetDataCategories) {
        if (!(category in input.data)) continue;
        const existing = items.find(item => item.category === category);
        const record = { category, data: input.data[category] };
        if (existing) {
          const [updated] = await db.update(table, [{ id: existing.id, record }]);
          if (!updated) return error('Could not save fleet data.', 500);
        } else {
          const [created] = await db.add(table, [record]);
          if (!created) return error('Could not save fleet data.', 500);
        }
      }
      return json({ ok: true });
    } catch {
      return error('Could not save your fleet data.', 500);
    }
  }],
};

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],
  ...authRoutes,
  ...fleetDataRoutes,
  ...realtimeSubscriptionRoutes,
});
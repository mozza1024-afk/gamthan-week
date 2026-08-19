const PROJECT_URL = 'https://twpedllnfrzldyotfmog.supabase.co';
const STORAGE_BUCKET = 'completion-photos';
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCK_MINUTES = 10;

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export function methodNotAllowed() {
  return json({ success: false, message: '허용되지 않은 요청입니다.' }, 405);
}

export function getSecret(env) {
  const key = String(env.SUPABASE_SECRET_KEY || '').trim();
  if (!key) throw new Error('SUPABASE_SECRET_KEY가 설정되지 않았습니다.');
  return key;
}

function apiHeaders(env, extra = {}) {
  return {
    apikey: getSecret(env),
    ...extra,
  };
}

export async function dbRequest(env, path, options = {}) {
  const response = await fetch(`${PROJECT_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...apiHeaders(env),
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }

  if (!response.ok) {
    const message = body?.message || body?.hint || body?.details || '데이터베이스 요청 중 오류가 발생했습니다.';
    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

export async function readSettings(env) {
  const rows = await dbRequest(env, 'app_settings?select=setting_key,setting_value');
  return Object.fromEntries((rows || []).map((r) => [r.setting_key, r.setting_value]));
}

export function parseIsoDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(text || ''))) return null;
  const [y, m, d] = String(text).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

export function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(dateText, n) {
  const dt = parseIsoDate(dateText);
  if (!dt) return null;
  dt.setUTCDate(dt.getUTCDate() + Number(n));
  return dateKey(dt);
}

export async function effectiveToday(env) {
  const settings = await readSettings(env);
  const dev = String(settings.DEV_TEST_DATE || '').trim();
  if (parseIsoDate(dev)) return dev;

  const seoul = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  return seoul;
}

export function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

export function validPhone(phone) {
  return /^010\d{8}$/.test(phone);
}

export function validPin(pin) {
  return /^\d{4}$/.test(String(pin || ''));
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(text) {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export async function hashPin(pin, saltText = null) {
  const salt = saltText ? base64UrlToBytes(saltText) : crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    material,
    256,
  );
  return {
    hash: bytesToBase64Url(new Uint8Array(bits)),
    salt: bytesToBase64Url(salt),
  };
}

export async function verifyPin(pin, salt, expectedHash) {
  const actual = await hashPin(pin, salt);
  if (actual.hash.length !== String(expectedHash || '').length) return false;
  let diff = 0;
  for (let i = 0; i < actual.hash.length; i++) diff |= actual.hash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  return diff === 0;
}

async function sessionKey(env) {
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`gamthan-session:${getSecret(env)}`));
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function createSession(env, participantId) {
  const payload = {
    sub: participantId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const payloadText = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await sessionKey(env), new TextEncoder().encode(payloadText));
  return `${payloadText}.${bytesToBase64Url(new Uint8Array(sig))}`;
}

export async function verifySession(env, request) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) throw unauthorized();
  const token = auth.slice(7).trim();
  const [payloadText, sigText] = token.split('.');
  if (!payloadText || !sigText) throw unauthorized();

  const ok = await crypto.subtle.verify(
    'HMAC',
    await sessionKey(env),
    base64UrlToBytes(sigText),
    new TextEncoder().encode(payloadText),
  );
  if (!ok) throw unauthorized();

  let payload;
  try { payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadText))); }
  catch { throw unauthorized(); }
  if (!payload.sub || Number(payload.exp) < Math.floor(Date.now() / 1000)) throw unauthorized('로그인 시간이 만료되었습니다. 다시 로그인해 주세요.');
  return payload;
}

export function unauthorized(message = '로그인이 필요합니다.') {
  const error = new Error(message);
  error.status = 401;
  return error;
}

export async function getParticipant(env, id) {
  const rows = await dbRequest(env, `participants?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
  return rows?.[0] || null;
}

export async function getParticipantByPhone(env, phone) {
  const rows = await dbRequest(env, `participants?select=*&phone=eq.${encodeURIComponent(phone)}&limit=1`);
  return rows?.[0] || null;
}

export function participantStatus(participant, today) {
  if (participant.status === 'cancelled') return 'cancelled';
  if (participant.is_completed) return 'completed';
  if (today < participant.start_date) return 'scheduled';
  if (today > participant.end_date) return 'ended';
  return 'active';
}

export async function getDiaryRows(env, participantId) {
  return await dbRequest(env, `diaries?select=id,diary_date,day_number,diary_text,other_action_text,created_at,updated_at&participant_id=eq.${encodeURIComponent(participantId)}&order=diary_date.asc`);
}

export async function getDiaryActionRows(env, diaryIds) {
  if (!diaryIds.length) return [];
  const encoded = diaryIds.join(',');
  return await dbRequest(env, `diary_actions?select=diary_id,action_code&diary_id=in.(${encoded})`);
}

export async function getActionMap(env) {
  const rows = await dbRequest(env, 'actions?select=action_code,action_name&is_active=eq.true&order=sort_order.asc');
  return Object.fromEntries(rows.map((r) => [r.action_code, r.action_name]));
}

export async function refreshProgress(env, participantId) {
  await dbRequest(env, 'rpc/refresh_participant_progress', {
    method: 'POST',
    body: JSON.stringify({ p_participant_id: participantId }),
  });
}

export async function uploadPrivatePhoto(env, path, blob, mimeType) {
  const response = await fetch(`${PROJECT_URL}/storage/v1/object/${STORAGE_BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      ...apiHeaders(env),
      'content-type': mimeType,
      'x-upsert': 'false',
    },
    body: blob,
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`사진 업로드에 실패했습니다. ${body}`);
  }
}

export function sanitizeFileName(name) {
  return String(name || 'photo').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

export function friendlyError(error) {
  const message = String(error?.message || '오류가 발생했습니다.');
  if (message.includes('온라인 신청 정원이 마감')) return message;
  if (message.includes('duplicate key') && message.includes('phone')) return '이미 신청된 휴대전화번호입니다.';
  if (message.includes('participants_phone_key')) return '이미 신청된 휴대전화번호입니다.';
  if (message.includes('diaries_participant_id_diary_date_key')) return '오늘 일기는 이미 작성되어 있습니다.';
  return message;
}

// ===== 관리자 전용 기능 =====
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;

export function getAdminPassword(env) {
  const password = String(env.ADMIN_PASSWORD || '').trim();
  if (!password) throw new Error('ADMIN_PASSWORD가 설정되지 않았습니다. Cloudflare의 변수와 비밀에서 관리자 비밀번호를 등록해 주세요.');
  if (password.length < 8) throw new Error('ADMIN_PASSWORD는 8자 이상으로 설정해 주세요.');
  return password;
}

async function digestText(text) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text))));
}

function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyAdminPassword(env, input) {
  const [a, b] = await Promise.all([digestText(String(input || '')), digestText(getAdminPassword(env))]);
  return equalBytes(a, b);
}

async function adminSessionKey(env) {
  const source = `gamthan-admin:${getSecret(env)}:${getAdminPassword(env)}`;
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function createAdminSession(env) {
  const payload = {
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS,
  };
  const payloadText = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await adminSessionKey(env), new TextEncoder().encode(payloadText));
  return `${payloadText}.${bytesToBase64Url(new Uint8Array(sig))}`;
}

export async function verifyAdminSession(env, request) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) throw unauthorized('관리자 로그인이 필요합니다.');
  const token = auth.slice(7).trim();
  const [payloadText, sigText] = token.split('.');
  if (!payloadText || !sigText) throw unauthorized('관리자 로그인이 필요합니다.');

  const ok = await crypto.subtle.verify(
    'HMAC',
    await adminSessionKey(env),
    base64UrlToBytes(sigText),
    new TextEncoder().encode(payloadText),
  );
  if (!ok) throw unauthorized('관리자 로그인이 필요합니다.');

  let payload;
  try { payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadText))); }
  catch { throw unauthorized('관리자 로그인이 필요합니다.'); }
  if (payload.role !== 'admin' || Number(payload.exp) < Math.floor(Date.now() / 1000)) {
    throw unauthorized('관리자 로그인 시간이 만료되었습니다. 다시 로그인해 주세요.');
  }
  return payload;
}

export async function dbRequestPaged(env, path, pageSize = 1000, maxPages = 10) {
  const all = [];
  for (let page = 0; page < maxPages; page++) {
    const start = page * pageSize;
    const end = start + pageSize - 1;
    const rows = await dbRequest(env, path, { headers: { Range: `${start}-${end}` } });
    const arr = Array.isArray(rows) ? rows : [];
    all.push(...arr);
    if (arr.length < pageSize) break;
  }
  return all;
}

export async function createSignedPhotoUrl(env, storagePath, expiresIn = 300, downloadName = '') {
  const path = String(storagePath || '').split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`${PROJECT_URL}/storage/v1/object/sign/${STORAGE_BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: getSecret(env),
      'content-type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: Math.max(60, Math.min(Number(expiresIn) || 300, 3600)) }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.signedURL) {
    throw new Error(body?.message || body?.error || '인증사진 주소를 만들지 못했습니다.');
  }
  let url = `${PROJECT_URL}/storage/v1${body.signedURL}`;
  if (downloadName) url += `&download=${encodeURIComponent(sanitizeFileName(downloadName))}`;
  return url;
}

const PROJECT_URL =
  process.env.SUPABASE_PROJECT_URL ||
  'https://twpedllnfrzldyotfmog.supabase.co';

const STORAGE_BUCKET = 'completion-photos';
const te = new TextEncoder();
const td = new TextDecoder();

export function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'cache-control': 'no-store' },
  });
}

export function secret() {
  const v = String(process.env.SUPABASE_SECRET_KEY || '').trim();

  if (!v) {
    throw new Error('SUPABASE_SECRET_KEY가 설정되지 않았습니다.');
  }

  return v;
}

function apiHeaders(extra = {}) {
  const key = secret();

  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

export async function dbRequest(path, options = {}) {
  const res = await fetch(`${PROJECT_URL}/rest/v1/${path}`, {
    ...options,
    headers: apiHeaders(options.headers || {}),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();

    const err = new Error(
      text || `Supabase ${res.status}`
    );

    err.status = res.status;
    throw err;
  }

  if (res.status === 204) {
    return null;
  }

  const text = await res.text();

  return text ? JSON.parse(text) : null;
}

export async function readSettings() {
  const rows = await dbRequest(
    'app_settings?select=setting_key,setting_value'
  );

  return Object.fromEntries(
    (rows || []).map((r) => [
      r.setting_key,
      r.setting_value,
    ])
  );
}

export function kstToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function effectiveToday() {
  const s = await readSettings();

  return (
    String(s.DEV_TEST_DATE || '').trim() ||
    kstToday()
  );
}


/* ================================
   전화번호 처리
   화면에서는 010-1234-5678처럼 입력해도 되고,
   DB에는 01012345678 숫자 11자리로 저장합니다.
================================ */

export function normalizePhone(v) {
  return String(v || '').replace(/\D/g, '');
}

export function validPhone(v) {
  return /^010\d{8}$/.test(String(v || ''));
}


/* ================================
   생년월일 6자리 검사
================================ */

export function validBirth6(v) {
  const s = String(v || '').replace(/\D/g, '');

  if (!/^\d{6}$/.test(s)) {
    return false;
  }

  const m = Number(s.slice(2, 4));
  const d = Number(s.slice(4, 6));

  if (m < 1 || m > 12 || d < 1) {
    return false;
  }

  const max = new Date(2000, m, 0).getDate();

  return d <= max;
}


/* ================================
   날짜 계산
================================ */

export function addDays(dateText, n) {
  const d = new Date(`${dateText}T00:00:00Z`);

  d.setUTCDate(
    d.getUTCDate() + n
  );

  return d.toISOString().slice(0, 10);
}


/* ================================
   암호화 / 로그인 토큰
================================ */

function b64u(bytes) {
  return Buffer.from(bytes).toString('base64url');
}

function fromB64u(s) {
  return new Uint8Array(
    Buffer.from(s, 'base64url')
  );
}

async function keyFor(purpose) {
  const raw = await crypto.subtle.digest(
    'SHA-256',
    te.encode(`${purpose}:${secret()}`)
  );

  return crypto.subtle.importKey(
    'raw',
    raw,
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['sign', 'verify']
  );
}

export async function makeToken(
  payload,
  purpose,
  ttlSeconds
) {
  const body = {
    ...payload,
    exp:
      Math.floor(Date.now() / 1000) +
      ttlSeconds,
  };

  const p = b64u(
    te.encode(JSON.stringify(body))
  );

  const sig = await crypto.subtle.sign(
    'HMAC',
    await keyFor(purpose),
    te.encode(p)
  );

  return `${p}.${b64u(
    new Uint8Array(sig)
  )}`;
}

export async function readToken(
  request,
  purpose
) {
  const auth =
    request.headers.get('authorization') || '';

  if (!auth.startsWith('Bearer ')) {
    throw Object.assign(
      new Error('로그인이 필요합니다.'),
      { status: 401 }
    );
  }

  const [p, s] = auth
    .slice(7)
    .trim()
    .split('.');

  if (!p || !s) {
    throw Object.assign(
      new Error('로그인이 필요합니다.'),
      { status: 401 }
    );
  }

  const ok = await crypto.subtle.verify(
    'HMAC',
    await keyFor(purpose),
    fromB64u(s),
    te.encode(p)
  );

  if (!ok) {
    throw Object.assign(
      new Error('로그인이 필요합니다.'),
      { status: 401 }
    );
  }

  const body = JSON.parse(
    td.decode(fromB64u(p))
  );

  if (
    Number(body.exp) <
    Math.floor(Date.now() / 1000)
  ) {
    throw Object.assign(
      new Error(
        '로그인 시간이 만료되었습니다.'
      ),
      { status: 401 }
    );
  }

  return body;
}


/* ================================
   생년월일 / 비밀번호 해시
================================ */

export async function hashValue(value) {
  const salt =
    crypto.getRandomValues(
      new Uint8Array(16)
    );

  const base =
    await crypto.subtle.importKey(
      'raw',
      te.encode(String(value)),
      'PBKDF2',
      false,
      ['deriveBits']
    );

  const bits =
    await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      base,
      256
    );

  return {
    hash: b64u(
      new Uint8Array(bits)
    ),
    salt: b64u(salt),
  };
}

export async function verifyHash(
  value,
  hash,
  salt
) {
  if (!hash || !salt) {
    return false;
  }

  const base =
    await crypto.subtle.importKey(
      'raw',
      te.encode(String(value)),
      'PBKDF2',
      false,
      ['deriveBits']
    );

  const bits = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: fromB64u(salt),
        iterations: 100000,
        hash: 'SHA-256',
      },
      base,
      256
    )
  );

  const expected =
    fromB64u(hash);

  if (
    bits.length !==
    expected.length
  ) {
    return false;
  }

  let diff = 0;

  for (
    let i = 0;
    i < bits.length;
    i++
  ) {
    diff |=
      bits[i] ^ expected[i];
  }

  return diff === 0;
}


/* ================================
   참가자 로그인 세션
================================ */

export async function participantSession(id) {
  return makeToken(
    {
      sub: id,
      role: 'participant',
    },
    'participant',
    60 * 60 * 24
  );
}

export async function requireParticipant(
  request
) {
  const s =
    await readToken(
      request,
      'participant'
    );

  if (s.role !== 'participant') {
    throw Object.assign(
      new Error('로그인이 필요합니다.'),
      { status: 401 }
    );
  }

  return s;
}


/* ================================
   관리자 세션
================================ */

export async function adminSession(admin) {
  return makeToken(
    {
      sub: admin.id,
      role: admin.role,
      org:
        admin.organization_id ||
        null,
      name: admin.display_name,
    },
    'admin',
    60 * 60 * 8
  );
}

export async function requireAdmin(
  request
) {
  const s =
    await readToken(
      request,
      'admin'
    );

  if (
    ![
      'super_admin',
      'org_admin',
    ].includes(s.role)
  ) {
    throw Object.assign(
      new Error(
        '관리자 로그인이 필요합니다.'
      ),
      { status: 401 }
    );
  }

  return s;
}


/* ================================
   관리자 접속 로그
================================ */

export async function audit(
  admin,
  action,
  targetType = '',
  targetId = '',
  detail = {}
) {
  try {
    await dbRequest(
      'admin_access_logs',
      {
        method: 'POST',
        headers: {
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          admin_user_id:
            String(admin.sub),
          admin_role:
            admin.role,
          organization_id:
            admin.org || null,
          action,
          target_type:
            targetType,
          target_id:
            String(targetId || ''),
          detail,
        }),
      }
    );
  } catch {
    // 로그 저장 실패 때문에
    // 본 업무가 중단되지 않게 합니다.
  }
}


/* ================================
   기관별 관리자 범위
================================ */

export function scopedOrgQuery(
  admin,
  field = 'organization_id'
) {
  return admin.role === 'org_admin'
    ? `&${field}=eq.${encodeURIComponent(
        admin.org || '__none__'
      )}`
    : '';
}


/* ================================
   완주 인증사진
================================ */

export async function uploadPhoto(
  path,
  blob,
  mime
) {
  const key = secret();

  const res = await fetch(
    `${PROJECT_URL}/storage/v1/object/${STORAGE_BUCKET}/${path}`,
    {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization:
          `Bearer ${key}`,
        'content-type': mime,
        'x-upsert': 'false',
      },
      body: blob,
    }
  );

  if (!res.ok) {
    throw new Error(
      `사진 업로드 실패: ${await res.text()}`
    );
  }
}

export async function signedPhotoUrl(
  path,
  expires = 900
) {
  const rows = await fetch(
    `${PROJECT_URL}/storage/v1/object/sign/${STORAGE_BUCKET}/${path}`,
    {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({
        expiresIn: expires,
      }),
    }
  );

  if (!rows.ok) {
    return null;
  }

  const data =
    await rows.json();

  return data.signedURL
    ? `${PROJECT_URL}/storage/v1${data.signedURL}`
    : null;
}


/* ================================
   사용자에게 보여줄 오류문구
================================ */

export function friendly(error) {
  const m = String(
    error?.message ||
      '오류가 발생했습니다.'
  );

  if (
    m.includes(
      'participants_phone_key'
    ) ||
    (
      m.includes('duplicate key') &&
      m.includes('phone')
    )
  ) {
    return '이미 신청된 휴대전화번호입니다.';
  }

  if (
    m.includes(
      '온라인 신청 정원'
    )
  ) {
    return m;
  }

  return m;
}

import {
  addDays, adminSession, audit, dbRequest, effectiveToday, friendly, hashValue, json,
  normalizePhone, participantSession, readSettings, requireAdmin, requireParticipant,
  signedPhotoUrl, uploadPhoto, validBirth6, validPhone, verifyHash,
} from '../../lib/server.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function pathParts(request) {
  const raw = new URL(request.url).searchParams.get('path') || '';
  return raw.split('/').filter(Boolean);
}

async function bodyJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function q(v) {
  return encodeURIComponent(String(v ?? ''));
}

function err(error, fallback = 400) {
  return json(
    { success: false, message: friendly(error) },
    error?.status || fallback
  );
}

function settingBool(settings, key, fallback = false) {
  const raw = settings?.[key];

  if (
    raw === undefined ||
    raw === null ||
    String(raw).trim() === ''
  ) {
    return fallback;
  }

  return String(raw).trim().toLowerCase() === 'true';
}

async function getParticipant(id) {
  const rows = await dbRequest(
    `participants?select=*&id=eq.${q(id)}&limit=1`
  );

  return rows?.[0] || null;
}

async function getActions() {
  return dbRequest(
    'actions?select=action_code,action_name,action_description&is_active=eq.true&order=sort_order.asc'
  );
}

async function getDiaries(pid) {
  return dbRequest(
    `diaries?select=id,diary_date,day_number,diary_text,other_action_text,created_at,updated_at&participant_id=eq.${q(pid)}&order=diary_date.asc`
  );
}

async function actionMapFor(diaries) {
  const ids = (diaries || []).map(d => d.id);

  if (!ids.length) return {};

  const [links, actions] = await Promise.all([
    dbRequest(
      `diary_actions?select=diary_id,action_code&diary_id=in.(${ids.join(',')})`
    ),
    dbRequest('actions?select=action_code,action_name'),
  ]);

  const map = Object.fromEntries(
    (actions || []).map(a => [a.action_code, a.action_name])
  );

  const out = {};

  for (const r of links || []) {
    if (!out[r.diary_id]) {
      out[r.diary_id] = [];
    }

    out[r.diary_id].push({
      code: r.action_code,
      name: map[r.action_code] || r.action_code
    });
  }

  return out;
}

async function refreshProgress(pid) {
  try {
    await dbRequest(
      'rpc/refresh_participant_progress',
      {
        method: 'POST',
        body: JSON.stringify({
          p_participant_id: pid
        })
      }
    );
  } catch {}
}

function participantStatus(p, today) {
  if (p.status === 'cancelled') return 'cancelled';
  if (p.is_completed) return 'completed';
  if (today < p.start_date) return 'scheduled';
  if (today > p.end_date) return 'ended';

  return 'active';
}

async function publicData() {
  const [
    settings,
    organizations,
    actions,
    participants,
    today
  ] = await Promise.all([
    readSettings(),
    dbRequest(
      'organizations?select=id,organization_code,organization_name&is_active=eq.true&order=sort_order.asc'
    ),
    getActions(),
    dbRequest(
      'participants?select=id&registration_source=eq.online&status=neq.cancelled'
    ),
    effectiveToday(),
  ]);

  const limit = Math.max(
    1,
    Number(settings.ONLINE_APPLICATION_LIMIT || 100)
  );

  const count = (participants || []).length;

  const devMode = Boolean(
    String(settings.DEV_TEST_DATE || '').trim()
  );

  const within =
    devMode ||
    (
      today >= settings.APPLICATION_START_DATE &&
      today <= settings.APPLICATION_END_DATE
    );

  const course28Open = settingBool(
    settings,
    'COURSE_28_OPEN',
    false
  );

  return json({
    success: true,
    today,
    devMode,
    applicationOpen: within && count < limit,
    applicationStartDate: settings.APPLICATION_START_DATE,
    applicationEndDate: settings.APPLICATION_END_DATE,
    activityStartDate: settings.ACTIVITY_START_DATE,
    activityEndDate: settings.ACTIVITY_END_DATE,
    privacyRetentionDate: settings.PRIVACY_RETENTION_DATE || '',
    onlineApplicationLimit: limit,
    onlineApplicationCount: count,
    onlineApplicationRemaining: Math.max(0, limit - count),
    course28Open,
    organizations,
    actions
  });
}

async function register(request) {
  const b = await bodyJson(request);

  const displayName = String(
    b.displayName || ''
  ).trim();

  const phone = normalizePhone(b.phone);

  const birth6 = String(
    b.birth6 || ''
  ).replace(/\D/g, '');

  const organizationId = String(
    b.organizationId || ''
  ).trim();

  const courseDays = Number(b.courseDays);

  const startDate = String(
    b.startDate || ''
  ).trim();

  if (!displayName || displayName.length > 30) {
    throw new Error(
      '이름 또는 별명을 30자 이내로 입력해 주세요.'
    );
  }

  if (!validPhone(phone)) {
    throw new Error(
      '휴대전화번호를 확인해 주세요.'
    );
  }

  if (!validBirth6(birth6)) {
    throw new Error(
      '생년월일 6자리를 확인해 주세요. 예: 650326'
    );
  }

  if (!organizationId) {
    throw new Error(
      '소속기관을 선택해 주세요.'
    );
  }

  if (![7, 14, 21, 28].includes(courseDays)) {
    throw new Error(
      '참여 코스를 선택해 주세요.'
    );
  }

  if (b.privacyConsent !== true) {
    throw new Error(
      '개인정보 수집·이용 동의가 필요합니다.'
    );
  }

  const [settings, today] = await Promise.all([
    readSettings(),
    effectiveToday()
  ]);

  const dev = Boolean(
    String(settings.DEV_TEST_DATE || '').trim()
  );

  if (
    !dev &&
    (
      today < settings.APPLICATION_START_DATE ||
      today > settings.APPLICATION_END_DATE
    )
  ) {
    throw new Error(
      '현재는 온라인 신청 기간이 아닙니다.'
    );
  }

  if (
    courseDays === 28 &&
    !settingBool(
      settings,
      'COURSE_28_OPEN',
      false
    )
  ) {
    throw new Error(
      '28일 코스 신청은 마감되었습니다. 7일·14일·21일 코스를 선택해 주세요.'
    );
  }

  if (
    startDate < settings.ACTIVITY_START_DATE ||
    addDays(startDate, courseDays - 1) >
      settings.ACTIVITY_END_DATE
  ) {
    throw new Error(
      '선택한 코스가 실천기간 안에 끝나도록 시작일을 선택해 주세요.'
    );
  }

  const [
    org,
    existing,
    online
  ] = await Promise.all([
    dbRequest(
      `organizations?select=id,organization_name&id=eq.${q(organizationId)}&is_active=eq.true&limit=1`
    ),
    dbRequest(
      `participants?select=id,status&phone=eq.${q(phone)}&limit=1`
    ),
    dbRequest(
      'participants?select=id&registration_source=eq.online&status=neq.cancelled'
    ),
  ]);

  if (!org?.[0]) {
    throw new Error(
      '유효한 소속기관을 선택해 주세요.'
    );
  }

  if (
    existing?.[0] &&
    existing[0].status !== 'cancelled'
  ) {
    throw new Error(
      '이미 신청된 휴대전화번호입니다.'
    );
  }

  const limit = Math.max(
    1,
    Number(
      settings.ONLINE_APPLICATION_LIMIT || 100
    )
  );

  if ((online || []).length >= limit) {
    throw new Error(
      `온라인 신청 정원 ${limit}명이 마감되었습니다.`
    );
  }

  const secured = await hashValue(birth6);

  const payload = {
    display_name: displayName,
    phone,
    pin_hash: secured.hash,
    pin_salt: secured.salt,
    birth_hash: secured.hash,
    birth_salt: secured.salt,
    organization_id: organizationId,
    organization_name_snapshot:
      org[0].organization_name,
    course_days: courseDays,
    start_date: startDate,
    end_date: addDays(
      startDate,
      courseDays - 1
    ),
    registration_source: 'online',
    status:
      today < startDate
        ? 'scheduled'
        : 'active',
    privacy_consent: true,
    privacy_consent_at:
      new Date().toISOString(),
    privacy_consent_version:
      '2026-08-birth-v1',
    failed_login_count: 0,
    locked_until: null,
    is_completed: false
  };

  let participantCode = '';

  if (
    existing?.[0]?.status === 'cancelled'
  ) {
    const rows = await dbRequest(
      `participants?id=eq.${q(existing[0].id)}`,
      {
        method: 'PATCH',
        headers: {
          Prefer: 'return=representation'
        },
        body: JSON.stringify(payload)
      }
    );

    participantCode =
      rows?.[0]?.participant_code || '';
  } else {
    const rows = await dbRequest(
      'participants',
      {
        method: 'POST',
        headers: {
          Prefer: 'return=representation'
        },
        body: JSON.stringify(payload)
      }
    );

    participantCode =
      rows?.[0]?.participant_code || '';
  }

  return json({
    success: true,
    message:
      '감탄위크 참여 신청이 완료되었습니다.',
    participantCode,
    startDate,
    endDate: addDays(
      startDate,
      courseDays - 1
    )
  });
}

async function participantLogin(request) {
  const b = await bodyJson(request);

  const phone = normalizePhone(b.phone);

  const birth6 = String(
    b.birth6 || ''
  ).replace(/\D/g, '');

  if (
    !validPhone(phone) ||
    !validBirth6(birth6)
  ) {
    throw new Error(
      '휴대전화번호와 생년월일 6자리를 확인해 주세요.'
    );
  }

  const rows = await dbRequest(
    `participants?select=*&phone=eq.${q(phone)}&limit=1`
  );

  const p = rows?.[0];

  if (!p || p.status === 'cancelled') {
    throw new Error(
      '신청정보를 확인할 수 없습니다.'
    );
  }

  if (
    p.locked_until &&
    new Date(
      p.locked_until
    ).getTime() > Date.now()
  ) {
    throw new Error(
      '로그인 시도가 여러 번 실패했습니다. 잠시 후 다시 시도해 주세요.'
    );
  }

  const ok = await verifyHash(
    birth6,
    p.birth_hash || p.pin_hash,
    p.birth_salt || p.pin_salt
  );

  if (!ok) {
    const n =
      Number(
        p.failed_login_count || 0
      ) + 1;

    const patch =
      n >= 5
        ? {
            failed_login_count: 0,
            locked_until:
              new Date(
                Date.now() +
                10 * 60 * 1000
              ).toISOString()
          }
        : {
            failed_login_count: n
          };

    await dbRequest(
      `participants?id=eq.${q(p.id)}`,
      {
        method: 'PATCH',
        headers: {
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(patch)
      }
    );

    throw new Error(
      '휴대전화번호 또는 생년월일이 일치하지 않습니다.'
    );
  }

  await dbRequest(
    `participants?id=eq.${q(p.id)}`,
    {
      method: 'PATCH',
      headers: {
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        failed_login_count: 0,
        locked_until: null
      })
    }
  );

  return json({
    success: true,
    token:
      await participantSession(p.id)
  });
}

async function participantDashboard(request) {
  const s =
    await requireParticipant(request);

  const [p, today] =
    await Promise.all([
      getParticipant(s.sub),
      effectiveToday()
    ]);

  if (!p) {
    throw Object.assign(
      new Error(
        '로그인 정보를 확인할 수 없습니다.'
      ),
      { status: 401 }
    );
  }

  // 관리자가 취소한 참여자는
  // 기존 로그인 토큰이 남아 있어도
  // 즉시 차단한다.
  if (p.status === 'cancelled') {
    throw Object.assign(
      new Error(
        '신청이 취소되었습니다. 다시 로그인할 수 없습니다.'
      ),
      { status: 401 }
    );
  }

  const diaries =
    await getDiaries(p.id);

  const [by, photos] =
    await Promise.all([
      actionMapFor(diaries),
      dbRequest(
        `completion_photos?select=id,photo_no,created_at&participant_id=eq.${q(p.id)}&order=photo_no.asc`
      )
    ]);

  const status =
    participantStatus(
      p,
      today
    );

  const todayDiary =
    (diaries || []).find(
      d => d.diary_date === today
    ) || null;

  const complete =
    (diaries || []).length >=
    Number(p.course_days);

  return json({
    success: true,
    today,
    participant: {
      id: p.id,
      displayName:
        p.display_name,
      organizationName:
        p.organization_name_snapshot,
      courseDays:
        p.course_days,
      startDate:
        p.start_date,
      endDate:
        p.end_date,
      status,
      completedDays:
        (diaries || []).length,
      progressPercent:
        Math.min(
          100,
          Math.round(
            (
              (diaries || []).length /
              Number(p.course_days)
            ) * 100
          )
        ),
      isCompleted:
        p.is_completed,
      photoCount:
        (photos || []).length
    },
    canWriteToday:
      status === 'active',
    todayDiary:
      todayDiary
        ? {
            ...todayDiary,
            actions:
              by[todayDiary.id] || []
          }
        : null,
    diaries:
      (diaries || []).map(
        d => ({
          ...d,
          actions:
            by[d.id] || []
        })
      ),
    completion: {
      diaryComplete: complete,
      canUploadPhotos:
        complete &&
        (photos || []).length < 3,
      photoCount:
        (photos || []).length,
      needsPhoto:
        complete &&
        (photos || []).length === 0,
      complete:
        p.is_completed === true
    }
  });
}

async function saveDiary(request) {
  const s =
    await requireParticipant(request);

  const b =
    await bodyJson(request);

  const [
    p,
    today,
    actions
  ] = await Promise.all([
    getParticipant(s.sub),
    effectiveToday(),
    getActions()
  ]);

  if (!p) {
    throw new Error(
      '참여자 정보를 찾을 수 없습니다.'
    );
  }

  if (
    participantStatus(
      p,
      today
    ) !== 'active'
  ) {
    throw new Error(
      '오늘은 감탄일기를 작성할 수 있는 기간이 아닙니다.'
    );
  }

  const text = String(
    b.diaryText || ''
  ).trim();

  const codes =
    Array.isArray(
      b.actionCodes
    )
      ? [
          ...new Set(
            b.actionCodes.map(String)
          )
        ]
      : [];

  const other = String(
    b.otherActionText || ''
  ).trim();

  if (
    text.length < 10 ||
    text.length > 500
  ) {
    throw new Error(
      '감탄일기는 10자 이상 500자 이하로 작성해 주세요.'
    );
  }

  const allowed =
    new Set(
      (actions || []).map(
        a => a.action_code
      )
    );

  if (
    !codes.length ||
    codes.some(
      c => !allowed.has(c)
    )
  ) {
    throw new Error(
      '오늘 실천한 행동을 1개 이상 선택해 주세요.'
    );
  }

  const dayNumber =
    Math.max(
      1,
      Math.floor(
        (
          new Date(
            `${today}T00:00:00Z`
          ) -
          new Date(
            `${p.start_date}T00:00:00Z`
          )
        ) /
        86400000
      ) + 1
    );

  let existing =
    await dbRequest(
      `diaries?select=id&participant_id=eq.${q(p.id)}&diary_date=eq.${q(today)}&limit=1`
    );

  let diaryId;

  if (existing?.[0]) {
    diaryId =
      existing[0].id;

    await dbRequest(
      `diaries?id=eq.${q(diaryId)}`,
      {
        method: 'PATCH',
        headers: {
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          diary_text: text,
          other_action_text:
            other || null,
          day_number:
            dayNumber,
          updated_at:
            new Date().toISOString()
        })
      }
    );

    await dbRequest(
      `diary_actions?diary_id=eq.${q(diaryId)}`,
      {
        method: 'DELETE'
      }
    );
  } else {
    const rows =
      await dbRequest(
        'diaries',
        {
          method: 'POST',
          headers: {
            Prefer:
              'return=representation'
          },
          body:
            JSON.stringify({
              participant_id:
                p.id,
              diary_date:
                today,
              day_number:
                dayNumber,
              diary_text:
                text,
              other_action_text:
                other || null
            })
        }
      );

    diaryId =
      rows?.[0]?.id;
  }

  if (codes.length) {
    await dbRequest(
      'diary_actions',
      {
        method: 'POST',
        headers: {
          Prefer:
            'return=minimal'
        },
        body:
          JSON.stringify(
            codes.map(c => ({
              diary_id:
                diaryId,
              action_code:
                c
            }))
          )
      }
    );
  }

  await refreshProgress(p.id);

  return json({
    success: true,
    message:
      '오늘의 감탄일기를 저장했습니다.'
  });
}

async function completionPhotos(request) {
  const s =
    await requireParticipant(request);

  const p =
    await getParticipant(s.sub);

  if (!p) {
    throw Object.assign(
      new Error(
        '로그인 정보를 확인할 수 없습니다.'
      ),
      { status: 401 }
    );
  }

  // 취소된 참여자는
  // 기존 로그인 토큰으로
  // 사진 업로드도 할 수 없도록 차단
  if (p.status === 'cancelled') {
    throw Object.assign(
      new Error(
        '신청이 취소되었습니다. 다시 로그인할 수 없습니다.'
      ),
      { status: 401 }
    );
  }

  const diaries =
    await getDiaries(p.id);

  if (
    (diaries || []).length <
    Number(p.course_days)
  ) {
    throw new Error(
      '선택한 코스의 감탄일기를 모두 작성한 뒤 인증사진을 등록할 수 있습니다.'
    );
  }

  const existing =
    await dbRequest(
      `completion_photos?select=id,photo_no&participant_id=eq.${q(p.id)}&order=photo_no.asc`
    );

  const form =
    await request.formData();

  const files =
    form
      .getAll('photos')
      .filter(
        v =>
          typeof v !== 'string'
      );

  if (!files.length) {
    throw new Error(
      '완주 인증사진을 1장 이상 선택해 주세요.'
    );
  }

  if (
    (existing || []).length +
      files.length >
    3
  ) {
    throw new Error(
      '인증사진은 최대 3장까지 등록할 수 있습니다.'
    );
  }

  let no =
    (existing || []).length + 1;

  for (const file of files) {
    const mime =
      String(
        file.type || ''
      );

    if (
      ![
        'image/jpeg',
        'image/png',
        'image/webp'
      ].includes(mime)
    ) {
      throw new Error(
        'JPG, PNG, WebP 사진만 등록할 수 있습니다.'
      );
    }

    if (
      file.size >
      1024 * 1024
    ) {
      throw new Error(
        '압축 후 사진 1장은 1MB 이하여야 합니다.'
      );
    }

    const ext =
      mime === 'image/png'
        ? 'png'
        : mime === 'image/webp'
          ? 'webp'
          : 'jpg';

    const path =
      `${p.id}/${Date.now()}-${no}.${ext}`;

    await uploadPhoto(
      path,
      file,
      mime
    );

    await dbRequest(
      'completion_photos',
      {
        method: 'POST',
        headers: {
          Prefer:
            'return=minimal'
        },
        body:
          JSON.stringify({
            participant_id:
              p.id,
            photo_no:
              no,
            storage_path:
              path,
            original_file_name:
              String(
                file.name ||
                'photo'
              )
                .replace(
                  /[^a-zA-Z0-9._-]/g,
                  '_'
                )
                .slice(-80),
            mime_type:
              mime,
            file_size_bytes:
              file.size
          })
      }
    );

    no++;
  }

  await refreshProgress(p.id);

  return json({
    success: true,
    message:
      '완주 인증사진을 등록했습니다.'
  });
}

async function adminBootstrap(request) {
  const b =
    await bodyJson(request);

  const setup =
    String(
      process.env.ADMIN_SETUP_CODE ||
      ''
    ).trim();

  if (
    !setup ||
    setup.length < 8
  ) {
    throw new Error(
      'Vercel에 ADMIN_SETUP_CODE를 8자 이상으로 설정해 주세요.'
    );
  }

  const admins =
    await dbRequest(
      'admin_users?select=id&role=eq.super_admin&is_active=eq.true&limit=1'
    );

  if (admins?.length) {
    throw Object.assign(
      new Error(
        '전체관리자 설정이 이미 완료되었습니다.'
      ),
      { status: 409 }
    );
  }

  if (
    String(
      b.setupCode || ''
    ) !== setup
  ) {
    throw Object.assign(
      new Error(
        '초기 설정 코드가 일치하지 않습니다.'
      ),
      { status: 401 }
    );
  }

  const email =
    String(
      b.email || ''
    )
      .trim()
      .toLowerCase();

  const name =
    String(
      b.displayName || ''
    ).trim();

  const password =
    String(
      b.password || ''
    );

  if (
    !/^\S+@\S+\.\S+$/.test(email) ||
    !name ||
    password.length < 10
  ) {
    throw new Error(
      '이메일, 이름, 10자 이상 비밀번호를 확인해 주세요.'
    );
  }

  const h =
    await hashValue(password);

  await dbRequest(
    'admin_users',
    {
      method: 'POST',
      headers: {
        Prefer:
          'return=minimal'
      },
      body:
        JSON.stringify({
          email,
          display_name:
            name,
          password_hash:
            h.hash,
          password_salt:
            h.salt,
          role:
            'super_admin',
          organization_id:
            null,
          is_active:
            true
        })
    }
  );

  return json({
    success: true,
    message:
      '명륜 전체관리자 계정이 만들어졌습니다.'
  });
}

async function adminLogin(request) {
  const b =
    await bodyJson(request);

  const email =
    String(
      b.email || ''
    )
      .trim()
      .toLowerCase();

  const password =
    String(
      b.password || ''
    );

  const rows =
    await dbRequest(
      `admin_users?select=*&email=eq.${q(email)}&is_active=eq.true&limit=1`
    );

  const a =
    rows?.[0];

  if (
    !a ||
    !(
      await verifyHash(
        password,
        a.password_hash,
        a.password_salt
      )
    )
  ) {
    throw Object.assign(
      new Error(
        '관리자 이메일 또는 비밀번호가 일치하지 않습니다.'
      ),
      { status: 401 }
    );
  }

  await audit(
    {
      sub: a.id,
      role: a.role,
      org: a.organization_id
    },
    'login',
    'admin_user',
    a.id
  );

  return json({
    success: true,
    token:
      await adminSession(a),
    admin: {
      displayName:
        a.display_name,
      role:
        a.role,
      organizationId:
        a.organization_id
    }
  });
}

function adminAllowedSite(
  admin,
  site
) {
  return (
    admin.role ===
      'super_admin' ||
    String(
      site.organization_id || ''
    ) ===
      String(
        admin.org || ''
      )
  );
}

async function adminDashboard(request) {
  const a =
    await requireAdmin(request);

  const [
    participants,
    diaries,
    diaryActions,
    actions,
    photos,
    sites,
    entries,
    settings,
    organizations
  ] =
    await Promise.all([
      dbRequest(
        'participants?select=id,display_name,phone,organization_id,organization_name_snapshot,course_days,start_date,end_date,status,is_completed,created_at&status=neq.cancelled&order=created_at.desc'
      ),
      dbRequest(
        'diaries?select=id,participant_id,diary_date,day_number,diary_text,other_action_text,created_at,updated_at&order=diary_date.desc'
      ),
      dbRequest(
        'diary_actions?select=diary_id,action_code'
      ),
      dbRequest(
        'actions?select=action_code,action_name'
      ),
      dbRequest(
        'completion_photos?select=id,participant_id,photo_no,storage_path,created_at'
      ),
      dbRequest(
        'offline_sites?select=*&is_active=eq.true&order=sort_order.asc'
      ),
      dbRequest(
        'offline_distribution_entries?select=*&order=entry_date.desc,created_at.desc'
      ),
      readSettings(),
      dbRequest(
        'organizations?select=id,organization_name&is_active=eq.true&order=sort_order.asc'
      )
    ]);

  const ps =
    (participants || []).filter(
      p =>
        a.role ===
          'super_admin' ||
        String(
          p.organization_id
        ) ===
          String(a.org)
    );

  const ids =
    new Set(
      ps.map(
        p => String(p.id)
      )
    );

  const rawDs =
    (diaries || []).filter(
      d =>
        ids.has(
          String(
            d.participant_id
          )
        )
    );

  const ph =
    (photos || []).filter(
      x =>
        ids.has(
          String(
            x.participant_id
          )
        )
    );

  const ss =
    (sites || []).filter(
      s =>
        adminAllowedSite(
          a,
          s
        )
    );

  const siteIds =
    new Set(
      ss.map(
        s => String(s.id)
      )
    );

  const es =
    (entries || []).filter(
      e =>
        siteIds.has(
          String(e.site_id)
        )
    );

  const actionName =
    Object.fromEntries(
      (actions || []).map(
        x => [
          x.action_code,
          x.action_name
        ]
      )
    );

  const diaryActionMap = {};

  for (
    const x of
      diaryActions || []
  ) {
    if (
      !diaryActionMap[
        x.diary_id
      ]
    ) {
      diaryActionMap[
        x.diary_id
      ] = [];
    }

    diaryActionMap[
      x.diary_id
    ].push({
      code:
        x.action_code,
      name:
        actionName[
          x.action_code
        ] ||
        x.action_code
    });
  }

  const ds =
    rawDs.map(
      d => ({
        ...d,
        actions:
          diaryActionMap[
            d.id
          ] || []
      })
    );

  const lastDiary = {};

  for (const d of ds) {
    const k =
      String(
        d.participant_id
      );

    if (
      !lastDiary[k] ||
      d.diary_date >
        lastDiary[k]
    ) {
      lastDiary[k] =
        d.diary_date;
    }
  }

  const today =
    await effectiveToday();

  const threeAgo =
    addDays(today, -3);

  const enriched =
    ps.map(p => {
      const pc =
        ph.filter(
          x =>
            String(
              x.participant_id
            ) ===
            String(p.id)
        ).length;

      const dc =
        ds.filter(
          x =>
            String(
              x.participant_id
            ) ===
            String(p.id)
        ).length;

      const needs =
        !p.is_completed &&
        (
          !lastDiary[
            String(p.id)
          ] ||
          lastDiary[
            String(p.id)
          ] <= threeAgo
        );

      const digits =
        String(
          p.phone || ''
        ).replace(
          /\D/g,
          ''
        );

      const phoneMasked =
        digits.replace(
          /^(010)(\d{4})(\d{4})$/,
          '$1-****-$3'
        );

      const {
        phone,
        ...rest
      } = p;

      return {
        ...rest,
        phone_masked:
          phoneMasked,
        contact_phone:
  a.role === 'super_admin'
    ? digits
    : (needs ? digits : null),
        diary_count:
          dc,
        photo_count:
          pc,
        last_diary_date:
          lastDiary[
            String(p.id)
          ] || null,
        needs_followup:
          needs
      };
    });

  const siteStats =
    ss.map(s => {
      const rows =
        es.filter(
          e =>
            String(
              e.site_id
            ) ===
            String(s.id)
        );

      const distributed =
        rows.reduce(
          (n, e) =>
            n +
            Number(
              e.distributed_qty ||
              0
            ),
          0
        );

      const submitted =
        rows.reduce(
          (n, e) =>
            n +
            Number(
              e.submitted_qty ||
              0
            ),
          0
        );

      return {
        ...s,
        distributed_qty:
          distributed,
        submitted_qty:
          submitted,
        remaining_qty:
          Math.max(
            0,
            Number(
              s.allocated_quantity ||
              0
            ) -
            distributed
          ),
        last_report_at:
          rows[0]?.created_at ||
          null
      };
    });

  const offlineTarget =
    Number(
      settings.OFFLINE_DIARY_TOTAL ||
      300
    );

  const offlineDistributed =
    siteStats.reduce(
      (n, s) =>
        n +
        s.distributed_qty,
      0
    );

  const offlineSubmitted =
    siteStats.reduce(
      (n, s) =>
        n +
        s.submitted_qty,
      0
    );

  const adminOrganizations = [
    ...(organizations || []).map(
      o => ({
        id:
          String(o.id),
        organization_name:
          o.organization_name
      })
    )
  ];

  for (
    const site of ss
  ) {
    if (
      !adminOrganizations.some(
        o =>
          String(o.id) ===
          String(
            site.organization_id
          )
      )
    ) {
      adminOrganizations.push({
        id:
          String(
            site.organization_id
          ),
        organization_name:
          site.organization_name
      });
    }
  }

  await audit(
    a,
    'read_dashboard',
    'dashboard',
    '',
    {
      participantCount:
        enriched.length
    }
  );

  return json({
    success: true,
    admin: a,
    settings: {
      ...settings,
      COURSE_28_OPEN:
        String(
          settings.COURSE_28_OPEN ||
          'false'
        )
    },
    organizations,
    adminOrganizations,
    stats: {
      onlineCount:
        enriched.length,
      completedCount:
        enriched.filter(
          p =>
            p.is_completed
        ).length,
      diaryCount:
        ds.length,
      photoCount:
        ph.length,
      followupCount:
        enriched.filter(
          p =>
            p.needs_followup
        ).length,
      offlineTarget,
      offlineDistributed,
      offlineRemaining:
        Math.max(
          0,
          offlineTarget -
          offlineDistributed
        ),
      offlineSubmitted
    },
    participants:
      enriched,
    diaries:
      ds,
    photos:
      ph.map(
        x => ({
          id:
            x.id,
          participant_id:
            x.participant_id,
          photo_no:
            x.photo_no,
          created_at:
            x.created_at
        })
      ),
    siteStats
  });
}

async function adminDistribution(request) {
  const a =
    await requireAdmin(request);

  const b =
    await bodyJson(request);

  const siteId =
    String(
      b.siteId || ''
    );

  const sites =
    await dbRequest(
      `offline_sites?select=*&id=eq.${q(siteId)}&is_active=eq.true&limit=1`
    );

  const site =
    sites?.[0];

  if (
    !site ||
    !adminAllowedSite(
      a,
      site
    )
  ) {
    throw Object.assign(
      new Error(
        '이 배포지점을 관리할 권한이 없습니다.'
      ),
      { status: 403 }
    );
  }

  const distributed =
    Math.max(
      0,
      Number(
        b.distributedQty || 0
      )
    );

  const submitted =
    Math.max(
      0,
      Number(
        b.submittedQty || 0
      )
    );

  if (
    !Number.isInteger(
      distributed
    ) ||
    !Number.isInteger(
      submitted
    ) ||
    (
      distributed === 0 &&
      submitted === 0
    )
  ) {
    throw new Error(
      '오늘 배포 또는 제출 수량을 입력해 주세요.'
    );
  }

  const entryDate =
    String(
      b.entryDate ||
      await effectiveToday()
    );

  await dbRequest(
    'offline_distribution_entries',
    {
      method: 'POST',
      headers: {
        Prefer:
          'return=minimal'
      },
      body:
        JSON.stringify({
          site_id:
            site.id,
          organization_id:
            String(
              site.organization_id ||
              ''
            ),
          entry_date:
            entryDate,
          distributed_qty:
            distributed,
          submitted_qty:
            submitted,
          note:
            String(
              b.note || ''
            )
              .trim()
              .slice(
                0,
                200
              ) ||
            null,
          entered_by_admin_id:
            String(a.sub)
        })
    }
  );

  await audit(
    a,
    'write_distribution',
    'offline_site',
    site.id,
    {
      distributed,
      submitted,
      entryDate
    }
  );

  return json({
    success: true,
    message:
      '배포·제출 수량을 등록했습니다.'
  });
}

async function adminUpdateSettings(request) {
  const a =
    await requireAdmin(request);

  if (
    a.role !==
    'super_admin'
  ) {
    throw Object.assign(
      new Error(
        '전체관리자만 설정을 변경할 수 있습니다.'
      ),
      { status: 403 }
    );
  }

  const b =
    await bodyJson(request);

  const allowed = [
    'APPLICATION_START_DATE',
    'APPLICATION_END_DATE',
    'ACTIVITY_START_DATE',
    'ACTIVITY_END_DATE',
    'ONLINE_APPLICATION_LIMIT',
    'OFFLINE_DIARY_TOTAL',
    'COURSE_28_OPEN'
  ];

  const updates =
    b.settings || {};

  const settingRows =
    allowed
      .filter(
        k =>
          updates[k] !==
          undefined
      )
      .map(k => ({
        setting_key:
          k,
        setting_value:
          String(
            updates[k]
          ),
        updated_at:
          new Date().toISOString()
      }));

  if (
    settingRows.length
  ) {
    await dbRequest(
      'app_settings?on_conflict=setting_key',
      {
        method: 'POST',
        headers: {
          Prefer:
            'resolution=merge-duplicates,return=minimal'
        },
        body:
          JSON.stringify(
            settingRows
          )
      }
    );
  }

  if (
    Array.isArray(
      b.siteAllocations
    )
  ) {
    for (
      const row of
        b.siteAllocations
    ) {
      const qty =
        Number(
          row.allocatedQuantity
        );

      if (
        Number.isInteger(qty) &&
        qty >= 0
      ) {
        await dbRequest(
          `offline_sites?id=eq.${q(row.siteId)}`,
          {
            method:
              'PATCH',
            headers: {
              Prefer:
                'return=minimal'
            },
            body:
              JSON.stringify({
                allocated_quantity:
                  qty,
                updated_at:
                  new Date().toISOString()
              })
          }
        );
      }
    }
  }

  await audit(
    a,
    'update_settings',
    'settings',
    '',
    {
      course28Open:
        String(
          updates.COURSE_28_OPEN ??
          ''
        )
    }
  );

  return json({
    success: true,
    message:
      '운영 설정을 저장했습니다.'
  });
}

async function adminCreateUser(request) {
  const a =
    await requireAdmin(request);

  if (
    a.role !==
    'super_admin'
  ) {
    throw Object.assign(
      new Error(
        '전체관리자만 기관관리자 계정을 만들 수 있습니다.'
      ),
      { status: 403 }
    );
  }

  const b =
    await bodyJson(request);

  const email =
    String(
      b.email || ''
    )
      .trim()
      .toLowerCase();

  const name =
    String(
      b.displayName || ''
    ).trim();

  const password =
    String(
      b.password || ''
    );

  const org =
    String(
      b.organizationId || ''
    ).trim();

  if (
    !/^\S+@\S+\.\S+$/.test(email) ||
    !name ||
    password.length < 10 ||
    !org
  ) {
    throw new Error(
      '기관관리자 정보를 모두 입력해 주세요. 비밀번호는 10자 이상입니다.'
    );
  }

  const exists =
    await dbRequest(
      `admin_users?select=id&email=eq.${q(email)}&limit=1`
    );

  if (
    exists?.length
  ) {
    throw new Error(
      '이미 등록된 관리자 이메일입니다.'
    );
  }

  const h =
    await hashValue(password);

  await dbRequest(
    'admin_users',
    {
      method: 'POST',
      headers: {
        Prefer:
          'return=minimal'
      },
      body:
        JSON.stringify({
          email,
          display_name:
            name,
          password_hash:
            h.hash,
          password_salt:
            h.salt,
          role:
            'org_admin',
          organization_id:
            org,
          is_active:
            true
        })
    }
  );

  await audit(
    a,
    'create_admin',
    'admin_user',
    '',
    {
      email,
      org
    }
  );

  return json({
    success: true,
    message:
      '기관관리자 계정을 만들었습니다.'
  });
}

async function adminCancelParticipant(request) {
  const a =
    await requireAdmin(request);

  const b =
    await bodyJson(request);

  const id =
    String(
      b.participantId || ''
    ).trim();

  if (!id) {
    throw new Error(
      '취소할 참가자를 선택해 주세요.'
    );
  }

  const rows =
    await dbRequest(
      `participants?select=id,display_name,organization_id,status&id=eq.${q(id)}&limit=1`
    );

  const p =
    rows?.[0];

  if (!p) {
    throw new Error(
      '참가자를 찾을 수 없습니다.'
    );
  }

  if (
    a.role ===
      'org_admin' &&
    String(
      p.organization_id
    ) !==
      String(a.org)
  ) {
    throw Object.assign(
      new Error(
        '이 참가자의 신청을 취소할 권한이 없습니다.'
      ),
      { status: 403 }
    );
  }

  if (
    p.status ===
    'cancelled'
  ) {
    return json({
      success: true,
      message:
        '이미 취소된 신청입니다.'
    });
  }

  await dbRequest(
    `participants?id=eq.${q(id)}`,
    {
      method: 'PATCH',
      headers: {
        Prefer:
          'return=minimal'
      },
      body:
        JSON.stringify({
          status:
            'cancelled'
        })
    }
  );

  await audit(
    a,
    'cancel_participant',
    'participant',
    id,
    {
      displayName:
        p.display_name
    }
  );

  return json({
    success: true,
    message:
      `${p.display_name}님의 신청을 취소했습니다.`
  });
}

async function adminPhoto(
  request,
  id
) {
  const a =
    await requireAdmin(request);

  const rows =
    await dbRequest(
      `completion_photos?select=id,participant_id,storage_path&id=eq.${q(id)}&limit=1`
    );

  const photo =
    rows?.[0];

  if (!photo) {
    throw new Error(
      '사진을 찾을 수 없습니다.'
    );
  }

  const ps =
    await dbRequest(
      `participants?select=organization_id&id=eq.${q(photo.participant_id)}&limit=1`
    );

  if (
    a.role ===
      'org_admin' &&
    String(
      ps?.[0]?.organization_id
    ) !==
      String(a.org)
  ) {
    throw Object.assign(
      new Error(
        '이 사진을 볼 권한이 없습니다.'
      ),
      { status: 403 }
    );
  }

  const url =
    await signedPhotoUrl(
      photo.storage_path
    );

  await audit(
    a,
    'view_photo',
    'completion_photo',
    id
  );

  return json({
    success: true,
    url
  });
}

export async function GET(request) {
  try {
    const p =
      pathParts(request);

    const key =
      p.join('/');

    if (
      key ===
      'public-data'
    ) {
      return publicData();
    }

    if (
      key ===
      'dashboard'
    ) {
      return participantDashboard(
        request
      );
    }

    if (
      key ===
      'admin/data'
    ) {
      return adminDashboard(
        request
      );
    }

    if (
      key.startsWith(
        'admin/photo/'
      )
    ) {
      return adminPhoto(
        request,
        p[2]
      );
    }

    return json(
      {
        success: false,
        message:
          'Not found'
      },
      404
    );
  } catch (e) {
    return err(e, 500);
  }
}

export async function POST(request) {
  try {
    const p =
      pathParts(request);

    const key =
      p.join('/');

    if (
      key ===
      'register'
    ) {
      return register(
        request
      );
    }

    if (
      key ===
      'login'
    ) {
      return participantLogin(
        request
      );
    }

    if (
      key ===
      'diaries'
    ) {
      return saveDiary(
        request
      );
    }

    if (
      key ===
      'completion-photos'
    ) {
      return completionPhotos(
        request
      );
    }

    if (
      key ===
      'admin/bootstrap'
    ) {
      return adminBootstrap(
        request
      );
    }

    if (
      key ===
      'admin/login'
    ) {
      return adminLogin(
        request
      );
    }

    if (
      key ===
      'admin/distribution'
    ) {
      return adminDistribution(
        request
      );
    }

    if (
      key ===
      'admin/settings'
    ) {
      return adminUpdateSettings(
        request
      );
    }

    if (
      key ===
      'admin/create-user'
    ) {
      return adminCreateUser(
        request
      );
    }

    if (
      key ===
      'admin/cancel-participant'
    ) {
      return adminCancelParticipant(
        request
      );
    }

    return json(
      {
        success: false,
        message:
          'Not found'
      },
      404
    );
  } catch (e) {
    return err(e, 400);
  }
}

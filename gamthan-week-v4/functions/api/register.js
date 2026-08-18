import {
  addDays, dbRequest, effectiveToday, friendlyError, hashPin, json, methodNotAllowed,
  normalizePhone, readSettings, validPhone,
} from '../../src/server.js';

export async function onRequest(context) {
  if (context.request.method !== 'POST') return methodNotAllowed();
  try {
    const body = await context.request.json();
    const displayName = String(body.displayName || '').trim();
    const phone = normalizePhone(body.phone);
    const organizationId = String(body.organizationId || '').trim();
    const courseDays = Number(body.courseDays);
    const startDate = String(body.startDate || '').trim();
    const privacyConsent = body.privacyConsent === true;

    if (!displayName || displayName.length > 30) throw new Error('이름 또는 별명을 30자 이내로 입력해 주세요.');
    if (!validPhone(phone)) throw new Error('휴대전화번호를 010-1234-5678 형식으로 입력해 주세요.');
    if (![7, 14, 21, 28].includes(courseDays)) throw new Error('참여 코스를 선택해 주세요.');
    if (!organizationId) throw new Error('소속기관을 선택해 주세요.');
    if (!privacyConsent) throw new Error('개인정보 수집·이용 동의가 필요합니다.');

    const [settings, today] = await Promise.all([readSettings(context.env), effectiveToday(context.env)]);
    const devMode = Boolean(String(settings.DEV_TEST_DATE || '').trim());
    if (!devMode && (today < settings.APPLICATION_START_DATE || today > settings.APPLICATION_END_DATE)) {
      throw new Error('현재는 온라인 신청 기간이 아닙니다.');
    }
    if (startDate < settings.ACTIVITY_START_DATE || addDays(startDate, courseDays - 1) > settings.ACTIVITY_END_DATE) {
      throw new Error('선택한 코스가 전체 실천기간 안에 끝나도록 시작일을 선택해 주세요.');
    }

    const orgRows = await dbRequest(context.env, `organizations?select=id,organization_name&id=eq.${encodeURIComponent(organizationId)}&is_active=eq.true&limit=1`);
    if (!orgRows?.[0]) throw new Error('유효한 소속기관을 선택해 주세요.');

    const existing = await dbRequest(context.env, `participants?select=id&phone=eq.${encodeURIComponent(phone)}&limit=1`);
    if (existing.length) throw new Error('이미 신청된 휴대전화번호입니다.');

    const pin = phone.slice(-4);
    const secured = await hashPin(pin);
    const rows = await dbRequest(context.env, 'participants', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        display_name: displayName,
        phone,
        pin_hash: secured.hash,
        pin_salt: secured.salt,
        organization_id: organizationId,
        course_days: courseDays,
        start_date: startDate,
        end_date: startDate,
        registration_source: 'online',
        status: today < startDate ? 'scheduled' : 'active',
        privacy_consent: true,
        privacy_consent_at: new Date().toISOString(),
        privacy_consent_version: '2026-08-v1',
      }),
    });

    return json({
      success: true,
      message: '감탄위크 참여 신청이 완료되었습니다.',
      participantCode: rows?.[0]?.participant_code || '',
      startDate,
      endDate: addDays(startDate, courseDays - 1),
    });
  } catch (error) {
    return json({ success: false, message: friendlyError(error) }, error.status || 400);
  }
}

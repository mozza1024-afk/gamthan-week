import {
  createSession, dbRequest, getParticipantByPhone, json, methodNotAllowed,
  normalizePhone, validPhone, validPin,
} from '../../src/server.js';

export async function onRequest(context) {
  if (context.request.method !== 'POST') return methodNotAllowed();
  try {
    const body = await context.request.json();
    const phone = normalizePhone(body.phone);
    const pin = String(body.pin || '').trim();
    if (!validPhone(phone) || !validPin(pin)) throw new Error('휴대전화번호와 숫자 4자리 비밀번호를 확인해 주세요.');

    const participant = await getParticipantByPhone(context.env, phone);
    if (!participant || participant.status === 'cancelled') throw new Error('신청정보를 확인할 수 없습니다.');

    if (participant.locked_until && new Date(participant.locked_until).getTime() > Date.now()) {
      throw new Error('로그인 시도가 여러 번 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }

    const ok = pin === phone.slice(-4);
    if (!ok) {
      const nextCount = Number(participant.failed_login_count || 0) + 1;
      const patch = { failed_login_count: nextCount };
      if (nextCount >= 5) {
        patch.failed_login_count = 0;
        patch.locked_until = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      }
      await dbRequest(context.env, `participants?id=eq.${participant.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(patch),
      });
      throw new Error('휴대전화번호 또는 비밀번호가 일치하지 않습니다.');
    }

    await dbRequest(context.env, `participants?id=eq.${participant.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ failed_login_count: 0, locked_until: null }),
    });

    const token = await createSession(context.env, participant.id);
    return json({ success: true, token });
  } catch (error) {
    return json({ success: false, message: error.message }, error.status || 400);
  }
}

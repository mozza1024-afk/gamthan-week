import {
  dbRequest, effectiveToday, getActionMap, getDiaryRows, getParticipant,
  json, methodNotAllowed, participantStatus, refreshProgress, verifySession,
} from '../../src/server.js';

export async function onRequest(context) {
  if (!['POST', 'GET'].includes(context.request.method)) return methodNotAllowed();
  try {
    const session = await verifySession(context.env, context.request);
    const participant = await getParticipant(context.env, session.sub);
    if (!participant) throw new Error('참여자 정보를 찾을 수 없습니다.');

    if (context.request.method === 'GET') {
      return json({ success: true, diaries: await getDiaryRows(context.env, participant.id) });
    }

    const today = await effectiveToday(context.env);
    if (participantStatus(participant, today) !== 'active') throw new Error('오늘은 감탄일기를 작성할 수 있는 참여기간이 아닙니다.');

    const body = await context.request.json();
    const diaryText = String(body.diaryText || '').trim();
    const actionCodes = Array.from(new Set((body.actionCodes || []).map(String)));
    const otherActionText = String(body.otherActionText || '').trim();
    if (diaryText.length < 10 || diaryText.length > 500) throw new Error('감탄일기는 10자 이상 500자 이하로 작성해 주세요.');
    if (!actionCodes.length) throw new Error('오늘 실천한 행동을 하나 이상 선택해 주세요.');

    const actionMap = await getActionMap(context.env);
    if (actionCodes.some((code) => !actionMap[code])) throw new Error('실천항목을 다시 선택해 주세요.');
    if (actionCodes.includes('ACT08') && !otherActionText) throw new Error('기타 활동 내용을 입력해 주세요.');

    const existing = await dbRequest(context.env, `diaries?select=id&participant_id=eq.${participant.id}&diary_date=eq.${today}&limit=1`);
    let diaryId;
    if (existing?.[0]) {
      diaryId = existing[0].id;
      await dbRequest(context.env, `diaries?id=eq.${diaryId}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ diary_text: diaryText, other_action_text: otherActionText || null }),
      });
      await dbRequest(context.env, `diary_actions?diary_id=eq.${diaryId}`, { method: 'DELETE' });
    } else {
      const rows = await dbRequest(context.env, 'diaries', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          participant_id: participant.id,
          diary_date: today,
          day_number: 1,
          diary_text: diaryText,
          other_action_text: otherActionText || null,
        }),
      });
      diaryId = rows[0].id;
    }

    await dbRequest(context.env, 'diary_actions', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(actionCodes.map((code) => ({ diary_id: diaryId, action_code: code }))),
    });
    await refreshProgress(context.env, participant.id);

    return json({ success: true, message: existing?.[0] ? '오늘의 감탄일기를 수정했습니다.' : '오늘의 감탄일기를 저장했습니다.' });
  } catch (error) {
    return json({ success: false, message: error.message }, error.status || 400);
  }
}

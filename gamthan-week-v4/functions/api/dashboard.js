import {
  dbRequest, effectiveToday, getActionMap, getDiaryActionRows, getDiaryRows,
  getParticipant, json, methodNotAllowed, participantStatus, verifySession,
} from '../../src/server.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') return methodNotAllowed();
  try {
    const session = await verifySession(context.env, context.request);
    const [participant, today] = await Promise.all([
      getParticipant(context.env, session.sub),
      effectiveToday(context.env),
    ]);
    if (!participant || participant.status === 'cancelled') throw new Error('참여자 정보를 찾을 수 없습니다.');

    const diaries = await getDiaryRows(context.env, participant.id);
    const [diaryActions, actionMap, photos] = await Promise.all([
      getDiaryActionRows(context.env, diaries.map((d) => d.id)),
      getActionMap(context.env),
      dbRequest(context.env, `completion_photos?select=id,photo_no,created_at&participant_id=eq.${participant.id}&order=photo_no.asc`),
    ]);

    const actionsByDiary = {};
    for (const row of diaryActions) {
      if (!actionsByDiary[row.diary_id]) actionsByDiary[row.diary_id] = [];
      actionsByDiary[row.diary_id].push({ code: row.action_code, name: actionMap[row.action_code] || row.action_code });
    }

    const status = participantStatus(participant, today);
    const todayDiary = diaries.find((d) => d.diary_date === today) || null;
    const canWriteToday = status === 'active';
    const diaryComplete = diaries.length >= Number(participant.course_days);

    return json({
      success: true,
      today,
      participant: {
        id: participant.id,
        displayName: participant.display_name,
        organizationName: participant.organization_name_snapshot,
        courseDays: participant.course_days,
        startDate: participant.start_date,
        endDate: participant.end_date,
        status,
        completedDays: diaries.length,
        progressPercent: Math.min(100, Math.round((diaries.length / participant.course_days) * 100)),
        isCompleted: participant.is_completed,
        photoCount: photos.length,
      },
      canWriteToday,
      todayDiary: todayDiary ? { ...todayDiary, actions: actionsByDiary[todayDiary.id] || [] } : null,
      diaries: diaries.map((d) => ({ ...d, actions: actionsByDiary[d.id] || [] })),
      completion: {
        diaryComplete,
        canUploadPhotos: diaryComplete && photos.length < 3,
        photoCount: photos.length,
        needsPhoto: diaryComplete && photos.length === 0,
        complete: participant.is_completed === true,
      },
    });
  } catch (error) {
    return json({ success: false, message: error.message }, error.status || 500);
  }
}

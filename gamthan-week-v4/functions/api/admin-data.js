import {
  dbRequestPaged, effectiveToday, getActionMap, json, methodNotAllowed,
  participantStatus, verifyAdminSession,
} from '../../src/server.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') return methodNotAllowed();
  try {
    await verifyAdminSession(context.env, context.request);
    const [participants, diaries, diaryActions, photos, actionMap, today] = await Promise.all([
      dbRequestPaged(context.env, 'participants?select=*&registration_source=eq.online&order=created_at.desc'),
      dbRequestPaged(context.env, 'diaries?select=id,participant_id,diary_date,day_number,diary_text,other_action_text,created_at,updated_at&order=diary_date.asc'),
      dbRequestPaged(context.env, 'diary_actions?select=diary_id,action_code'),
      dbRequestPaged(context.env, 'completion_photos?select=id,participant_id,photo_no,storage_path,original_file_name,mime_type,file_size_bytes,created_at&order=participant_id.asc,photo_no.asc'),
      getActionMap(context.env),
      effectiveToday(context.env),
    ]);

    const actionsByDiary = {};
    for (const row of diaryActions) {
      (actionsByDiary[row.diary_id] ||= []).push({
        code: row.action_code,
        name: actionMap[row.action_code] || row.action_code,
      });
    }

    const diariesByParticipant = {};
    for (const d of diaries) {
      (diariesByParticipant[d.participant_id] ||= []).push({
        id: d.id,
        diaryDate: d.diary_date,
        dayNumber: d.day_number,
        diaryText: d.diary_text,
        otherActionText: d.other_action_text || '',
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        actions: actionsByDiary[d.id] || [],
      });
    }

    const photosByParticipant = {};
    for (const p of photos) {
      (photosByParticipant[p.participant_id] ||= []).push({
        id: p.id,
        photoNo: p.photo_no,
        fileName: p.original_file_name || `photo-${p.photo_no}`,
        mimeType: p.mime_type,
        fileSizeBytes: p.file_size_bytes,
        createdAt: p.created_at,
      });
    }

    const rows = participants.map((p) => {
      const participantDiaries = diariesByParticipant[p.id] || [];
      const participantPhotos = photosByParticipant[p.id] || [];
      const status = participantStatus(p, today);
      return {
        id: p.id,
        participantCode: p.participant_code || '',
        displayName: p.display_name,
        phone: p.phone,
        organizationName: p.organization_name_snapshot || '',
        courseDays: p.course_days,
        startDate: p.start_date,
        endDate: p.end_date,
        status,
        completedDays: participantDiaries.length,
        photoCount: participantPhotos.length,
        isCompleted: p.is_completed === true,
        registeredAt: p.created_at,
        diaries: participantDiaries,
        photos: participantPhotos,
      };
    });

    const valid = rows.filter((r) => r.status !== 'cancelled');
    const stats = {
      total: valid.length,
      completed: valid.filter((r) => r.isCompleted).length,
      active: valid.filter((r) => r.status === 'active').length,
      scheduled: valid.filter((r) => r.status === 'scheduled').length,
      ended: valid.filter((r) => r.status === 'ended').length,
      cancelled: rows.filter((r) => r.status === 'cancelled').length,
      diaries: diaries.length,
      photos: photos.length,
    };

    return json({ success: true, today, stats, participants: rows });
  } catch (error) {
    return json({ success: false, message: error.message }, error.status || 500);
  }
}

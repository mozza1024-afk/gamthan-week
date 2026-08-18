import {
  dbRequest, getDiaryRows, getParticipant, json, methodNotAllowed,
  refreshProgress, sanitizeFileName, uploadPrivatePhoto, verifySession,
} from '../../src/server.js';

export async function onRequest(context) {
  if (context.request.method !== 'POST') return methodNotAllowed();
  try {
    const session = await verifySession(context.env, context.request);
    const participant = await getParticipant(context.env, session.sub);
    if (!participant) throw new Error('참여자 정보를 찾을 수 없습니다.');

    const diaries = await getDiaryRows(context.env, participant.id);
    if (diaries.length < Number(participant.course_days)) throw new Error('선택한 코스의 감탄일기를 모두 작성한 뒤 인증사진을 등록할 수 있습니다.');

    const existing = await dbRequest(context.env, `completion_photos?select=id,photo_no&participant_id=eq.${participant.id}&order=photo_no.asc`);
    if (existing.length >= 3) throw new Error('인증사진은 최대 3장까지 등록할 수 있습니다.');

    const form = await context.request.formData();
    const files = form.getAll('photos').filter((v) => typeof v !== 'string');
    if (!files.length) throw new Error('완주 인증사진을 1장 이상 선택해 주세요.');
    if (files.length > 3) throw new Error('사진은 최대 3장까지 선택할 수 있습니다.');
    if (existing.length + files.length > 3) throw new Error(`현재 ${existing.length}장이 등록되어 있습니다. 총 3장까지만 등록할 수 있습니다.`);

    let nextNo = existing.length + 1;
    const saved = [];
    for (const file of files) {
      const mime = String(file.type || '');
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw new Error('JPG, PNG, WebP 사진만 등록할 수 있습니다.');
      if (file.size > 1024 * 1024) throw new Error('압축 후 사진 1장의 용량은 1MB 이하여야 합니다.');

      const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
      const path = `${participant.id}/${Date.now()}-${nextNo}.${ext}`;
      await uploadPrivatePhoto(context.env, path, file, mime);
      await dbRequest(context.env, 'completion_photos', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          participant_id: participant.id,
          photo_no: nextNo,
          storage_path: path,
          original_file_name: sanitizeFileName(file.name),
          mime_type: mime,
          file_size_bytes: file.size,
        }),
      });
      saved.push(nextNo);
      nextNo++;
    }

    await refreshProgress(context.env, participant.id);
    return json({ success: true, message: '완주 인증사진을 등록했습니다.', savedCount: saved.length });
  } catch (error) {
    return json({ success: false, message: error.message }, error.status || 400);
  }
}

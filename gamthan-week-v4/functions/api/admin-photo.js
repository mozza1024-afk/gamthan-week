import {
  createSignedPhotoUrl, dbRequest, json, methodNotAllowed, verifyAdminSession,
} from '../../src/server.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') return methodNotAllowed();
  try {
    await verifyAdminSession(context.env, context.request);
    const url = new URL(context.request.url);
    const id = String(url.searchParams.get('id') || '').trim();
    const download = url.searchParams.get('download') === '1';
    if (!id) throw new Error('사진 정보를 확인할 수 없습니다.');

    const rows = await dbRequest(context.env, `completion_photos?select=id,storage_path,original_file_name&id=eq.${encodeURIComponent(id)}&limit=1`);
    const photo = rows?.[0];
    if (!photo) throw new Error('사진 정보를 찾을 수 없습니다.');
    const signedUrl = await createSignedPhotoUrl(
      context.env,
      photo.storage_path,
      300,
      download ? (photo.original_file_name || 'completion-photo.jpg') : '',
    );
    return json({ success: true, url: signedUrl, expiresIn: 300 });
  } catch (error) {
    return json({ success: false, message: error.message }, error.status || 400);
  }
}

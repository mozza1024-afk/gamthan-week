import {
  createAdminSession, json, methodNotAllowed, verifyAdminPassword,
} from '../../src/server.js';

export async function onRequest(context) {
  if (context.request.method !== 'POST') return methodNotAllowed();
  try {
    const body = await context.request.json();
    const password = String(body.password || '');
    if (!password) throw new Error('관리자 비밀번호를 입력해 주세요.');
    const ok = await verifyAdminPassword(context.env, password);
    if (!ok) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      throw new Error('관리자 비밀번호가 일치하지 않습니다.');
    }
    const token = await createAdminSession(context.env);
    return json({ success: true, token, expiresInHours: 8 });
  } catch (error) {
    return json({ success: false, message: error.message }, error.status || 401);
  }
}

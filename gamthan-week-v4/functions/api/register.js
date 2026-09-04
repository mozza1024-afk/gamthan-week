import {
  json,
  methodNotAllowed,
} from '../../src/server.js';

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return methodNotAllowed();
  }

  return json(
    {
      success: false,
      message:
        '이전 감탄위크 신청 페이지의 접수가 종료되었습니다. 새 감탄위크 페이지에서 신청해 주세요: https://gamthan-week.vercel.app'
    },
    410
  );
}

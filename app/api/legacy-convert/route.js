import {
  dbRequest,
  hashValue,
  json,
  normalizePhone,
  validBirth6,
  validPhone,
  verifyHash,
} from '../../../lib/server.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function q(v) {
  return encodeURIComponent(String(v ?? ''));
}

function responseError(message, status = 400) {
  return json({ success: false, message }, status);
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    const phone = normalizePhone(body.phone);
    const oldPin = String(body.oldPin || '').replace(/\D/g, '');
    const birth6 = String(body.birth6 || '').replace(/\D/g, '');

    if (!validPhone(phone)) {
      return responseError('휴대전화번호를 확인해 주세요.');
    }

    if (!/^\d{4}$/.test(oldPin)) {
      return responseError(
        '기존 비밀번호인 휴대전화번호 뒤 4자리를 입력해 주세요.'
      );
    }

    if (!validBirth6(birth6)) {
      return responseError(
        '생년월일 6자리를 확인해 주세요. 예: 900101'
      );
    }

    const rows = await dbRequest(
      `participants?select=id,status,signup_site,privacy_consent_version,pin_hash,pin_salt,birth_hash,birth_salt,failed_login_count,locked_until&phone=eq.${q(phone)}&limit=1`
    );

    const participant = rows?.[0];

    if (!participant || participant.status === 'cancelled') {
      return responseError(
        '신청정보를 확인할 수 없습니다.',
        404
      );
    }

    const isLegacy =
      participant.signup_site === 'cloudflare_legacy' ||
      participant.privacy_consent_version === '2026-08-v1';

    if (!isLegacy) {
      return responseError(
        '현재 공식사이트에서 신청한 번호입니다. 로그인 방식 변경이 필요하지 않습니다.',
        409
      );
    }

    if (
      participant.locked_until &&
      new Date(participant.locked_until).getTime() > Date.now()
    ) {
      return responseError(
        '본인확인 시도가 여러 번 실패했습니다. 10분 후 다시 시도해 주세요.',
        429
      );
    }

    const oldPinOk = await verifyHash(
      oldPin,
      participant.pin_hash,
      participant.pin_salt
    );

    if (!oldPinOk) {
      const failed =
        Number(participant.failed_login_count || 0) + 1;

      const patch =
        failed >= 5
          ? {
              failed_login_count: 0,
              locked_until: new Date(
                Date.now() + 10 * 60 * 1000
              ).toISOString(),
            }
          : {
              failed_login_count: failed,
            };

      await dbRequest(
        `participants?id=eq.${q(participant.id)}`,
        {
          method: 'PATCH',
          headers: {
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(patch),
        }
      );

      return responseError(
        '휴대전화번호 또는 기존 비밀번호(휴대전화 뒤 4자리)가 일치하지 않습니다.',
        401
      );
    }

    // 기존 비밀번호 확인에 성공했으므로 실패횟수 초기화
    await dbRequest(
      `participants?id=eq.${q(participant.id)}`,
      {
        method: 'PATCH',
        headers: {
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          failed_login_count: 0,
          locked_until: null,
        }),
      }
    );

    // 이미 전환한 사람
    if (
      participant.birth_hash &&
      participant.birth_salt
    ) {
      const birthOk = await verifyHash(
        birth6,
        participant.birth_hash,
        participant.birth_salt
      );

      if (!birthOk) {
        return responseError(
          '이미 로그인 방식이 변경된 신청입니다. 등록한 생년월일이 기억나지 않으면 운영기관으로 문의해 주세요.',
          409
        );
      }

      return json({
        success: true,
        alreadyConverted: true,
        message:
          '이미 새 로그인 방식으로 변경되어 있습니다. 이제 휴대전화번호와 생년월일 6자리로 로그인해 주세요.',
      });
    }

    // 최초 전환
    const secured = await hashValue(birth6);

    await dbRequest(
      `participants?id=eq.${q(participant.id)}`,
      {
        method: 'PATCH',
        headers: {
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          birth_hash: secured.hash,
          birth_salt: secured.salt,
          failed_login_count: 0,
          locked_until: null,
        }),
      }
    );

    return json({
      success: true,
      message:
        '로그인 방식 변경이 완료되었습니다. 이제 휴대전화번호와 생년월일 6자리로 로그인해 주세요.',
    });

  } catch (error) {
    return responseError(
      error?.message ||
        '로그인 방식 변경 중 오류가 발생했습니다.',
      error?.status || 500
    );
  }
}

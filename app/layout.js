import './globals.css';

export const metadata = {
  metadataBase: new URL(
    'https://gamthan-week.vercel.app'
  ),
  title:
    '감탄위크 마라톤–나의 감탄일기',
  description:
    '7·14·21·28일, 오늘의 작은 탄소중립 실천을 기록하고 함께 완주해요.',
  openGraph: {
    title:
      '감탄위크 마라톤 | 나의 감탄일기',
    description:
      '7·14·21·28일, 오늘의 작은 탄소중립 실천을 기록하고 함께 완주해요.',
    type: 'website',
    siteName:
      '온기동행 × 명륜종합사회복지관',
    images: [
      'https://raw.githubusercontent.com/mozza1024-afk/gamthan-week/main/gamthan-week-v4/public/assets/share-preview.png'
    ],
  },
};

export default function RootLayout({
  children
}) {
  return (
    <html lang="ko">
      <body>
        {children}

        <button
          id="legacy-convert-open"
          type="button"
          style={{
            display: 'none',
            position: 'fixed',
            left: '16px',
            right: '16px',
            bottom: '16px',
            zIndex: 9000,
            maxWidth: '520px',
            margin: '0 auto',
            padding: '15px 16px',
            border: '2px solid #d6a400',
            borderRadius: '14px',
            background: '#ffe38a',
            color: '#294b32',
            fontSize: '15px',
            fontWeight: '800',
            lineHeight: 1.45,
            boxShadow:
              '0 6px 22px rgba(0,0,0,.2)',
            cursor: 'pointer',
          }}
        >
          <span style={{ display: 'block' }}>
            🔐 휴대전화번호 뒤 4자리로 로그인하셨나요?
          </span>

          <span
            style={{
              display: 'block',
              marginTop: '3px',
              fontSize: '13px'
            }}
          >
            생년월일 6자리 로그인으로 변경하기 →
          </span>
        </button>

        <div
          id="legacy-convert-modal"
          style={{
            display: 'none',
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background:
              'rgba(0,0,0,.55)',
            padding: '20px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              maxWidth: '500px',
              margin: '40px auto',
              padding: '24px',
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow:
                '0 8px 30px rgba(0,0,0,.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'flex-start',
                gap: '10px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '800',
                    color: '#31824d',
                  }}
                >
                  감탄위크 실천마라톤
                </div>

                <h2
                  style={{
                    margin: '5px 0 8px',
                    fontSize: '22px',
                  }}
                >
                  생년월일 로그인으로 변경
                </h2>
              </div>

              <button
                id="legacy-convert-close"
                type="button"
                style={{
                  border: 0,
                  background:
                    'transparent',
                  fontSize: '25px',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            <p
              style={{
                lineHeight: 1.6,
                margin: '0 0 18px',
              }}
            >
              휴대전화번호 뒤 4자리로 로그인하셨다면,
              현재 로그인 방식이 생년월일 6자리로 변경되어
              <strong>
                {' '}한 번의 로그인 전환이 필요합니다.
              </strong>
              <br />
              <strong>
                재신청은 하지 않으셔도 됩니다.
              </strong>
            </p>

            <div
              style={{
                padding: '13px',
                marginBottom: '18px',
                background: '#fff7d6',
                borderRadius: '12px',
                fontSize: '14px',
                lineHeight: 1.6,
              }}
            >
              휴대전화번호와 기존 비밀번호인
              <strong>
                {' '}휴대전화번호 뒤 4자리
              </strong>
              로 본인확인 후,
              <strong>
                {' '}생년월일 6자리
              </strong>
              를 등록해 주세요.
            </div>

            <form
              id="legacy-convert-form"
            >
              <label
                style={{
                  display: 'block',
                  margin: '12px 0 6px',
                  fontWeight: '700',
                }}
              >
                휴대전화번호
              </label>

              <input
                id="legacy-phone"
                type="tel"
                inputMode="tel"
                required
                placeholder="010-1234-5678"
                style={{
                  boxSizing:
                    'border-box',
                  width: '100%',
                  padding: '13px',
                  border:
                    '1px solid #ccc',
                  borderRadius:
                    '10px',
                  fontSize: '16px',
                }}
              />

              <label
                style={{
                  display: 'block',
                  margin: '12px 0 6px',
                  fontWeight: '700',
                }}
              >
                기존 비밀번호
              </label>

              <input
                id="legacy-pin"
                type="password"
                inputMode="numeric"
                maxLength="4"
                required
                placeholder="휴대전화번호 뒤 4자리"
                style={{
                  boxSizing:
                    'border-box',
                  width: '100%',
                  padding: '13px',
                  border:
                    '1px solid #ccc',
                  borderRadius:
                    '10px',
                  fontSize: '16px',
                }}
              />

              <label
                style={{
                  display: 'block',
                  margin: '12px 0 6px',
                  fontWeight: '700',
                }}
              >
                생년월일 6자리
              </label>

              <input
                id="legacy-birth"
                type="password"
                inputMode="numeric"
                maxLength="6"
                required
                placeholder="예: 650326"
                style={{
                  boxSizing:
                    'border-box',
                  width: '100%',
                  padding: '13px',
                  border:
                    '1px solid #ccc',
                  borderRadius:
                    '10px',
                  fontSize: '16px',
                }}
              />

              <label
                style={{
                  display: 'block',
                  margin: '12px 0 6px',
                  fontWeight: '700',
                }}
              >
                생년월일 6자리 확인
              </label>

              <input
                id="legacy-birth-confirm"
                type="password"
                inputMode="numeric"
                maxLength="6"
                required
                placeholder="한 번 더 입력"
                style={{
                  boxSizing:
                    'border-box',
                  width: '100%',
                  padding: '13px',
                  border:
                    '1px solid #ccc',
                  borderRadius:
                    '10px',
                  fontSize: '16px',
                }}
              />

              <button
                id="legacy-submit"
                type="submit"
                style={{
                  width: '100%',
                  marginTop: '18px',
                  padding: '14px',
                  border: 0,
                  borderRadius: '12px',
                  background: '#29854b',
                  color: '#fff',
                  fontWeight: '800',
                  fontSize: '16px',
                  cursor: 'pointer',
                }}
              >
                생년월일 로그인으로 변경하기
              </button>
            </form>

            <div
              id="legacy-result"
              style={{
                display: 'none',
                marginTop: '16px',
                padding: '14px',
                borderRadius: '12px',
                lineHeight: 1.6,
                fontWeight: '700',
              }}
            />

            <p
              style={{
                margin: '20px 0 0',
                textAlign: 'center',
                color: '#777',
                fontSize: '13px',
              }}
            >
              문의 070-4398-4401
            </p>
          </div>
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  function startLegacyConvert() {
    const openBtn =
      document.getElementById('legacy-convert-open');
    const modal =
      document.getElementById('legacy-convert-modal');
    const closeBtn =
      document.getElementById('legacy-convert-close');
    const form =
      document.getElementById('legacy-convert-form');
    const submitBtn =
      document.getElementById('legacy-submit');
    const result =
      document.getElementById('legacy-result');

    if (
      !openBtn ||
      !modal ||
      !closeBtn ||
      !form
    ) {
      return;
    }

    function updateVisibility() {
      const isParticipantPage =
        window.location.pathname === '/';

      const loggedIn =
        !!window.localStorage.getItem(
          'gamthan_token'
        );

      openBtn.style.display =
        isParticipantPage && !loggedIn
          ? 'block'
          : 'none';
    }

    updateVisibility();

    window.setInterval(
      updateVisibility,
      1000
    );

    openBtn.addEventListener(
      'click',
      function () {
        modal.style.display = 'block';
        result.style.display = 'none';
        document.body.style.overflow =
          'hidden';
      }
    );

    function closeModal() {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }

    closeBtn.addEventListener(
      'click',
      closeModal
    );

    modal.addEventListener(
      'click',
      function (event) {
        if (event.target === modal) {
          closeModal();
        }
      }
    );

    form.addEventListener(
      'submit',
      async function (event) {
        event.preventDefault();

        const phone =
          document.getElementById(
            'legacy-phone'
          ).value;

        const oldPin =
          document.getElementById(
            'legacy-pin'
          ).value.replace(/\\D/g, '');

        const birth6 =
          document.getElementById(
            'legacy-birth'
          ).value.replace(/\\D/g, '');

        const confirm =
          document.getElementById(
            'legacy-birth-confirm'
          ).value.replace(/\\D/g, '');

        result.style.display =
          'block';

        if (oldPin.length !== 4) {
          result.style.background =
            '#fff0f0';

          result.textContent =
            '⚠️ 기존 비밀번호인 휴대전화번호 뒤 4자리를 입력해 주세요.';

          return;
        }

        if (
          birth6.length !== 6 ||
          birth6 !== confirm
        ) {
          result.style.background =
            '#fff0f0';

          result.textContent =
            '⚠️ 생년월일 6자리를 두 번 동일하게 입력해 주세요.';

          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent =
          '확인 중...';

        try {
          const response =
            await fetch(
              '/api/legacy-convert',
              {
                method: 'POST',
                headers: {
                  'Content-Type':
                    'application/json'
                },
                body: JSON.stringify({
                  phone,
                  oldPin,
                  birth6
                })
              }
            );

          const data =
            await response.json();

          if (
            !response.ok ||
            data.success === false
          ) {
            throw new Error(
              data.message ||
              '처리하지 못했습니다.'
            );
          }

          result.style.background =
            '#eaf7ed';

          result.textContent =
            '✅ ' + data.message +
            ' 이 창을 닫고 감탄일기 로그인에서 생년월일 6자리로 로그인해 주세요.';

          submitBtn.textContent =
            '변경 완료';

        } catch (error) {
          result.style.background =
            '#fff0f0';

          result.textContent =
            '⚠️ ' + error.message;

          submitBtn.disabled = false;
          submitBtn.textContent =
            '생년월일 로그인으로 변경하기';
        }
      }
    );
  }

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      startLegacyConvert
    );
  } else {
    startLegacyConvert();
  }
})();
            `,
          }}
        />
      </body>
    </html>
  );
}

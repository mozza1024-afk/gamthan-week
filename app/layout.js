import './globals.css';

export const metadata = {
  metadataBase: new URL(
    'https://gamthan-week.vercel.app'
  ),
  title: '감탄위크 마라톤–나의 감탄일기',
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

const inputStyle = {
  boxSizing: 'border-box',
  width: '100%',
  padding: '13px',
  border: '1px solid #ccc',
  borderRadius: '10px',
  fontSize: '16px',
};

const labelStyle = {
  display: 'block',
  margin: '12px 0 6px',
  fontWeight: '700',
};

export default function RootLayout({
  children
}) {
  return (
    <html lang="ko">
      <body>

        {children}

        {/* =========================
            접속 안내 팝업
        ========================== */}

        <div
          id="gamthan-notice-modal"
          style={{
            display: 'none',
            position: 'fixed',
            inset: 0,
            zIndex: 12000,
            background:
              'rgba(0,0,0,.55)',
            padding: '20px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              maxWidth: '500px',
              margin: '55px auto',
              padding: '24px',
              background: '#fff',
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
                  id="gamthan-notice-title"
                  style={{
                    margin:
                      '5px 0 10px',
                    fontSize: '22px',
                    lineHeight: 1.35,
                  }}
                >
                  안내
                </h2>

              </div>

              <button
                id="gamthan-notice-close-x"
                type="button"
                aria-label="안내 닫기"
                style={{
                  border: 0,
                  background:
                    'transparent',
                  fontSize: '26px',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>

            </div>

            <div
              id="gamthan-notice-body"
              style={{
                lineHeight: 1.7,
                fontSize: '15px',
              }}
            />

            <div
              style={{
                marginTop: '16px',
                padding: '13px 14px',
                background: '#fff7d6',
                borderRadius: '12px',
                fontSize: '14px',
                lineHeight: 1.65,
              }}
            >
              🔐 기존에
              <strong>
                {' '}휴대전화번호 뒤 4자리
              </strong>
              로 로그인하셨던 분은
              이 안내를 닫은 뒤 화면 하단의
              <strong>
                {' '}노란색 안내
              </strong>
              를 눌러 생년월일 6자리 로그인으로
              변경해 주세요.
              <br />
              <strong>
                재신청은 필요하지 않습니다.
              </strong>
            </div>

            <button
              id="gamthan-notice-close"
              type="button"
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
              확인했어요
            </button>

            <p
              style={{
                margin:
                  '14px 0 0',
                textAlign: 'center',
                color: '#777',
                fontSize: '12px',
              }}
            >
              이 안내는 하루 한 번만 표시됩니다.
            </p>

          </div>
        </div>


        {/* =========================
            기존 로그인 전환 버튼
        ========================== */}

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
            border:
              '2px solid #d6a400',
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

          <span
            style={{
              display: 'block'
            }}
          >
            🔐 휴대전화번호 뒤 4자리로
            로그인하셨나요?
          </span>

          <span
            style={{
              display: 'block',
              marginTop: '3px',
              fontSize: '13px',
            }}
          >
            생년월일 6자리 로그인으로
            변경하기 →
          </span>

        </button>


        {/* =========================
            로그인 전환 창
        ========================== */}

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
                    margin:
                      '5px 0 8px',
                    fontSize: '22px',
                  }}
                >
                  생년월일 로그인으로 변경
                </h2>

              </div>

              <button
                id="legacy-convert-close"
                type="button"
                aria-label="창 닫기"
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
                margin:
                  '0 0 18px',
              }}
            >
              휴대전화번호 뒤 4자리로
              로그인하셨다면,
              현재 로그인 방식이
              생년월일 6자리로 변경되어
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
                style={labelStyle}
              >
                휴대전화번호
              </label>

              <input
                id="legacy-phone"
                type="tel"
                inputMode="tel"
                required
                placeholder="010-1234-5678"
                style={inputStyle}
              />


              <label
                style={labelStyle}
              >
                기존 비밀번호
              </label>

              <input
                id="legacy-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                required
                placeholder="휴대전화번호 뒤 4자리"
                style={inputStyle}
              />


              <label
                style={labelStyle}
              >
                생년월일 6자리
              </label>

              <input
                id="legacy-birth"
                type="password"
                inputMode="numeric"
                maxLength={6}
                required
                placeholder="예: 650326"
                style={inputStyle}
              />


              <label
                style={labelStyle}
              >
                생년월일 6자리 확인
              </label>

              <input
                id="legacy-birth-confirm"
                type="password"
                inputMode="numeric"
                maxLength={6}
                required
                placeholder="한 번 더 입력"
                style={inputStyle}
              />


              <button
                id="legacy-submit"
                type="submit"
                style={{
                  width: '100%',
                  marginTop: '18px',
                  padding: '14px',
                  border: 0,
                  borderRadius:
                    '12px',
                  background:
                    '#29854b',
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
                margin:
                  '20px 0 0',
                textAlign: 'center',
                color: '#777',
                fontSize: '13px',
              }}
            >
              문의 070-4398-4401
            </p>

          </div>
        </div>


        {/* =========================
            팝업 및 로그인 전환 동작
        ========================== */}

        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {

  function kstDate() {
    return new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone:
          'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }
    ).format(new Date());
  }


  function startNotice() {

    if (
      window.location.pathname !== '/'
    ) {
      return;
    }

    var modal =
      document.getElementById(
        'gamthan-notice-modal'
      );

    var title =
      document.getElementById(
        'gamthan-notice-title'
      );

    var body =
      document.getElementById(
        'gamthan-notice-body'
      );

    var closeBtn =
      document.getElementById(
        'gamthan-notice-close'
      );

    var closeX =
      document.getElementById(
        'gamthan-notice-close-x'
      );


    if (
      !modal ||
      !title ||
      !body ||
      !closeBtn ||
      !closeX
    ) {
      return;
    }


    var today =
      kstDate();


    if (
      today >
      '2026-10-31'
    ) {
      return;
    }


    var key =
      'gamthan_notice_seen_' +
      today;


    if (
      window.localStorage
        .getItem(key) ===
      '1'
    ) {
      return;
    }


    if (
      today <
      '2026-10-01'
    ) {

      title.textContent =
        '🏃 감탄위크 실천마라톤 신청 감사합니다!';


      body.innerHTML =
        '<p style="margin:0 0 10px">' +
        '감탄일기는 <strong>10월 1일부터</strong> 작성할 수 있습니다.' +
        '</p>' +

        '<p style="margin:0">' +
        '본인이 선택한 시작일부터 신청한 ' +
        '<strong>7·14·21·28일 코스</strong>만큼 ' +
        '매일 연속으로 감탄일기를 작성해 주세요. ' +
        '여러분의 완주를 응원합니다! 🌱' +
        '</p>';

    } else {

      title.textContent =
        '🏃 감탄위크 실천마라톤이 시작되었습니다!';


      body.innerHTML =
        '<p style="margin:0 0 10px">' +
        '본인이 선택한 <strong>시작일부터</strong> ' +
        '감탄일기를 작성해 주세요.' +
        '</p>' +

        '<p style="margin:0">' +
        '신청한 7·14·21·28일 코스 동안 ' +
        '<strong>하루도 빠짐없이 연속으로</strong> ' +
        '오늘의 작은 탄소중립 실천을 기록하며 ' +
        '완주해 주세요. 🌱' +
        '</p>';
    }


    modal.style.display =
      'block';

    document.body.style.overflow =
      'hidden';


    function closeNotice() {

      try {
        window.localStorage
          .setItem(
            key,
            '1'
          );
      } catch {}

      modal.style.display =
        'none';

      document.body.style.overflow =
        '';
    }


    closeBtn.addEventListener(
      'click',
      closeNotice
    );


    closeX.addEventListener(
      'click',
      closeNotice
    );


    modal.addEventListener(
      'click',
      function (event) {

        if (
          event.target ===
          modal
        ) {
          closeNotice();
        }

      }
    );
  }


  function startLegacyConvert() {

    var openBtn =
      document.getElementById(
        'legacy-convert-open'
      );

    var modal =
      document.getElementById(
        'legacy-convert-modal'
      );

    var closeBtn =
      document.getElementById(
        'legacy-convert-close'
      );

    var form =
      document.getElementById(
        'legacy-convert-form'
      );

    var submitBtn =
      document.getElementById(
        'legacy-submit'
      );

    var result =
      document.getElementById(
        'legacy-result'
      );


    if (
      !openBtn ||
      !modal ||
      !closeBtn ||
      !form ||
      !submitBtn ||
      !result
    ) {
      return;
    }


    function updateVisibility() {

      var isParticipantPage =
        window.location.pathname === '/';


      var loggedIn =
        !!window.localStorage
          .getItem(
            'gamthan_token'
          );


      openBtn.style.display =
        isParticipantPage &&
        !loggedIn
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

        modal.style.display =
          'block';

        result.style.display =
          'none';

        document.body.style.overflow =
          'hidden';
      }
    );


    function closeModal() {

      modal.style.display =
        'none';

      document.body.style.overflow =
        '';
    }


    closeBtn.addEventListener(
      'click',
      closeModal
    );


    modal.addEventListener(
      'click',
      function (event) {

        if (
          event.target ===
          modal
        ) {
          closeModal();
        }

      }
    );


    form.addEventListener(
      'submit',
      async function (event) {

        event.preventDefault();


        var phone =
          document
            .getElementById(
              'legacy-phone'
            )
            .value;


        var oldPin =
          document
            .getElementById(
              'legacy-pin'
            )
            .value
            .replace(
              /\\D/g,
              ''
            );


        var birth6 =
          document
            .getElementById(
              'legacy-birth'
            )
            .value
            .replace(
              /\\D/g,
              ''
            );


        var confirmBirth =
          document
            .getElementById(
              'legacy-birth-confirm'
            )
            .value
            .replace(
              /\\D/g,
              ''
            );


        result.style.display =
          'block';


        if (
          oldPin.length !== 4
        ) {

          result.style.background =
            '#fff0f0';

          result.textContent =
            '⚠️ 기존 비밀번호인 휴대전화번호 뒤 4자리를 입력해 주세요.';

          return;
        }


        if (
          birth6.length !== 6 ||
          birth6 !==
            confirmBirth
        ) {

          result.style.background =
            '#fff0f0';

          result.textContent =
            '⚠️ 생년월일 6자리를 두 번 동일하게 입력해 주세요.';

          return;
        }


        submitBtn.disabled =
          true;

        submitBtn.textContent =
          '확인 중...';


        try {

          var response =
            await fetch(
              '/api/legacy-convert',
              {
                method:
                  'POST',

                headers: {
                  'Content-Type':
                    'application/json'
                },

                body:
                  JSON.stringify({
                    phone:
                      phone,

                    oldPin:
                      oldPin,

                    birth6:
                      birth6
                  })
              }
            );


          var data =
            await response.json();


          if (
            !response.ok ||
            data.success ===
              false
          ) {

            throw new Error(
              data.message ||
              '처리하지 못했습니다.'
            );
          }


          result.style.background =
            '#eaf7ed';


          result.textContent =
            '✅ ' +
            data.message +
            ' 이 창을 닫고 감탄일기 로그인에서 생년월일 6자리로 로그인해 주세요.';


          submitBtn.textContent =
            '변경 완료';


        } catch (error) {

          result.style.background =
            '#fff0f0';


          result.textContent =
            '⚠️ ' +
            error.message;


          submitBtn.disabled =
            false;


          submitBtn.textContent =
            '생년월일 로그인으로 변경하기';
        }

      }
    );
  }


  function startAll() {
    startNotice();
    startLegacyConvert();
  }


  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      startAll
    );

  } else {

    startAll();

  }

})();
            `,
          }}
        />

      </body>
    </html>
  );
}

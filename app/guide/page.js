export const metadata = {
  title: '감탄위크 이용안내',
  description: '감탄위크 실천마라톤 감탄일기 이용방법'
};

export default function GuidePage() {
  return (
    <main className="app-shell">

      <section className="panel">

        <p className="eyebrow">
          온기동행
        </p>

        <h1>
          🌱 감탄위크 이용안내
        </h1>

        <p className="panel-intro">
          별도의 앱을 설치하지 않습니다.<br />
          참여기간 동안 같은 링크에 매일 접속해 기록해 주세요.
        </p>

        <a
          href="https://gamthan-week.vercel.app"
          className="button primary"
          style={{
            display: 'block',
            textAlign: 'center',
            textDecoration: 'none'
          }}
        >
          감탄일기 바로가기 →
        </a>

        <div
          className="today-card"
          style={{
            marginTop: '24px'
          }}
        >
          <strong>
            ① 로그인
          </strong>

          <p>
            신청한 휴대전화번호 + 생년월일 6자리로 로그인합니다.
          </p>
        </div>

        <div className="today-card">
          <strong>
            ② 내가 신청한 시작일부터 시작
          </strong>

          <p>
            신청한 7일·14일·21일·28일 코스만큼
            연속으로 실천합니다.
          </p>
        </div>

        <div className="today-card">
          <strong>
            ③ 매일 오늘의 실천 기록
          </strong>

          <p>
            오늘 실천한 행동을 선택하고 감탄일기를 작성해 저장합니다.
            같은 날에는 수정할 수 있습니다.
          </p>
        </div>

        <div className="today-card">
          <strong>
            ④ 마지막에는 실천사진 남기기
          </strong>

          <p>
            사진은 최대 3장까지 등록할 수 있습니다.
            완주자는 일기를 모두 작성하고 사진을 1장 이상 등록하면
            최종 완주 처리됩니다.
          </p>
        </div>

        <div
          className="today-card"
          style={{
            background: '#fff4e8',
            marginTop: '24px'
          }}
        >
          <strong>
            📌 꼭 확인해 주세요
          </strong>

          <p>
            감탄일기는 <b>당일 기록 방식</b>입니다.
            지나간 날짜의 일기를 나중에 작성할 수 없습니다.
          </p>

          <p>
            😢 하루 기록을 놓치면 완주는 어렵지만,
            <b> 남은 기간의 실천과 기록은 계속할 수 있습니다.</b>
          </p>
        </div>

        <div
          className="today-card"
          style={{
            background: '#f4f9f2'
          }}
        >
          <strong>
            💡 매일 쉽게 들어오는 방법
          </strong>

          <p>
            안내 문자를 보관하거나,
            감탄일기 링크를 휴대전화 브라우저의
            즐겨찾기·홈 화면에 추가해 두세요.
          </p>
        </div>

        <div
          className="today-card"
          style={{
            textAlign: 'center',
            marginTop: '24px'
          }}
        >
          <strong>
            ☎ 문의 070-4398-4401
          </strong>

          <p>
            문의시간 오전 10시 ~ 오후 4시
          </p>
        </div>

        <p
          style={{
            textAlign: 'center',
            marginTop: '24px'
          }}
        >
          오늘의 작은 실천이 지구를 위한 큰 변화가 됩니다. 💚
        </p>

      </section>

    </main>
  );
}

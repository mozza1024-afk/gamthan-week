'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const MYUNG = 'https://raw.githubusercontent.com/mozza1024-afk/gamthan-week/main/gamthan-week-v4/public/assets/myungnyun-logo.png';
const ONGI = 'https://raw.githubusercontent.com/mozza1024-afk/gamthan-week/main/gamthan-week-v4/public/assets/ongi-logo.png';

const fmt = (d) => (d ? String(d).replaceAll('-', '.') : '-');

async function api(path, options = {}) {
  const res = await fetch(`/api?path=${encodeURIComponent(path)}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      const clean = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

      throw new Error(
        clean
          ? `서버 오류 (${res.status}): ${clean.slice(0, 180)}`
          : `서버 오류 (${res.status}). 잠시 후 다시 시도해 주세요.`
      );
    }
  }

  if (!res.ok || data?.success === false) {
    throw new Error(
      data?.message ||
      `요청을 처리하지 못했습니다. (HTTP ${res.status})`
    );
  }

  return data || {};
}

function auth(token) {
  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

function previousDate(dateText) {
  if (!dateText) return '';

  const [y, m, d] =
    String(dateText)
      .split('-')
      .map(Number);

  const dt =
    new Date(
      Date.UTC(
        y,
        m - 1,
        d
      )
    );

  dt.setUTCDate(
    dt.getUTCDate() - 1
  );

  return dt
    .toISOString()
    .slice(0, 10);
}

function calcEnd(start, days) {
  if (!start || !days) return '';

  const d =
    new Date(
      `${start}T00:00:00`
    );

  d.setDate(
    d.getDate() +
    Number(days) -
    1
  );

  return d
    .toISOString()
    .slice(0, 10);
}

async function compressImage(file) {
  if (file.size <= 320 * 1024) {
    return file;
  }

  const img =
    await createImageBitmap(file);

  const max = 1600;

  const scale =
    Math.min(
      1,
      max /
      Math.max(
        img.width,
        img.height
      )
    );

  const canvas =
    document.createElement('canvas');

  canvas.width =
    Math.round(
      img.width * scale
    );

  canvas.height =
    Math.round(
      img.height * scale
    );

  canvas
    .getContext('2d')
    .drawImage(
      img,
      0,
      0,
      canvas.width,
      canvas.height
    );

  let quality = 0.82;

  let blob =
    await new Promise(
      (resolve) =>
        canvas.toBlob(
          resolve,
          'image/jpeg',
          quality
        )
    );

  while (
    blob &&
    blob.size > 700 * 1024 &&
    quality > 0.5
  ) {
    quality -= 0.08;

    blob =
      await new Promise(
        (resolve) =>
          canvas.toBlob(
            resolve,
            'image/jpeg',
            quality
          )
      );
  }

  return new File(
    [blob],
    file.name.replace(
      /\.[^.]+$/,
      '.jpg'
    ),
    {
      type: 'image/jpeg'
    }
  );
}

export default function Home() {
  const [view, setView] =
    useState('home');

  const [info, setInfo] =
    useState(null);

  const [token, setToken] =
    useState('');

  const [dash, setDash] =
    useState(null);

  const [toast, setToast] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const actionLock =
    useRef(false);

  const [reg, setReg] =
    useState({
      displayName: '',
      phone: '',
      birth6: '',
      organizationId: '',
      courseDays: '',
      startDate: '',
      privacyConsent: false,
    });

  const [login, setLogin] =
    useState({
      phone: '',
      birth6: ''
    });

  const [diary, setDiary] =
    useState({
      actionCodes: [],
      otherActionText: '',
      diaryText: ''
    });

  const [photos, setPhotos] =
    useState([]);

  useEffect(
    () => {
      loadInfo();

      const saved =
        localStorage.getItem(
          'gamthan_token'
        ) || '';

      if (saved) {
        setToken(saved);
      }
    },
    []
  );

  useEffect(
    () => {
      if (
        token &&
        view === 'dashboard'
      ) {
        loadDash();
      }
    },
    [
      token,
      view
    ]
  );

  const say =
    (message) => {
      setToast(message);

      setTimeout(
        () =>
          setToast(''),
        3600
      );
    };

  const fail =
    (error) =>
      say(
        `⚠️ ${error.message}`
      );

  async function loadInfo() {
    try {
      setInfo(
        await api(
          'public-data'
        )
      );
    } catch (error) {
      fail(error);
    }
  }

  async function loadDash() {
    try {
      setBusy(true);

      setDash(
        await api(
          'dashboard',
          {
            headers:
              auth(token)
          }
        )
      );
    } catch (error) {
      if (
        error.message.includes(
          '로그인'
        )
      ) {
        localStorage.removeItem(
          'gamthan_token'
        );

        setToken('');

        setView(
          'login'
        );
      }

      fail(error);

    } finally {
      setBusy(false);
    }
  }

  function go(next) {
    setView(next);

    window.scrollTo(
      0,
      0
    );
  }

  function chooseCourse(days) {
    if (
      days === 28 &&
      info?.course28Open === false
    ) {
      say(
        '28일 코스 신청은 마감되었습니다.'
      );

      return;
    }

    setReg(
      (current) => ({
        ...current,
        courseDays:
          String(days),
        startDate: ''
      })
    );
  }

  const startMin =
    info?.activityStartDate ||
    '';

  const startMax =
    useMemo(
      () => {
        if (
          !info ||
          !reg.courseDays
        ) {
          return '';
        }

        const d =
          new Date(
            `${info.activityEndDate}T00:00:00`
          );

        d.setDate(
          d.getDate() -
          Number(
            reg.courseDays
          ) +
          1
        );

        return d
          .toISOString()
          .slice(
            0,
            10
          );
      },
      [
        info,
        reg.courseDays
      ]
    );

  async function submitReg(event) {
    event.preventDefault();

    if (actionLock.current) {
      return;
    }

    actionLock.current = true;

    try {
      setBusy(true);

      const data =
        await api(
          'register',
          {
            method: 'POST',

            body:
              JSON.stringify({
                ...reg,
                courseDays:
                  Number(
                    reg.courseDays
                  )
              })
          }
        );

      say(data.message);

      setLogin({
        phone:
          reg.phone,
        birth6:
          reg.birth6
      });

      go('done');

    } catch (error) {
      fail(error);

    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }

  async function submitLogin(event) {
    event.preventDefault();

    if (actionLock.current) {
      return;
    }

    actionLock.current = true;

    try {
      setBusy(true);

      const data =
        await api(
          'login',
          {
            method: 'POST',

            body:
              JSON.stringify(
                login
              )
          }
        );

      localStorage.setItem(
        'gamthan_token',
        data.token
      );

      setToken(
        data.token
      );

      go(
        'dashboard'
      );

    } catch (error) {
      fail(error);

    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem(
      'gamthan_token'
    );

    setToken('');

    setDash(null);

    go('home');
  }

  function startDiary() {
    const today =
      dash?.todayDiary;

    setDiary({
      actionCodes:
        today
          ?.actions
          ?.map(
            (action) =>
              action.code
          ) || [],

      otherActionText:
        today
          ?.other_action_text ||
        '',

      diaryText:
        today
          ?.diary_text ||
        ''
    });

    go('diary');
  }

  function toggleAction(code) {
    setDiary(
      (current) => ({
        ...current,

        actionCodes:
          current
            .actionCodes
            .includes(code)

            ? current
                .actionCodes
                .filter(
                  (item) =>
                    item !== code
                )

            : [
                ...current.actionCodes,
                code
              ]
      })
    );
  }

  async function saveDiary(event) {
    event.preventDefault();

    if (actionLock.current) {
      return;
    }

    actionLock.current = true;

    try {
      setBusy(true);

      await api(
        'diaries',
        {
          method: 'POST',

          headers:
            auth(token),

          body:
            JSON.stringify(
              diary
            )
        }
      );

      say(
        '오늘의 감탄일기를 저장했습니다.'
      );

      go(
        'dashboard'
      );

      await loadDash();

    } catch (error) {
      fail(error);

    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }

  async function uploadPhotos() {
    if (actionLock.current) {
      return;
    }

    if (!photos.length) {
      fail(
        new Error(
          '사진을 1장 이상 선택해 주세요.'
        )
      );

      return;
    }

    actionLock.current = true;

    try {
      setBusy(true);

      const form =
        new FormData();

      for (
        const file of
        photos.slice(
          0,
          3
        )
      ) {
        form.append(
          'photos',
          await compressImage(
            file
          )
        );
      }

      await api(
        'completion-photos',
        {
          method: 'POST',

          headers:
            auth(token),

          body:
            form
        }
      );

      say(
        '실천 사진을 등록했습니다.'
      );

      setPhotos([]);

      await loadDash();

    } catch (error) {
      fail(error);

    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }

  const yesterday =
    previousDate(
      dash?.today
    );

  const missedYesterday =
    Boolean(
      dash?.today &&

      dash
        ?.participant
        ?.startDate &&

      yesterday >=
        dash
          .participant
          .startDate &&

      yesterday <=
        dash
          .participant
          .endDate &&

      !dash
        ?.diaries
        ?.some(
          (item) =>
            item.diary_date ===
            yesterday
        )
    );

  const photoEligible =
    Boolean(
      dash
        ?.completion
        ?.diaryComplete ||

      (
        dash?.today &&

        dash
          ?.participant
          ?.endDate &&

        dash.today >=
          dash
            .participant
            .endDate
      )
    );

  return (
    <>

      {
        busy &&
        <div className="loading">
          <div className="spinner" />

          <p>
            처리 중...
          </p>
        </div>
      }

      <div
        className={
          `toast ${
            toast
              ? 'show'
              : ''
          }`
        }
      >
        {toast}
      </div>

      <main className="app-shell">

        {
          view === 'home' &&
          <>

            <header className="brand-header">

              <img
                src={MYUNG}
                className="myung-logo"
                alt="명륜종합사회복지관"
              />

            </header>

            <section className="hero-card">

              <img
                src={ONGI}
                className="ongi-logo"
                alt="온기동행"
              />

              <p className="eyebrow">
                제2회 온기동행 공모전
              </p>

              <h1>
                감탄위크 마라톤
              </h1>

              <p className="hero-subtitle">
                매일 한 가지 탄소중립 실천을 기록하며
                <br />
                나만의 감탄일기를 완주해요.
              </p>

              <div className="hero-rule">
                <span>7일</span>
                <span>14일</span>
                <span>21일</span>
                <span>28일</span>
              </div>

              {
                info?.course28Open === false
                  ? (
                    <div className="login-guide">

                      <strong>
                        🏁 28일 코스 신청은 마감되었습니다.
                      </strong>

                      <br />

                      <span>
                        7일·14일·21일 코스는 계속 신청할 수 있어요.
                      </span>

                    </div>
                  )
                  : (
                    <div className="login-guide">

                      <strong>
                        📅 28일 코스는 10월 4일까지 시작해 주세요.
                      </strong>

                      <br />

                      <span>
                        모든 코스는 10월 31일까지 완주해야 합니다.
                      </span>

                    </div>
                  )
              }

              <div className="photo-notice">

                <strong>
                  📸 실천사진을 최대 3장까지 등록할 수 있어요.
                </strong>

                <span>
                  완주자는 사진 1장 이상 등록하면 최종 완주 처리됩니다.
                </span>

                <small>
                  얼굴이 나오지 않아도 괜찮아요.
                </small>

              </div>

              <div className="status-card">

                <div>
                  <span>
                    신청기간
                  </span>

                  <strong>
                    {
                      fmt(
                        info
                          ?.applicationStartDate
                      )
                    }
                    {' ~ '}
                    {
                      fmt(
                        info
                          ?.applicationEndDate
                      )
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    실천기간
                  </span>

                  <strong>
                    {
                      fmt(
                        info
                          ?.activityStartDate
                      )
                    }
                    {' ~ '}
                    {
                      fmt(
                        info
                          ?.activityEndDate
                      )
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    온라인 신청
                  </span>

                  <strong>
                    {
                      info
                        ? `${info.onlineApplicationCount}/${info.onlineApplicationLimit}명 · 잔여 ${info.onlineApplicationRemaining}명`
                        : '-'
                    }
                  </strong>
                </div>

              </div>

              {
                info?.devMode &&
                <div className="dev-badge">
                  개발 테스트 모드
                </div>
              }

              <p className="home-message">
                {
                  info?.applicationOpen
                    ? '온라인 신청이 가능합니다.'
                    : '현재 온라인 신청이 마감되었거나 신청기간이 아닙니다.'
                }
              </p>

              <button
                className="button primary"
                disabled={
                  !info
                    ?.applicationOpen ||
                  busy
                }
                onClick={
                  () =>
                    go(
                      'register'
                    )
                }
              >
                참여 신청하기
              </button>

              <button
                className="button secondary"
                disabled={busy}
                onClick={
                  () =>
                    go(
                      'login'
                    )
                }
              >
                감탄일기 로그인
              </button>

            </section>

            <footer className="footer">
              명륜종합사회복지관 × 온기동행
            </footer>

          </>
        }

        {
          view === 'register' &&
          <>

            <button
              className="back-link"
              disabled={busy}
              onClick={
                () =>
                  go(
                    'home'
                  )
              }
            >
              ← 처음 화면으로
            </button>

            <section className="panel">

              <h2>
                참여 신청하기
              </h2>

              <p className="panel-intro">
                신청 후{' '}
                <strong>
                  휴대전화번호 + 생년월일 6자리
                </strong>
                로 로그인합니다.
              </p>

              <form
                className="form-grid"
                onSubmit={
                  submitReg
                }
              >

                <label>
                  이름 또는 별명 <b>*</b>

                  <input
                    value={
                      reg.displayName
                    }
                    onChange={
                      (e) =>
                        setReg({
                          ...reg,
                          displayName:
                            e.target.value
                        })
                    }
                    maxLength={30}
                    required
                    placeholder="예: 최미정"
                  />

                </label>

                <label>
                  휴대전화번호 <b>*</b>

                  <input
                    value={
                      reg.phone
                    }
                    onChange={
                      (e) =>
                        setReg({
                          ...reg,
                          phone:
                            e.target.value
                        })
                    }
                    inputMode="tel"
                    maxLength={13}
                    required
                    placeholder="010-1234-5678"
                  />

                </label>

                <label>
                  생년월일 6자리 <b>*</b>

                  <input
                    value={
                      reg.birth6
                    }
                    onChange={
                      (e) =>
                        setReg({
                          ...reg,

                          birth6:
                            e.target.value
                              .replace(
                                /\D/g,
                                ''
                              )
                              .slice(
                                0,
                                6
                              )
                        })
                    }
                    inputMode="numeric"
                    required
                    placeholder="예: 650326"
                  />

                  <small>
                    로그인 확인용 생년월일은 원문 대신 해시 형태로 저장하며 관리자 화면에 표시하지 않습니다.
                  </small>

                </label>

                <div className="login-guide">
                  🔐 로그인:{' '}
                  <strong>
                    휴대전화번호 + 생년월일 6자리
                  </strong>
                </div>

                <label>
                  소속기관 <b>*</b>

                  <select
                    value={
                      reg.organizationId
                    }
                    onChange={
                      (e) =>
                        setReg({
                          ...reg,

                          organizationId:
                            e.target.value
                        })
                    }
                    required
                  >

                    <option value="">
                      기관 선택
                    </option>

                    {
                      info
                        ?.organizations
                        ?.map(
                          (org) =>
                            <option
                              key={org.id}
                              value={org.id}
                            >
                              {org.organization_name}
                            </option>
                        )
                    }

                  </select>

                </label>

                <fieldset>

                  <legend>
                    실천 코스 <b>*</b>
                  </legend>

                  <div className="course-grid">

                    {
                      [
                        7,
                        14,
                        21,
                        28
                      ]
                        .map(
                          (days) => {

                            const closed =
                              days === 28 &&
                              info
                                ?.course28Open ===
                                false;

                            return (
                              <label
                                className="choice"
                                key={days}
                                style={
                                  closed
                                    ? {
                                        opacity:
                                          0.52
                                      }
                                    : undefined
                                }
                              >

                                <input
                                  type="radio"
                                  checked={
                                    String(
                                      days
                                    ) ===
                                    reg.courseDays
                                  }
                                  disabled={
                                    closed ||
                                    busy
                                  }
                                  onChange={
                                    () =>
                                      chooseCourse(
                                        days
                                      )
                                  }
                                />

                                <span>
                                  <strong>
                                    {days}일
                                  </strong>

                                  <small>
                                    {
                                      closed
                                        ? '마감'
                                        : `${days}KM`
                                    }
                                  </small>
                                </span>

                              </label>
                            );
                          }
                        )
                    }

                  </div>

                  {
                    info
                      ?.course28Open ===
                      false &&
                    <small>
                      <strong>
                        ※ 28일 코스는 신청 인원 증가로 접수를 마감했습니다.
                      </strong>
                    </small>
                  }

                </fieldset>

                <label>
                  실천 시작일 <b>*</b>

                  <input
                    type="date"
                    disabled={
                      !reg.courseDays ||
                      busy
                    }
                    min={startMin}
                    max={startMax}
                    value={
                      reg.startDate
                    }
                    onChange={
                      (e) =>
                        setReg({
                          ...reg,

                          startDate:
                            e.target.value
                        })
                    }
                    required
                  />

                  <small>
                    {
                      reg.startDate &&
                      reg.courseDays
                        ? `종료 예정일 ${fmt(
                            calcEnd(
                              reg.startDate,
                              reg.courseDays
                            )
                          )}`
                        : '코스를 먼저 선택해 주세요.'
                    }
                  </small>

                  {
                    String(
                      reg.courseDays
                    ) === '28' &&
                    <small>
                      <strong>
                        ※ 28일 코스는 10월 4일까지 시작할 수 있어요.
                      </strong>
                      {' '}
                      선택한 시작일부터 28일 연속 실천합니다.
                    </small>
                  }

                </label>

                <label className="consent-box">

                  <input
                    type="checkbox"
                    checked={
                      reg.privacyConsent
                    }
                    disabled={busy}
                    onChange={
                      (e) =>
                        setReg({
                          ...reg,

                          privacyConsent:
                            e.target.checked
                        })
                    }
                    required
                  />

                  <span>

                    <strong>
                      개인정보 수집·이용에 동의합니다.
                    </strong>

                    <small>
                      수집항목: 이름/별명, 휴대전화번호,
                      로그인 확인용 생년월일 정보, 소속기관,
                      참여기록(감탄일기·실천항목·인증사진)
                      <br />

                      이용목적: 참여 신청 및 본인확인,
                      감탄위크 운영, 완주 확인,
                      안내 연락 및 통계
                      <br />

                      <strong>
                        보유·이용기간: 개인정보 수집일로부터 1년
                      </strong>
                      <br />

                      동의를 거부할 수 있으나,
                      참여 신청 및 서비스 이용이 제한될 수 있습니다.
                    </small>

                  </span>

                </label>

                <button
                  className="button primary"
                  disabled={busy}
                >
                  {
                    busy
                      ? '신청 처리 중...'
                      : '이 내용으로 신청하기'
                  }
                </button>

              </form>

            </section>

          </>
        }

        {
          view === 'done' &&

          <section className="panel center-panel">

            <div className="big-icon">
              🎉
            </div>

            <h2>
              참여 신청 완료!
            </h2>

            <p>
              신청한 휴대전화번호와 생년월일 6자리로 로그인하면 됩니다.
            </p>

            <button
              className="button primary"
              disabled={busy}
              onClick={
                () =>
                  go(
                    'login'
                  )
              }
            >
              바로 로그인하기
            </button>

            <button
              className="button secondary"
              disabled={busy}
              onClick={
                () =>
                  go(
                    'home'
                  )
              }
            >
              처음 화면으로
            </button>

          </section>
        }

        {
          view === 'login' &&
          <>

            <button
              className="back-link"
              disabled={busy}
              onClick={
                () =>
                  go(
                    'home'
                  )
              }
            >
              ← 처음 화면으로
            </button>

            <section className="panel">

              <h2>
                감탄일기 로그인
              </h2>

              <p className="panel-intro">
                신청한 휴대전화번호와 생년월일 6자리를 입력해 주세요.
              </p>

              <form
                className="form-grid"
                onSubmit={
                  submitLogin
                }
              >

                <label>
                  휴대전화번호

                  <input
                    value={
                      login.phone
                    }
                    disabled={busy}
                    onChange={
                      (e) =>
                        setLogin({
                          ...login,

                          phone:
                            e.target.value
                        })
                    }
                    inputMode="tel"
                    required
                    placeholder="010-1234-5678"
                  />

                </label>

                <label>
                  생년월일 6자리

                  <input
                    value={
                      login.birth6
                    }
                    disabled={busy}
                    onChange={
                      (e) =>
                        setLogin({
                          ...login,

                          birth6:
                            e.target.value
                              .replace(
                                /\D/g,
                                ''
                              )
                              .slice(
                                0,
                                6
                              )
                        })
                    }
                    inputMode="numeric"
                    required
                    placeholder="예: 650326"
                  />

                </label>

                <button
                  className="button primary"
                  disabled={busy}
                >
                  {
                    busy
                      ? '로그인 중...'
                      : '로그인하기'
                  }
                </button>

              </form>

            </section>

          </>
        }

        {
          view === 'dashboard' &&
          <>

            <button
              className="back-link"
              disabled={busy}
              onClick={
                () =>
                  go(
                    'home'
                  )
              }
            >
              ← 처음 화면으로
            </button>

            <section className="panel">

              <div className="dashboard-title-row">

                <div>
                  <p className="eyebrow">
                    나의 감탄일기
                  </p>

                  <h2>
                    {
                      dash
                        ?.participant
                        ?.displayName ||
                      '-'
                    }
                    님의 감탄위크
                  </h2>
                </div>

                <button
                  className="text-button"
                  disabled={busy}
                  onClick={
                    logout
                  }
                >
                  로그아웃
                </button>

              </div>

              <div className="summary-card">

                <div>
                  <span>
                    참여 상태
                  </span>

                  <strong>
                    {
                      ({
                        scheduled:
                          '시작 전',

                        active:
                          '진행 중',

                        ended:
                          '기간 종료',

                        completed:
                          '완주'
                      })[
                        dash
                          ?.participant
                          ?.status
                      ] || '-'
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    참여 코스
                  </span>

                  <strong>
                    {
                      dash
                        ?.participant
                        ?.courseDays ||
                      '-'
                    }
                    일
                  </strong>
                </div>

                <div>
                  <span>
                    실천 기간
                  </span>

                  <strong>
                    {
                      fmt(
                        dash
                          ?.participant
                          ?.startDate
                      )
                    }
                    {' ~ '}
                    {
                      fmt(
                        dash
                          ?.participant
                          ?.endDate
                      )
                    }
                  </strong>
                </div>

              </div>

              <div className="progress-block">

                <div className="progress-label">

                  <strong>
                    {
                      dash
                        ?.participant
                        ?.completedDays ||
                      0
                    }
                    {' / '}
                    {
                      dash
                        ?.participant
                        ?.courseDays ||
                      0
                    }
                    일
                  </strong>

                  <span>
                    {
                      dash
                        ?.participant
                        ?.progressPercent ||
                      0
                    }
                    %
                  </span>

                </div>

                <div className="progress-track">

                  <div
                    className="progress-bar"
                    style={{
                      width:
                        `${
                          dash
                            ?.participant
                            ?.progressPercent ||
                          0
                        }%`
                    }}
                  />

                </div>

              </div>

              <div className="today-card">

                <strong>
                  {
                    dash?.today ||
                    '오늘'
                  }
                </strong>

                <p>
                  {
                    dash?.canWriteToday
                      ? dash?.todayDiary
                        ? '오늘 기록을 작성했어요. 오늘 안에는 수정할 수 있습니다.'
                        : '오늘의 작은 실천을 기록해 주세요.'
                      : '오늘은 기록 작성 기간이 아닙니다.'
                  }
                </p>

              </div>

              {
                missedYesterday &&

                <div
                  className="today-card"
                  style={{
                    background:
                      '#fff2f2'
                  }}
                >

                  <strong>
                    😢 어제 기록이 확인되지 않았어요.
                  </strong>

                  <p>
                    감탄위크는 연속 실천 방식이라 완주는 어렵게 되었습니다.
                    하지만 남은 기간의 실천은 계속 기록할 수 있답니다.
                  </p>

                </div>
              }

              <button
                className="button primary"
                disabled={
                  !dash
                    ?.canWriteToday ||
                  busy
                }
                onClick={
                  startDiary
                }
              >
                {
                  dash?.todayDiary
                    ? '오늘의 감탄일기 수정하기'
                    : '오늘의 감탄일기 쓰기'
                }
              </button>

              {
                photoEligible &&

                (
                  dash
                    ?.completion
                    ?.photoCount ||
                  0
                ) < 3 &&

                <section className="completion-section">

                  <h3>
                    {
                      dash
                        ?.completion
                        ?.diaryComplete

                        ? dash
                            ?.completion
                            ?.complete

                          ? '📸 실천사진 더 남기기'

                          : '🏁 완주 마지막 단계'

                        : '📸 마지막 실천사진 남기기'
                    }
                  </h3>

                  <p>
                    {
                      dash
                        ?.completion
                        ?.diaryComplete

                        ? dash
                            ?.completion
                            ?.complete

                          ? '완주 후에도 실천사진을 최대 3장까지 남길 수 있어요.'

                          : '일기를 모두 작성했어요. 실천 인증사진을 등록하면 완주입니다.'

                        : '완주는 어렵게 되었지만, 끝까지 함께한 실천사진은 남길 수 있어요.'
                    }
                  </p>

                  <label className="photo-picker">

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={busy}
                      onChange={
                        (e) =>
                          setPhotos(
                            [
                              ...e.target.files
                            ]
                              .slice(
                                0,
                                3
                              )
                          )
                      }
                    />

                    <span>
                      📷 실천사진 선택하기
                    </span>

                    <small>
                      최소 1장 · 최대 3장 · 자동 압축
                    </small>

                  </label>

                  <div className="photo-preview">

                    {
                      photos.map(
                        (
                          file,
                          index
                        ) =>
                          <img
                            key={
                              `${file.name}-${index}`
                            }
                            src={
                              URL.createObjectURL(
                                file
                              )
                            }
                            alt="미리보기"
                          />
                      )
                    }

                  </div>

                  <button
                    className="button accent"
                    disabled={busy}
                    onClick={
                      uploadPhotos
                    }
                  >
                    {
                      busy
                        ? '사진 등록 중...'

                        : dash
                            ?.completion
                            ?.diaryComplete &&
                          !dash
                            ?.completion
                            ?.complete

                          ? '사진 등록하고 완주하기'

                          : '실천 사진 등록하기'
                    }
                  </button>

                </section>
              }

              <section className="history-section">

                <div className="section-heading">

                  <h3>
                    나의 기록
                  </h3>

                  <span>
                    {
                      dash
                        ?.diaries
                        ?.length ||
                      0
                    }
                    개
                  </span>

                </div>

                <div className="history-list">

                  {
                    dash
                      ?.diaries
                      ?.length

                      ? dash.diaries
                          .map(
                            (item) =>
                              <details
                                className="history-item"
                                key={item.id}
                              >

                                <summary>
                                  <span>
                                    {item.day_number}일차 · {item.diary_date}
                                  </span>

                                  <span>
                                    보기
                                  </span>
                                </summary>

                                <div className="history-body">
                                  {item.diary_text}
                                </div>

                                <div className="tag-row">

                                  {
                                    item
                                      .actions
                                      ?.map(
                                        (action) =>
                                          <span
                                            className="tag"
                                            key={action.code}
                                          >
                                            {action.name}
                                          </span>
                                      )
                                  }

                                </div>

                              </details>
                          )

                      : (
                        <p className="empty">
                          아직 작성한 감탄일기가 없습니다.
                        </p>
                      )
                  }

                </div>

              </section>

            </section>

          </>
        }

        {
          view === 'diary' &&
          <>

            <button
              className="back-link"
              disabled={busy}
              onClick={
                () =>
                  go(
                    'dashboard'
                  )
              }
            >
              ← 나의 감탄일기로
            </button>

            <section className="panel">

              <p className="eyebrow">
                오늘의 기록
              </p>

              <h2>
                오늘의 감탄일기
              </h2>

              <p className="panel-intro">
                {
                  dash?.today
                }
              </p>

              <form
                className="form-grid"
                onSubmit={
                  saveDiary
                }
              >

                <fieldset>

                  <legend>
                    오늘 실천한 행동 <b>*</b>
                  </legend>

                  <div className="action-list">

                    {
                      info
                        ?.actions
                        ?.map(
                          (action) =>
                            <label
                              className="action-choice"
                              key={
                                action.action_code
                              }
                            >

                              <input
                                type="checkbox"
                                disabled={busy}
                                checked={
                                  diary
                                    .actionCodes
                                    .includes(
                                      action.action_code
                                    )
                                }
                                onChange={
                                  () =>
                                    toggleAction(
                                      action.action_code
                                    )
                                }
                              />

                              <span>
                                {action.action_name}
                              </span>

                            </label>
                        )
                    }

                  </div>

                </fieldset>

                <label>
                  기타 실천 내용

                  <input
                    value={
                      diary.otherActionText
                    }
                    disabled={busy}
                    onChange={
                      (e) =>
                        setDiary({
                          ...diary,

                          otherActionText:
                            e.target.value
                        })
                    }
                    maxLength={100}
                  />

                </label>

                <label>
                  감탄일기 <b>*</b>

                  <textarea
                    value={
                      diary.diaryText
                    }
                    disabled={busy}
                    onChange={
                      (e) =>
                        setDiary({
                          ...diary,

                          diaryText:
                            e.target.value
                        })
                    }
                    minLength={10}
                    maxLength={500}
                    required
                    placeholder="오늘 무엇을 실천했고, 어떤 느낌이 들었나요?"
                  />

                  <small>
                    {
                      diary
                        .diaryText
                        .length
                    }
                    /500자 · 최소 10자
                  </small>

                </label>

                <button
                  className="button primary"
                  disabled={busy}
                >
                  {
                    busy
                      ? '저장 중...'
                      : '오늘의 기록 저장하기'
                  }
                </button>

              </form>

            </section>

          </>
        }

      </main>

    </>
  );
}

const state = { token: localStorage.getItem('gamthan_admin_token') || '', data: null, filtered: [] };
const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', init);

async function init() {
  $('adminLoginForm').addEventListener('submit', login);
  $('logoutButton').addEventListener('click', logout);
  ['searchInput','orgFilter','courseFilter','statusFilter'].forEach((id) => $(id).addEventListener('input', applyFilters));
  $('participantCsvButton').addEventListener('click', exportParticipants);
  $('diaryCsvButton').addEventListener('click', exportDiaries);
  if (state.token) {
    try { await loadAdmin(); } catch { logout(false); }
  }
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers['content-type'] = 'application/json';
  if (state.token) headers.authorization = `Bearer ${state.token}`;
  const res = await fetch(path, { ...options, headers });
  const body = await res.json().catch(() => ({ success:false, message:'서버 응답을 읽지 못했습니다.' }));
  if (res.status === 401 && path !== '/api/admin-login') localStorage.removeItem('gamthan_admin_token');
  if (!res.ok || body.success === false) throw new Error(body.message || '요청을 처리하지 못했습니다.');
  return body;
}

async function login(e) {
  e.preventDefault(); loading(true);
  try {
    const result = await api('/api/admin-login', { method:'POST', body:JSON.stringify({ password:$('adminPassword').value }) });
    state.token = result.token;
    localStorage.setItem('gamthan_admin_token', state.token);
    $('adminPassword').value = '';
    await loadAdmin();
  } catch (err) { toast(err.message, true); }
  finally { loading(false); }
}

function logout(showToast = true) {
  state.token = ''; state.data = null; state.filtered = [];
  localStorage.removeItem('gamthan_admin_token');
  $('dashboardSection').classList.add('hidden');
  $('loginSection').classList.remove('hidden');
  $('detailSection').classList.add('hidden');
  if (showToast) toast('관리자 로그아웃했습니다.');
}

async function loadAdmin() {
  loading(true);
  try {
    state.data = await api('/api/admin-data');
    $('loginSection').classList.add('hidden');
    $('dashboardSection').classList.remove('hidden');
    $('todayText').textContent = `기준일 ${kdate(state.data.today)}`;
    renderStats(); renderOrgFilter(); applyFilters();
  } finally { loading(false); }
}

function renderStats() {
  const s = state.data.stats;
  const items = [
    ['신청자', `${s.total}명`], ['진행 중', `${s.active}명`], ['완주', `${s.completed}명`],
    ['전체 일기', `${s.diaries}개`], ['인증사진', `${s.photos}장`], ['시작 전', `${s.scheduled}명`],
  ];
  $('stats').innerHTML = items.map(([a,b]) => `<div class="stat"><span>${a}</span><strong>${b}</strong></div>`).join('');
}

function renderOrgFilter() {
  const current = $('orgFilter').value;
  const orgs = [...new Set(state.data.participants.map((p) => p.organizationName).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
  $('orgFilter').innerHTML = '<option value="">전체 기관</option>' + orgs.map((o)=>`<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
  $('orgFilter').value = current;
}

function applyFilters() {
  if (!state.data) return;
  const q = $('searchInput').value.trim().toLowerCase();
  const org = $('orgFilter').value;
  const course = $('courseFilter').value;
  const status = $('statusFilter').value;
  state.filtered = state.data.participants.filter((p) => {
    const hay = `${p.displayName} ${formatPhone(p.phone)} ${p.organizationName} ${p.participantCode}`.toLowerCase();
    return (!q || hay.includes(q)) && (!org || p.organizationName === org) && (!course || String(p.courseDays) === course) && (!status || p.status === status);
  });
  renderTable();
}

function renderTable() {
  $('resultCount').textContent = `${state.filtered.length}명`;
  const body = $('participantBody');
  if (!state.filtered.length) { body.innerHTML = '<tr><td colspan="7"><div class="empty">조건에 맞는 신청자가 없습니다.</div></td></tr>'; return; }
  body.innerHTML = state.filtered.map((p) => {
    const pct = Math.min(100, Math.round((p.completedDays / p.courseDays) * 100));
    return `<tr>
      <td class="name-cell"><strong>${escapeHtml(p.displayName)}</strong><small>${escapeHtml(formatPhone(p.phone))}</small></td>
      <td>${escapeHtml(p.organizationName || '-')}</td><td>${p.courseDays}일</td>
      <td><div class="progress-mini"><span>${p.completedDays}/${p.courseDays}일</span><div><i style="width:${pct}%"></i></div></div></td>
      <td><span class="badge ${p.status}">${statusText(p.status)}</span></td><td>${p.photoCount}장</td>
      <td><button class="button secondary small" data-detail="${p.id}">보기</button></td>
    </tr>`;
  }).join('');
  body.querySelectorAll('[data-detail]').forEach((b) => b.addEventListener('click', () => openDetail(b.dataset.detail)));
}

async function openDetail(id) {
  const p = state.data.participants.find((x) => x.id === id); if (!p) return;
  const detail = $('detailSection'); detail.classList.remove('hidden');
  detail.innerHTML = `<div class="detail-header"><div><p class="eyebrow">신청자 상세</p><h2>${escapeHtml(p.displayName)}</h2><p class="muted">${escapeHtml(formatPhone(p.phone))} · ${escapeHtml(p.organizationName || '-')}</p></div><button id="closeDetail" class="button ghost small">닫기</button></div>
    <div class="detail-meta"><span class="meta-pill">${p.courseDays}일 코스</span><span class="meta-pill">${kdate(p.startDate)} ~ ${kdate(p.endDate)}</span><span class="meta-pill">일기 ${p.completedDays}/${p.courseDays}</span><span class="meta-pill">인증사진 ${p.photoCount}장</span><span class="badge ${p.status}">${statusText(p.status)}</span></div>
    <div class="detail-grid"><div><div class="section-title"><h2>감탄일기</h2><span>${p.diaries.length}개</span></div><div class="diary-list">${renderDiaries(p.diaries)}</div></div><div><div class="section-title"><h2>완주 인증사진</h2><span>${p.photos.length}장</span></div><div id="detailPhotos" class="photo-grid">${p.photos.length ? p.photos.map((x)=>`<div class="photo-card" data-photo="${x.id}"><div class="empty">사진 불러오는 중</div></div>`).join('') : '<div class="empty">등록된 인증사진이 없습니다.</div>'}</div></div></div>`;
  $('closeDetail').addEventListener('click', () => detail.classList.add('hidden'));
  detail.scrollIntoView({ behavior:'smooth', block:'start' });
  for (const photo of p.photos) loadPhoto(photo);
}

function renderDiaries(rows) {
  if (!rows.length) return '<div class="empty">작성한 감탄일기가 없습니다.</div>';
  return rows.map((d) => `<article class="diary"><h3>${d.dayNumber}일차 · ${kdate(d.diaryDate)}</h3><div>${d.actions.map((a)=>`<span class="tag">${escapeHtml(a.name)}</span>`).join('')}</div>${d.otherActionText ? `<p><strong>기타 실천:</strong> ${escapeHtml(d.otherActionText)}</p>` : ''}<p>${escapeHtml(d.diaryText)}</p></article>`).join('');
}

async function loadPhoto(photo) {
  const card = document.querySelector(`[data-photo="${photo.id}"]`); if (!card) return;
  try {
    const result = await api(`/api/admin-photo?id=${encodeURIComponent(photo.id)}`);
    card.innerHTML = `<a href="${escapeAttr(result.url)}" target="_blank" rel="noopener"><img src="${escapeAttr(result.url)}" alt="완주 인증사진 ${photo.photoNo}"></a><button class="button secondary small" type="button">사진 다운로드</button>`;
    card.querySelector('button').addEventListener('click', async () => {
      try {
        const d = await api(`/api/admin-photo?id=${encodeURIComponent(photo.id)}&download=1`);
        window.open(d.url, '_blank', 'noopener');
      } catch (e) { toast(e.message, true); }
    });
  } catch (e) { card.innerHTML = `<div class="empty">${escapeHtml(e.message)}</div>`; }
}

function exportParticipants() {
  const rows = [['이름/별명','휴대전화번호','소속기관','코스','시작일','종료일','작성일수','완주여부','인증사진수','상태','신청일']];
  for (const p of state.filtered) rows.push([p.displayName, formatPhone(p.phone), p.organizationName, `${p.courseDays}일`, p.startDate, p.endDate, p.completedDays, p.isCompleted?'완주':'미완주', p.photoCount, statusText(p.status), p.registeredAt || '']);
  downloadCsv(`감탄위크_신청자_${todayKey()}.csv`, rows);
}

function exportDiaries() {
  const ids = new Set(state.filtered.map((p)=>p.id));
  const rows = [['이름/별명','휴대전화번호','소속기관','코스','일차','일기날짜','실천항목','기타실천','감탄일기']];
  for (const p of state.data.participants.filter((x)=>ids.has(x.id))) for (const d of p.diaries) rows.push([p.displayName, formatPhone(p.phone), p.organizationName, `${p.courseDays}일`, d.dayNumber, d.diaryDate, d.actions.map((a)=>a.name).join(' / '), d.otherActionText, d.diaryText]);
  downloadCsv(`감탄위크_감탄일기_${todayKey()}.csv`, rows);
}

function downloadCsv(name, rows) {
  const csv = '\ufeff' + rows.map((r)=>r.map(csvCell).join(',')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'})); a.download = name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);
}
function csvCell(v){const s=String(v??'');return `"${s.replace(/"/g,'""')}"`}
function formatPhone(v){const s=String(v||'').replace(/\D/g,'');return s.length===11?`${s.slice(0,3)}-${s.slice(3,7)}-${s.slice(7)}`:s}
function statusText(s){return ({scheduled:'시작 전',active:'진행 중',completed:'완주',ended:'기간 종료',cancelled:'취소'})[s]||s}
function kdate(v){if(!v)return '-';const [y,m,d]=String(v).slice(0,10).split('-');return `${y}.${m}.${d}`}
function todayKey(){return new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'})}
function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function escapeAttr(v){return escapeHtml(v)}
function loading(on){$('loading').classList.toggle('hidden',!on)}
function toast(msg,error=false){const t=$('toast');t.textContent=msg;t.className=`toast show${error?' error':''}`;clearTimeout(toast._t);toast._t=setTimeout(()=>t.className='toast',3000)}

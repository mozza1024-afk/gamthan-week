const state = {
  publicData: null,
  token: localStorage.getItem('gamthan_token') || '',
  dashboard: null,
  selectedPhotos: [],
};

const $ = (id) => document.getElementById(id);
const views = ['homeView','registerView','registerDoneView','loginView','dashboardView','diaryView'];

document.addEventListener('DOMContentLoaded', init);

async function init() {
  bindEvents();
  await loadPublicData();
  if (state.token) {
    try { await openDashboard(); } catch { clearSession(); }
  }
}

function bindEvents() {
  document.querySelectorAll('[data-home]').forEach((b) => b.addEventListener('click', openHome));
  $('applicationButton').addEventListener('click', () => showView('registerView'));
  $('loginButton').addEventListener('click', () => showView('loginView'));
  $('doneLoginButton').addEventListener('click', () => showView('loginView'));
  $('registerForm').addEventListener('submit', submitRegistration);
  $('loginForm').addEventListener('submit', submitLogin);
  $('phone').addEventListener('input', formatPhoneInput);
  $('loginPhone').addEventListener('input', formatPhoneInput);
  document.querySelectorAll('input[name="courseDays"]').forEach((r) => r.addEventListener('change', updateStartDateRange));
  $('logoutButton').addEventListener('click', () => { clearSession(); openHome(); toast('로그아웃했습니다.'); });
  $('writeDiaryButton').addEventListener('click', openDiary);
  $('diaryBackButton').addEventListener('click', () => showView('dashboardView'));
  $('diaryForm').addEventListener('submit', saveDiary);
  $('diaryText').addEventListener('input', () => $('diaryLength').textContent = $('diaryText').value.length);
  $('photoInput').addEventListener('change', previewSelectedPhotos);
  $('uploadPhotosButton').addEventListener('click', uploadCompletionPhotos);
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers['content-type'] = 'application/json';
  if (state.token) headers.authorization = `Bearer ${state.token}`;
  const res = await fetch(path, { ...options, headers });
  const body = await res.json().catch(() => ({ success:false, message:'서버 응답을 읽지 못했습니다.' }));
  if (res.status === 401) clearSession();
  if (!res.ok || body.success === false) throw new Error(body.message || '요청을 처리하지 못했습니다.');
  return body;
}

async function loadPublicData() {
  loading(true, '감탄위크 정보를 불러오고 있어요.');
  try {
    const data = await api('/api/public-data');
    state.publicData = data;
    document.title = data.appName;
    $('applicationPeriod').textContent = `${kdate(data.applicationStartDate)} ~ ${kdate(data.applicationEndDate)}`;
    $('activityPeriod').textContent = `${kdate(data.activityStartDate)} ~ ${kdate(data.activityEndDate)}`;
    $('capacityText').textContent = `${data.onlineApplicationCount}/${data.onlineApplicationLimit}명 · 잔여 ${data.onlineApplicationRemaining}명`;
    $('applicationButton').disabled = !data.applicationOpen;
    $('homeMessage').textContent = data.applicationOpen ? '지금 온라인으로 참여 신청할 수 있어요.' : (data.onlineApplicationRemaining <= 0 ? '온라인 신청 정원이 마감되었습니다.' : '현재는 온라인 신청 기간이 아닙니다.');
    $('devBadge').classList.toggle('hidden', !data.devMode);
    renderOrganizations(data.organizations || []);
    renderActions(data.actions || []);
    $('privacyText').textContent = `수집항목: 이름/별명, 휴대전화번호, 소속기관, 참여기록 · 보유기한: ${data.privacyRetentionDate || '운영 종료 후 파기 예정'}`;
  } catch (e) {
    toast(e.message, true);
    $('homeMessage').textContent = '앱 정보를 불러오지 못했습니다.';
  } finally { loading(false); }
}

function renderOrganizations(rows) {
  const select = $('organizationId');
  select.innerHTML = '<option value="">소속기관을 선택해 주세요.</option>' + rows.map((r) => `<option value="${escapeHtml(r.id)}">${escapeHtml(r.organization_name)}</option>`).join('');
}

function renderActions(rows) {
  $('actionList').innerHTML = rows.map((a) => `<label class="action-choice"><input type="checkbox" name="actionCode" value="${escapeHtml(a.action_code)}"><span>${escapeHtml(a.action_name)}</span></label>`).join('');
  document.querySelectorAll('input[name="actionCode"]').forEach((c) => c.addEventListener('change', () => {
    const other = document.querySelector('input[name="actionCode"][value="ACT08"]')?.checked;
    $('otherActionWrap').classList.toggle('hidden', !other);
  }));
}

function showView(id) {
  views.forEach((v) => $(v).classList.toggle('active', v === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function openHome() { showView('homeView'); }

function updateStartDateRange() {
  const days = Number(document.querySelector('input[name="courseDays"]:checked')?.value || 0);
  const input = $('startDate');
  if (!days || !state.publicData) { input.disabled = true; return; }
  input.disabled = false;
  input.min = state.publicData.activityStartDate;
  input.max = addDays(state.publicData.activityEndDate, -(days - 1));
  if (input.value && (input.value < input.min || input.value > input.max)) input.value = '';
  $('startDateHelp').textContent = `${days}일 코스는 ${kdate(input.min)}부터 ${kdate(input.max)} 사이에 시작할 수 있어요.`;
}

async function submitRegistration(event) {
  event.preventDefault();
  const courseDays = Number(document.querySelector('input[name="courseDays"]:checked')?.value || 0);
  const payload = {
    displayName: $('displayName').value.trim(), phone: $('phone').value.trim(),
    organizationId: $('organizationId').value, courseDays, startDate: $('startDate').value,
    privacyConsent: $('privacyConsent').checked,
  };
  if (!confirm(`${courseDays}일 코스로 ${kdate(payload.startDate)}부터 참여 신청할까요?`)) return;
  loading(true, '참여 신청을 저장하고 있어요.');
  try {
    const result = await api('/api/register', { method:'POST', body:JSON.stringify(payload) });
    $('doneCode').textContent = result.participantCode;
    $('donePeriod').textContent = `${kdate(result.startDate)} ~ ${kdate(result.endDate)}`;
    $('loginPhone').value = $('phone').value;
    $('registerForm').reset();
    showView('registerDoneView');
    await loadPublicData();
  } catch (e) { toast(e.message, true); }
  finally { loading(false); }
}

async function submitLogin(event) {
  event.preventDefault();
  loading(true, '로그인하고 있어요.');
  try {
    const result = await api('/api/login', { method:'POST', body:JSON.stringify({ phone:$('loginPhone').value, pin:$('loginPin').value }) });
    state.token = result.token;
    localStorage.setItem('gamthan_token', state.token);
    $('loginPin').value = '';
    await openDashboard();
  } catch (e) { toast(e.message, true); }
  finally { loading(false); }
}

async function openDashboard() {
  loading(true, '나의 감탄일기를 불러오고 있어요.');
  try {
    const data = await api('/api/dashboard');
    state.dashboard = data;
    renderDashboard(data);
    showView('dashboardView');
  } catch (e) {
    if (!state.token) showView('loginView');
    throw e;
  } finally { loading(false); }
}

function renderDashboard(data) {
  const p = data.participant;
  $('dashboardName').textContent = p.displayName;
  $('dashboardStatus').textContent = statusText(p.status, data.completion);
  $('dashboardCourse').textContent = `${p.courseDays}일 코스`;
  $('dashboardPeriod').textContent = `${kdate(p.startDate)} ~ ${kdate(p.endDate)}`;
  $('progressText').textContent = `${p.completedDays} / ${p.courseDays}일`;
  $('progressPercent').textContent = `${p.progressPercent}%`;
  $('progressBar').style.width = `${p.progressPercent}%`;
  $('todayTitle').textContent = `오늘 ${kdate(data.today)}`;

  let message = '';
  if (p.status === 'scheduled') message = `${kdate(p.startDate)}부터 감탄일기를 작성할 수 있어요.`;
  else if (p.status === 'active') message = data.todayDiary ? '오늘 기록을 이미 남겼어요. 오늘 안에는 다시 수정할 수 있어요.' : '오늘의 탄소중립 실천을 기록해 주세요.';
  else if (p.status === 'completed') message = '🎉 감탄위크 마라톤을 완주했습니다!';
  else if (p.status === 'ended') message = data.completion.needsPhoto ? '일기는 모두 작성했어요. 인증사진 1장을 등록하면 완주입니다.' : '실천기간이 종료되었습니다.';
  else message = '참여 상태를 확인해 주세요.';
  $('todayMessage').textContent = message;

  $('writeDiaryButton').disabled = !data.canWriteToday;
  $('writeDiaryButton').textContent = data.todayDiary ? '오늘의 감탄일기 수정하기' : '오늘의 감탄일기 쓰기';

  const showCompletion = data.completion.diaryComplete && !data.completion.complete;
  $('completionSection').classList.toggle('hidden', !showCompletion);
  $('completionMessage').textContent = data.completion.photoCount > 0
    ? `현재 인증사진 ${data.completion.photoCount}장이 등록되어 있어요. 1장 이상이면 완주 조건을 충족합니다.`
    : '모든 일기를 작성했어요. 실천 인증사진을 최소 1장 등록하면 완주입니다.';
  $('uploadPhotosButton').disabled = !data.completion.canUploadPhotos;

  const list = data.diaries || [];
  $('historyCount').textContent = `${list.length}개`;
  $('historyList').innerHTML = list.length ? [...list].reverse().map((d) => {
    const tags = (d.actions || []).map((a) => `<span class="tag">${escapeHtml(a.name)}</span>`).join('');
    const other = d.other_action_text ? `<p><strong>기타:</strong> ${escapeHtml(d.other_action_text)}</p>` : '';
    return `<details class="history-item"><summary><span>${d.day_number}일차 · ${kdate(d.diary_date)}</span><span>›</span></summary><div class="history-body">${escapeHtml(d.diary_text)}${other}<div class="tag-row">${tags}</div></div></details>`;
  }).join('') : '<p class="empty">아직 작성한 감탄일기가 없습니다.</p>';
}

function openDiary() {
  const data = state.dashboard;
  if (!data?.canWriteToday) return;
  $('diaryDateLabel').textContent = kdate(data.today);
  $('diaryDayLabel').textContent = `${dateDiff(data.participant.startDate, data.today) + 1}일차`;
  document.querySelectorAll('input[name="actionCode"]').forEach((c) => c.checked = false);
  $('otherActionText').value = '';
  $('otherActionWrap').classList.add('hidden');
  $('diaryText').value = '';
  if (data.todayDiary) {
    const codes = new Set((data.todayDiary.actions || []).map((a) => a.code));
    document.querySelectorAll('input[name="actionCode"]').forEach((c) => c.checked = codes.has(c.value));
    $('otherActionText').value = data.todayDiary.other_action_text || '';
    $('otherActionWrap').classList.toggle('hidden', !codes.has('ACT08'));
    $('diaryText').value = data.todayDiary.diary_text || '';
  }
  $('diaryLength').textContent = $('diaryText').value.length;
  showView('diaryView');
}

async function saveDiary(event) {
  event.preventDefault();
  const actionCodes = [...document.querySelectorAll('input[name="actionCode"]:checked')].map((c) => c.value);
  loading(true, '오늘의 감탄일기를 저장하고 있어요.');
  try {
    const result = await api('/api/diaries', { method:'POST', body:JSON.stringify({
      actionCodes, otherActionText:$('otherActionText').value.trim(), diaryText:$('diaryText').value.trim(),
    }) });
    toast(result.message);
    await openDashboard();
  } catch (e) { toast(e.message, true); }
  finally { loading(false); }
}

async function previewSelectedPhotos() {
  const files = [...$('photoInput').files];
  if (files.length > 3) { $('photoInput').value = ''; state.selectedPhotos = []; return toast('사진은 최대 3장까지 선택할 수 있어요.', true); }
  state.selectedPhotos = files;
  $('photoPreview').innerHTML = '';
  for (const file of files) {
    const img = document.createElement('img'); img.src = URL.createObjectURL(file); img.alt = '선택한 인증사진'; $('photoPreview').appendChild(img);
  }
}

async function uploadCompletionPhotos() {
  if (!state.selectedPhotos.length) return toast('인증사진을 1장 이상 선택해 주세요.', true);
  loading(true, '사진을 자동으로 줄이고 등록하고 있어요.');
  try {
    const form = new FormData();
    for (const file of state.selectedPhotos) {
      const compressed = await compressImage(file);
      form.append('photos', compressed, compressed.name);
    }
    const result = await api('/api/completion-photos', { method:'POST', body:form });
    toast(result.message);
    state.selectedPhotos = [];
    $('photoInput').value = '';
    $('photoPreview').innerHTML = '';
    await openDashboard();
  } catch (e) { toast(e.message, true); }
  finally { loading(false); }
}

async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  const maxDim = 1280;
  const ratio = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  let width = Math.max(1, Math.round(bitmap.width * ratio));
  let height = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let quality = .82;
  let blob = await canvasBlob(canvas, 'image/webp', quality);
  while (blob.size > 360 * 1024 && quality > .48) {
    quality -= .08;
    blob = await canvasBlob(canvas, 'image/webp', quality);
  }
  if (blob.size > 900 * 1024) {
    const scale = .78;
    width = Math.round(width * scale); height = Math.round(height * scale);
    const smaller = document.createElement('canvas'); smaller.width = width; smaller.height = height;
    smaller.getContext('2d').drawImage(canvas, 0, 0, width, height);
    blob = await canvasBlob(smaller, 'image/webp', .62);
  }
  return new File([blob], `${Date.now()}.webp`, { type:'image/webp' });
}
function canvasBlob(canvas, type, quality) { return new Promise((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error('사진 압축에 실패했습니다.')), type, quality)); }

function formatPhoneInput(e) {
  const d = e.target.value.replace(/\D/g,'').slice(0,11);
  e.target.value = d.length <= 3 ? d : d.length <= 7 ? `${d.slice(0,3)}-${d.slice(3)}` : `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
}
function kdate(text) { if (!text) return '-'; const [y,m,d] = text.split('-'); return `${y}년 ${Number(m)}월 ${Number(d)}일`; }
function addDays(text, n) { const d = new Date(`${text}T00:00:00Z`); d.setUTCDate(d.getUTCDate()+Number(n)); return d.toISOString().slice(0,10); }
function dateDiff(a,b) { return Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`))/86400000); }
function statusText(status, completion) { return status === 'scheduled' ? '참여예정' : status === 'active' ? '참여중' : status === 'completed' ? '완주' : status === 'ended' && completion?.needsPhoto ? '인증사진 대기' : status === 'ended' ? '기간종료' : '취소'; }
function clearSession() { state.token=''; state.dashboard=null; localStorage.removeItem('gamthan_token'); }
function loading(on, text='처리 중...') { $('loadingText').textContent=text; $('loading').classList.toggle('hidden', !on); }
let toastTimer; function toast(message, error=false) { clearTimeout(toastTimer); const el=$('toast'); el.textContent=message; el.classList.toggle('error', error); el.classList.add('show'); toastTimer=setTimeout(()=>el.classList.remove('show'), 3200); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

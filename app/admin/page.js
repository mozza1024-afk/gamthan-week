'use client';

import { useEffect, useMemo, useState } from 'react';

async function api(path, options={}){
  const res=await fetch(`/api?path=${encodeURIComponent(path)}`,{
    ...options,
    headers:{'Content-Type':'application/json',...(options.headers||{})}
  });
  const data=await res.json().catch(()=>({success:false,message:'서버 응답을 읽지 못했습니다.'}));
  if(!res.ok||data.success===false) throw new Error(data.message||'요청 실패');
  return data;
}
const auth=t=>({Authorization:`Bearer ${t}`});
const roleName=r=>r==='super_admin'?'명륜 전체관리자':'협력기관 관리자';

export default function AdminPage(){
  const [token,setToken]=useState('');
  const [login,setLogin]=useState({email:'',password:''});
  const [setup,setSetup]=useState({setupCode:'',email:'',displayName:'',password:''});
  const [showSetup,setShowSetup]=useState(false);
  const [data,setData]=useState(null);
  const [tab,setTab]=useState('today');
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState('');
  const [selected,setSelected]=useState(null);
  const [search,setSearch]=useState('');
  const [orgFilter,setOrgFilter]=useState('');
  const [courseFilter,setCourseFilter]=useState('');
  const [dist,setDist]=useState({
    siteId:'',
    entryDate:new Date(Date.now()+9*3600000).toISOString().slice(0,10),
    distributedQty:'',
    submittedQty:'',
    note:''
  });
  const [settings,setSettings]=useState({});
  const [alloc,setAlloc]=useState({});
  const [newAdmin,setNewAdmin]=useState({email:'',displayName:'',password:'',organizationId:''});

  useEffect(()=>{
    const t=localStorage.getItem('gamthan_admin_token')||'';
    if(t)setToken(t);
  },[]);

  useEffect(()=>{
    if(token)load();
  },[token]);

  const say=m=>{
    setMsg(m);
    setTimeout(()=>setMsg(''),2800);
  };

  async function load(){
    try{
      setBusy(true);
      const d=await api('admin/data',{headers:auth(token)});
      setData(d);
      setSettings({
        APPLICATION_START_DATE:d.settings.APPLICATION_START_DATE||'',
        APPLICATION_END_DATE:d.settings.APPLICATION_END_DATE||'',
        ACTIVITY_START_DATE:d.settings.ACTIVITY_START_DATE||'',
        ACTIVITY_END_DATE:d.settings.ACTIVITY_END_DATE||'',
        ONLINE_APPLICATION_LIMIT:d.settings.ONLINE_APPLICATION_LIMIT||'100',
        OFFLINE_DIARY_TOTAL:d.settings.OFFLINE_DIARY_TOTAL||'300',
        COURSE_28_OPEN:String(d.settings.COURSE_28_OPEN||'false').toLowerCase()==='true'?'true':'false'
      });
      setAlloc(Object.fromEntries((d.siteStats||[]).map(s=>[s.id,String(s.allocated_quantity||0)])));
    }catch(e){
      say(`⚠️ ${e.message}`);
      if(e.message.includes('로그인'))logout();
    }finally{
      setBusy(false);
    }
  }

  async function doLogin(e){
    e.preventDefault();
    try{
      setBusy(true);
      const d=await api('admin/login',{method:'POST',body:JSON.stringify(login)});
      localStorage.setItem('gamthan_admin_token',d.token);
      setToken(d.token);
      say('관리자 로그인 완료');
    }catch(e){say(`⚠️ ${e.message}`)}finally{setBusy(false)}
  }

  async function doSetup(e){
    e.preventDefault();
    try{
      setBusy(true);
      const d=await api('admin/bootstrap',{method:'POST',body:JSON.stringify(setup)});
      say(d.message);
      setShowSetup(false);
      setLogin({email:setup.email,password:setup.password});
    }catch(e){say(`⚠️ ${e.message}`)}finally{setBusy(false)}
  }

  function logout(){
    localStorage.removeItem('gamthan_admin_token');
    setToken('');
    setData(null);
  }

  async function saveDist(e){
    e.preventDefault();
    try{
      setBusy(true);
      await api('admin/distribution',{
        method:'POST',
        headers:auth(token),
        body:JSON.stringify({
          ...dist,
          distributedQty:Number(dist.distributedQty||0),
          submittedQty:Number(dist.submittedQty||0)
        })
      });
      say('배포·제출 수량을 등록했습니다.');
      setDist({...dist,distributedQty:'',submittedQty:'',note:''});
      await load();
    }catch(e){say(`⚠️ ${e.message}`)}finally{setBusy(false)}
  }

  async function saveSettings(e){
    e.preventDefault();
    try{
      setBusy(true);
      await api('admin/settings',{
        method:'POST',
        headers:auth(token),
        body:JSON.stringify({
          settings,
          siteAllocations:Object.entries(alloc).map(([siteId,allocatedQuantity])=>({
            siteId,
            allocatedQuantity:Number(allocatedQuantity||0)
          }))
        })
      });
      say('운영 설정을 저장했습니다.');
      await load();
    }catch(e){say(`⚠️ ${e.message}`)}finally{setBusy(false)}
  }

  async function createAdmin(e){
    e.preventDefault();
    try{
      setBusy(true);
      await api('admin/create-user',{
        method:'POST',
        headers:auth(token),
        body:JSON.stringify(newAdmin)
      });
      say('기관관리자 계정을 만들었습니다.');
      setNewAdmin({email:'',displayName:'',password:'',organizationId:''});
    }catch(e){say(`⚠️ ${e.message}`)}finally{setBusy(false)}
  }

  async function cancelParticipant(p){
    if(!p?.id)return;
    const ok=window.confirm(`${p.display_name}님의 신청을 취소할까요?\n\n취소하면 온라인 정원에서 제외되고 해당 참가자는 로그인할 수 없습니다.`);
    if(!ok)return;
    try{
      setBusy(true);
      const d=await api('admin/cancel-participant',{
        method:'POST',
        headers:auth(token),
        body:JSON.stringify({participantId:p.id})
      });
      say(d.message||'신청을 취소했습니다.');
      setSelected(null);
      await load();
    }catch(e){say(`⚠️ ${e.message}`)}finally{setBusy(false)}
  }

  async function openPhoto(id){
    try{
      const d=await api(`admin/photo/${id}`,{headers:auth(token)});
      window.open(d.url,'_blank','noopener,noreferrer');
    }catch(e){say(`⚠️ ${e.message}`)}
  }

  const participants=useMemo(()=>{
    let rows=data?.participants||[];
    if(search){
      const s=search.toLowerCase();
      rows=rows.filter(p=>[p.display_name,p.phone_masked,p.organization_name_snapshot].some(v=>String(v||'').toLowerCase().includes(s)));
    }
    if(orgFilter)rows=rows.filter(p=>String(p.organization_id)===orgFilter);
    if(courseFilter)rows=rows.filter(p=>String(p.course_days)===courseFilter);
    return rows;
  },[data,search,orgFilter,courseFilter]);

  const selectedDiaries=selected?(data?.diaries||[]).filter(d=>String(d.participant_id)===String(selected.id)):[];
  const selectedPhotos=selected?(data?.photos||[]).filter(p=>String(p.participant_id)===String(selected.id)):[];

  function csv(type){
    const rows=type==='participants'?participants:(data?.diaries||[]);
    const cols=type==='participants'
      ?['display_name','contact_phone','organization_name_snapshot','course_days','start_date','end_date','diary_count','photo_count','is_completed']
      :['participant_id','diary_date','day_number','diary_text','other_action_text'];
    const text='\ufeff'+[
      cols.join(','),
      ...rows.map(r=>cols.map(c=>`"${String(r[c]??'').replaceAll('"','""')}"`).join(','))
    ].join('\n');
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));
    a.download=type==='participants'?'감탄위크_신청자.csv':'감탄위크_감탄일기.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if(!token)return <main className="app-shell">
    <section className="panel center-panel" style={{textAlign:'left'}}>
      <p className="eyebrow">감탄위크 운영자</p>
      <h2>관리자 로그인</h2>
      <p className="panel-intro">명륜 전체관리자와 협력기관 관리자는 각자의 계정으로 로그인합니다.</p>
      <form className="form-grid" onSubmit={doLogin}>
        <label>이메일<input type="email" value={login.email} onChange={e=>setLogin({...login,email:e.target.value})} required/></label>
        <label>비밀번호<input type="password" value={login.password} onChange={e=>setLogin({...login,password:e.target.value})} required/></label>
        <button className="button primary">관리자 로그인</button>
      </form>
      <button className="text-button" style={{marginTop:18}} onClick={()=>setShowSetup(!showSetup)}>처음 한 번만: 명륜 전체관리자 만들기</button>
      {showSetup&&<form className="form-grid" onSubmit={doSetup} style={{marginTop:16,paddingTop:16,borderTop:'1px solid #e4ece1'}}>
        <div className="notice">Vercel에 등록한 ADMIN_SETUP_CODE가 필요합니다. 전체관리자는 최초 1회만 생성됩니다.</div>
        <label>초기 설정 코드<input value={setup.setupCode} onChange={e=>setSetup({...setup,setupCode:e.target.value})} required/></label>
        <label>관리자 이름<input value={setup.displayName} onChange={e=>setSetup({...setup,displayName:e.target.value})} required/></label>
        <label>관리자 이메일<input type="email" value={setup.email} onChange={e=>setSetup({...setup,email:e.target.value})} required/></label>
        <label>관리자 비밀번호 <small>10자 이상</small><input type="password" value={setup.password} onChange={e=>setSetup({...setup,password:e.target.value})} minLength={10} required/></label>
        <button className="button accent">명륜 전체관리자 만들기</button>
      </form>}
    </section>
    {msg&&<div className="toast show">{msg}</div>}
    {busy&&<div className="loading"><div className="spinner"/><p>처리 중...</p></div>}
  </main>;

  return <main className="admin-shell">
    {busy&&<div className="loading"><div className="spinner"/><p>처리 중...</p></div>}
    {msg&&<div className="toast show">{msg}</div>}

    <header className="admin-top">
      <div className="admin-title">
        <span className="pill">{roleName(data?.admin?.role)}</span>
        <h1>감탄위크 운영 대시보드</h1>
        <p>{data?.admin?.name||'관리자'} · 필요한 숫자와 참가자 기록을 한곳에서 확인합니다.</p>
      </div>
      <button className="mini-button" onClick={logout}>로그아웃</button>
    </header>

    <section className="admin-grid">
      <div className="stat-card"><span>온라인 신청</span><strong>{data?.stats?.onlineCount||0}<small> / {data?.settings?.ONLINE_APPLICATION_LIMIT||100}</small></strong></div>
      <div className="stat-card"><span>완주</span><strong>{data?.stats?.completedCount||0}<small>명</small></strong></div>
      <div className="stat-card"><span>오프라인 배포</span><strong>{data?.stats?.offlineDistributed||0}<small> / {data?.stats?.offlineTarget||300}부</small></strong></div>
      <div className="stat-card"><span>오프라인 제출</span><strong>{data?.stats?.offlineSubmitted||0}<small>부</small></strong></div>
    </section>

    <nav className="admin-tabs">
      {[
        ['today','오늘 현황'],
        ['participants','참가자'],
        ['offline','오프라인 일기장'],
        ['settings','설정']
      ].map(([k,n])=><button key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{n}</button>)}
    </nav>

    {tab==='today'&&<>
      <section className="admin-card">
        <h3>오늘 확인할 것</h3>
        <div className="two-col" style={{marginTop:14}}>
          <div className="notice"><strong>3일 이상 미기록</strong><br/><span style={{fontSize:30,fontWeight:900}}>{data?.stats?.followupCount||0}</span>명</div>
          <div className="notice"><strong>오프라인 남은 수량</strong><br/><span style={{fontSize:30,fontWeight:900}}>{data?.stats?.offlineRemaining||0}</span>부</div>
        </div>
        {(data?.participants||[]).filter(p=>p.needs_followup).length>0&&<div style={{marginTop:14}}>
          <strong>연락이 필요한 참여자</strong>
          <div className="table-wrap" style={{marginTop:8}}>
            <table>
              <thead><tr><th>이름</th><th>기관</th><th>연락처</th><th>마지막 기록</th></tr></thead>
              <tbody>{data.participants.filter(p=>p.needs_followup).map(p=><tr key={p.id}><td>{p.display_name}</td><td>{p.organization_name_snapshot}</td><td>{p.contact_phone||p.phone_masked}</td><td>{p.last_diary_date||'기록 없음'}</td></tr>)}</tbody>
            </table>
          </div>
        </div>}
      </section>

      <section className="admin-card">
        <h3>6개 현장 접수처 배포현황</h3>
        <div className="site-bars" style={{marginTop:14}}>
          {data?.siteStats?.map(s=>{
            const base=Number(s.allocated_quantity||0);
            const pct=base?Math.min(100,Math.round(s.distributed_qty/base*100)):0;
            return <div className="site-row" key={s.id}>
              <div className="site-head"><div><strong>{s.site_name}</strong><br/><small>{s.organization_name}</small></div><strong>{s.distributed_qty}/{base||'-'}부</strong></div>
              <div className="bar"><span style={{width:`${pct}%`}}/></div>
              <small className="muted">잔여 {s.remaining_qty}부 · 제출 {s.submitted_qty}부</small>
            </div>;
          })}
        </div>
      </section>
    </>}

    {tab==='participants'&&<section className="admin-card">
      <div className="section-heading">
        <h3>참가자</h3>
        <div><button className="mini-button" onClick={()=>csv('participants')}>신청자·연락처 CSV</button> <button className="mini-button" onClick={()=>csv('diaries')}>일기 CSV</button></div>
      </div>
      <div className="toolbar">
        <input placeholder="이름·기관 검색" value={search} onChange={e=>setSearch(e.target.value)}/>
        {data?.admin?.role==='super_admin'?<select value={orgFilter} onChange={e=>setOrgFilter(e.target.value)}><option value="">전체 기관</option>{data?.organizations?.map(o=><option key={o.id} value={String(o.id)}>{o.organization_name}</option>)}</select>:<div/>}
        <select value={courseFilter} onChange={e=>setCourseFilter(e.target.value)}><option value="">전체 코스</option>{[7,14,21,28].map(n=><option key={n} value={n}>{n}일</option>)}</select>
        <span className="pill">{participants.length}명</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>이름</th><th>기관</th><th>연락처</th><th>코스</th><th>일기</th><th>상태</th><th/></tr></thead>
          <tbody>{participants.map(p=><tr key={p.id}><td>{p.display_name}</td><td>{p.organization_name_snapshot}</td><td>{p.phone_masked}</td><td>{p.course_days}일</td><td>{p.diary_count}/{p.course_days}</td><td>{p.is_completed?'완주':p.needs_followup?'미기록 확인':'진행중'}</td><td><button className="mini-button" onClick={()=>setSelected(p)}>보기</button></td></tr>)}</tbody>
        </table>
      </div>

      {selected&&<div className="admin-card" style={{boxShadow:'none',background:'#f9fbf7'}}>
        <div className="section-heading">
          <h3>{selected.display_name}님의 감탄일기</h3>
          <button className="mini-button" onClick={()=>setSelected(null)}>닫기</button>
        </div>
        <p className="muted">{selected.organization_name_snapshot} · {selected.course_days}일 코스 · {selected.phone_masked}</p>
        <div className="notice" style={{marginTop:12}}>
          <strong>신청 취소</strong><br/>
          <small>취소하면 온라인 정원에서 제외되고, 해당 참가자는 로그인할 수 없습니다. 취소된 번호는 신청기간 안에 다시 신청할 수 있습니다.</small>
          <div style={{marginTop:10}}><button className="mini-button" type="button" onClick={()=>cancelParticipant(selected)}>이 참가자 신청 취소</button></div>
        </div>
        {selectedDiaries.length?selectedDiaries.map(d=><div className="history-item" key={d.id} style={{marginTop:8}}><strong>{d.day_number}일차 · {d.diary_date}</strong><div className="history-body">{d.diary_text}</div><div className="tag-row">{d.actions?.map(a=><span className="tag" key={a.code}>{a.name}</span>)}</div></div>):<p className="empty">작성된 일기가 없습니다.</p>}
        <div className="tag-row" style={{marginTop:14}}>{selectedPhotos.map(p=><button className="mini-button" key={p.id} onClick={()=>openPhoto(p.id)}>인증사진 {p.photo_no} 보기</button>)}</div>
      </div>}
    </section>}

    {tab==='offline'&&<>
      <section className="admin-card">
        <h3>오프라인 일기장 배포·제출 등록</h3>
        <p className="panel-intro">담당자는 누적 수량을 계산하지 않고, <strong>오늘 추가로 나간 수량 / 오늘 제출받은 수량</strong>만 입력합니다.</p>
        <form className="form-grid" onSubmit={saveDist}>
          <label>배포지점<select value={dist.siteId} onChange={e=>setDist({...dist,siteId:e.target.value})} required><option value="">지점 선택</option>{data?.siteStats?.map(s=><option key={s.id} value={s.id}>{s.organization_name} · {s.site_name}</option>)}</select></label>
          <div className="two-col">
            <label>날짜<input type="date" value={dist.entryDate} onChange={e=>setDist({...dist,entryDate:e.target.value})} required/></label>
            <label>오늘 배포한 수량<input type="number" min="0" step="1" value={dist.distributedQty} onChange={e=>setDist({...dist,distributedQty:e.target.value})} placeholder="예: 8"/></label>
          </div>
          <label>오늘 제출받은 일기장 수량<input type="number" min="0" step="1" value={dist.submittedQty} onChange={e=>setDist({...dist,submittedQty:e.target.value})} placeholder="예: 3"/></label>
          <label>비고 <small>선택</small><input value={dist.note} onChange={e=>setDist({...dist,note:e.target.value})} maxLength={200} placeholder="예: 추가 20부 요청"/></label>
          <button className="button primary">배포·제출 수량 등록</button>
        </form>
      </section>
      <section className="admin-card">
        <h3>지점별 누적 현황</h3>
        <div className="table-wrap" style={{marginTop:12}}><table><thead><tr><th>기관</th><th>배포지점</th><th>배정</th><th>누적 배포</th><th>잔여</th><th>제출</th></tr></thead><tbody>{data?.siteStats?.map(s=><tr key={s.id}><td>{s.organization_name}</td><td>{s.site_name}<br/><small className="muted">{s.address}</small></td><td>{s.allocated_quantity}</td><td>{s.distributed_qty}</td><td>{s.remaining_qty}</td><td>{s.submitted_qty}</td></tr>)}</tbody></table></div>
      </section>
    </>}

    {tab==='settings'&&<>
      {data?.admin?.role!=='super_admin'
        ?<section className="admin-card"><div className="notice">운영 설정과 기관관리자 계정 생성은 명륜 전체관리자만 할 수 있습니다.</div></section>
        :<>
          <section className="admin-card">
            <h3>운영 설정</h3>
            <p className="panel-intro">기간·정원과 28일 코스 접수 여부를 여기에서 바꿀 수 있습니다.</p>
            <form className="form-grid" onSubmit={saveSettings}>
              <div className="two-col">
                <label>신청 시작일<input type="date" value={settings.APPLICATION_START_DATE||''} onChange={e=>setSettings({...settings,APPLICATION_START_DATE:e.target.value})}/></label>
                <label>신청 종료일<input type="date" value={settings.APPLICATION_END_DATE||''} onChange={e=>setSettings({...settings,APPLICATION_END_DATE:e.target.value})}/></label>
              </div>
              <div className="two-col">
                <label>실천 시작일<input type="date" value={settings.ACTIVITY_START_DATE||''} onChange={e=>setSettings({...settings,ACTIVITY_START_DATE:e.target.value})}/></label>
                <label>실천 종료일<input type="date" value={settings.ACTIVITY_END_DATE||''} onChange={e=>setSettings({...settings,ACTIVITY_END_DATE:e.target.value})}/></label>
              </div>
              <div className="two-col">
                <label>온라인 정원<input type="number" value={settings.ONLINE_APPLICATION_LIMIT||''} onChange={e=>setSettings({...settings,ONLINE_APPLICATION_LIMIT:e.target.value})}/></label>
                <label>오프라인 일기장 총수량<input type="number" value={settings.OFFLINE_DIARY_TOTAL||''} onChange={e=>setSettings({...settings,OFFLINE_DIARY_TOTAL:e.target.value})}/></label>
              </div>
              <label>
                28일 코스 접수
                <select value={settings.COURSE_28_OPEN||'false'} onChange={e=>setSettings({...settings,COURSE_28_OPEN:e.target.value})}>
                  <option value="false">마감</option>
                  <option value="true">접수중</option>
                </select>
                <small>마감으로 두면 기존 28일 신청자는 그대로 유지되고 신규 28일 신청만 막힙니다.</small>
              </label>
              <h3 style={{marginTop:8}}>6개 지점 배정수량</h3>
              {data?.siteStats?.map(s=><label key={s.id}>{s.organization_name} · {s.site_name}<input type="number" min="0" value={alloc[s.id]||'0'} onChange={e=>setAlloc({...alloc,[s.id]:e.target.value})}/></label>)}
              <button className="button primary">운영 설정 저장</button>
            </form>
          </section>

          <section className="admin-card">
            <h3>협력기관 관리자 계정 만들기</h3>
            <p className="panel-intro">기관관리자는 자기 기관 참가자와 자기 기관의 오프라인 배포지점만 볼 수 있습니다.</p>
            <form className="form-grid" onSubmit={createAdmin}>
              <label>기관<select value={newAdmin.organizationId} onChange={e=>setNewAdmin({...newAdmin,organizationId:e.target.value})} required><option value="">기관 선택</option>{data?.adminOrganizations?.map(o=><option key={o.id} value={String(o.id)}>{o.organization_name}</option>)}</select></label>
              <label>담당자 이름<input value={newAdmin.displayName} onChange={e=>setNewAdmin({...newAdmin,displayName:e.target.value})} required/></label>
              <label>이메일<input type="email" value={newAdmin.email} onChange={e=>setNewAdmin({...newAdmin,email:e.target.value})} required/></label>
              <label>임시 비밀번호 <small>10자 이상</small><input type="password" minLength={10} value={newAdmin.password} onChange={e=>setNewAdmin({...newAdmin,password:e.target.value})} required/></label>
              <button className="button accent">기관관리자 계정 만들기</button>
            </form>
          </section>
        </>
      }
    </>}
  </main>;
}

'use client';
import {useEffect,useRef,useState} from 'react';
const fetchApi=async(token,body)=>{
 const r=await fetch('/api/restart',{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},...(body?{body:JSON.stringify(body)}:{})});
 const j=await r.json();if(!r.ok||j.success===false)throw Error(j.message||'요청 실패');return j;
};
const dates=()=>{const now=new Date(Date.now()+9*3600000).toISOString().slice(0,10);return Array.from({length:6},(_,i)=>'2026-10-'+String(i+20).padStart(2,'0')).filter(d=>d>=now)};
const topics=[['marathon','감탄위크 실천 소감'],['daily','일상 속 탄소중립'],['climate','기후위기와 우리의 삶'],['wonju','원주시 기후정책 제안'],['free','환경·지속가능성 자유주제']];
export default function Restart(){
 const diaryRef=useRef(null);
 const [token,setToken]=useState(''),[login,setLogin]=useState({phone:'',birth6:''}),[data,setData]=useState(null),[start,setStart]=useState(''),[codes,setCodes]=useState([]),[diary,setDiary]=useState(''),[other,setOther]=useState(''),[essay,setEssay]=useState({topic:'marathon',title:'',body:''}),[err,setErr]=useState(''),[busy,setBusy]=useState(false),[flash,setFlash]=useState('');
 useEffect(()=>{setToken(localStorage.getItem('gamthan_token')||'')},[]);
 async function load(){if(!token)return;try{setData(await fetchApi(token));setErr('')}catch(e){if(/로그인 시간이 만료|로그인이 필요/.test(e.message)){localStorage.removeItem('gamthan_token');setToken('');setData(null);setErr('로그인 시간이 만료되었습니다. 기존 참가자 계정으로 다시 로그인해 주세요.')}else setErr(e.message)}}

 async function loginHere(event){
  event.preventDefault();
  if(busy)return;
  setBusy(true);
  setErr('');
  try {
   const response=await fetch('/api?path=login',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({phone:login.phone,birth6:login.birth6})
   });
   const result=await response.json().catch(()=>({success:false,message:'서버 응답을 읽을 수 없습니다.'}));
   if(!response.ok||result.success===false||!result.token)throw Error(result.message||'로그인에 실패했습니다.');
   localStorage.setItem('gamthan_token',result.token);
   setData(null);
   setLogin({phone:'',birth6:''});
   setToken(result.token);
  }catch(e){setErr(e.message);}
  finally{setBusy(false);}
 }
 useEffect(()=>{if(token)load()},[token]);
 useEffect(()=>{if(data?.essay)setEssay({topic:data.essay.topic||'marathon',title:data.essay.title||'',body:data.essay.body||''})},[data?.essay?.id]);
 async function save(body){try{setBusy(true);setErr('');setFlash('');await fetchApi(token,body);await load();if(body.kind==='join'||body.kind==='change-start'){setTimeout(()=>diaryRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),120)}else if(body.kind==='diary'){setFlash('✅ 오늘의 7KM 감탄일기를 저장했어요! 아래에서 저장한 기록을 바로 확인할 수 있습니다.');setTimeout(()=>document.getElementById('restart-records')?.scrollIntoView({behavior:'smooth',block:'start'}),180)}else alert(body.kind==='essay'?(body.submit?'공모전 제출이 완료되었습니다.':'임시저장되었습니다.'):'저장되었습니다.')}catch(e){setErr(e.message)}finally{setBusy(false)}}
 const attempt=data?.attempt,diaries=data?.diaries||[],completed=attempt?.status==='completed'||new Set(diaries.map(x=>x.day_number)).size===7;
 const canDiary=attempt&&data.today>=attempt.start_date&&data.today<=attempt.end_date;
 const todayDiary=diaries.find(x=>x.diary_date===data?.today);
 useEffect(()=>{if(todayDiary){setCodes(todayDiary.action_codes||[]);setDiary(todayDiary.diary_text||'');setOther(todayDiary.other_action_text||'')}},[todayDiary?.diary_date]);
 const card={background:'#fff',border:'1px solid #dce8dd',borderRadius:16,padding:20,margin:'16px 0'};
 const btn={background:'#24744f',border:0,color:'white',borderRadius:10,padding:'13px 18px',cursor:'pointer',fontWeight:700};
 return <main style={{maxWidth:660,margin:'0 auto',padding:'24px 16px 80px',fontFamily:'system-ui,sans-serif',color:'#253b31',background:'#f7faf7',minHeight:'100vh'}}>
 <a href="/" style={{color:'#16804d',fontWeight:700,textDecoration:'none'}}>← 처음 화면으로</a>
 {!data?.attempt&&<section style={{...card,textAlign:'center',borderRadius:25,marginTop:22,padding:'25px 20px'}}>
 <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:12}}><span style={{background:'#ddf7e8',color:'#16804d',padding:'5px 10px',borderRadius:20}}>다시 도전할 기회!</span><span style={{color:'#6b8075'}}>감탄위크 실천마라톤</span></div>
 <div style={{fontSize:36,color:'#169954',marginTop:12}}>♧</div>
 <h1 style={{fontSize:26,margin:'3px 0 5px'}}>7KM 다시출발 마라톤</h1>
 <p style={{color:'#68766c',margin:'0 0 22px'}}>다시 시작하는 7일, 다시 만나는 완주의 기쁨!</p>
 <div style={{textAlign:'left',padding:'12px 0',borderBottom:'1px solid #e2ebe3',display:'flex',gap:16,alignItems:'center'}}><span style={{fontSize:26}}>☕</span><div><strong>7KM 완주 시 음료 쿠폰 지급!</strong><p style={{color:'#68766c',margin:'5px 0'}}>다시출발 마라톤도 완주하면 음료 쿠폰을 받을 수 있어요.</p></div></div>
 <div style={{textAlign:'left',padding:'15px 0',display:'flex',gap:16,alignItems:'center'}}><span style={{fontSize:26}}>🏅</span><div><strong>완주자 대상 소감문 공모전 참여 기회!</strong><p style={{color:'#68766c',margin:'5px 0'}}>소정의 상품과 별도 시상식도 준비되어 있어요.</p></div></div>
 <div style={{textAlign:'left',paddingTop:8}}><strong>참여 안내</strong><ul style={{lineHeight:1.9,paddingLeft:24}}><li>기존 마라톤 미완주자 중 문자 안내를 받은 분 대상</li><li>다시 1일차부터 7일간 실천</li><li>기존 도전 기록은 별도로 보존</li><li>완주 후 소감문 공모전은 선택 참여</li><li>소감문은 임시저장 가능, 11월 16일까지 제출</li></ul></div>
 <p style={{fontSize:12,color:'#7b867d'}}>개별 안내 문자를 받으신 분에 한해 참여해 주세요.</p>
 </section>}
 {!token&&<section style={{...card,padding:24}}>
  <h2 style={{marginTop:0}}>기존 참가자 로그인</h2>
  <p style={{fontSize:14,color:'#64746b'}}>다른 화면으로 이동할 필요 없이 여기서 로그인하세요. 이미 다시출발을 신청했다면 신청 기록과 7KM 감탄일기가 바로 나타납니다.</p>
  <form onSubmit={loginHere} style={{display:'grid',gap:14}}>
   <label style={{fontWeight:700}}>휴대전화번호
    <input type="tel" inputMode="tel" autoComplete="tel" required placeholder="01012345678" value={login.phone} onChange={e=>setLogin(v=>({...v,phone:e.target.value}))} style={{display:'block',marginTop:5,width:'100%',boxSizing:'border-box',border:'1px solid #b9cdbd',borderRadius:10,padding:13,fontSize:16}}/>
   </label>
   <label style={{fontWeight:700}}>생년월일 6자리
    <input type="password" inputMode="numeric" autoComplete="off" minLength={6} maxLength={6} pattern="[0-9]{6}" required placeholder="예: 901231" value={login.birth6} onChange={e=>setLogin(v=>({...v,birth6:e.target.value.replace(/[^0-9]/g,'').slice(0,6)}))} style={{display:'block',marginTop:5,width:'100%',boxSizing:'border-box',border:'1px solid #b9cdbd',borderRadius:10,padding:13,fontSize:16}}/>
   </label>
   <button type="submit" disabled={busy} style={{...btn,width:'100%',fontSize:16,padding:15}}>{busy?'로그인 확인 중...':'기존 계정으로 로그인하고 7KM 이어가기 →'}</button>
  </form>
 </section>}
 {err&&<div role="alert" style={{...card,color:'#b42424'}}>{err}</div>}
 {data&&<><div ref={diaryRef} style={{scrollMarginTop:20,...card}}><div style={{background:'#dff6e8',color:'#135c38',borderRadius:9,padding:'6px 10px',display:'inline-block',fontSize:13,fontWeight:800}}>🌱 현재 진행 중인 새 도전 · 7KM</div><h2 style={{margin:'12px 0 8px'}}>{data.p.display_name} 님의 7KM 다시출발</h2><p style={{fontSize:14,color:'#66756b'}}>이 화면은 기존 {data.p.course_days}KM와 별도로 저장되는 <b>새 7KM 도전</b>입니다.</p>
 {!attempt? <>{data.eligible?<><p>원하는 출발일을 선택해 주세요. 10월 31일까지 7일간 실천해야 해요.</p><label>출발일 <select value={start} onChange={e=>setStart(e.target.value)}><option value="">날짜 선택</option>{dates().map(d=><option key={d} value={d}>{d}</option>)}</select></label><p><button disabled={!start||busy} style={btn} onClick={()=>save({kind:'join',startDate:start})}>7KM 다시출발 신청</button></p></>:<p>기존 코스 종료 후 미완주가 확정된 분만 신청할 수 있어요. 현재 기존 코스는 그대로 이어가 주세요.</p>}</>:<><p><b>출발일:</b> {attempt.start_date} / <b>완주 예정:</b> {attempt.end_date}</p>{attempt.status==='active'&&diaries.length===0&&data.today<attempt.start_date&&data.today<='2026-10-25'&&(
   <div style={{background:'#eaf8ee',border:'1px solid #b9dfc2',borderRadius:12,padding:14,margin:'14px 0'}}>
    <strong>출발일을 잘못 선택하셨나요?</strong>
    <p style={{margin:'8px 0 12px'}}>아직 일기를 작성하지 않았다면 기존 신청을 취소하지 않고 오늘({data.today})부터 시작하도록 변경할 수 있어요.</p>
    <button type="button" disabled={busy} style={{...btn,width:'100%'}} onClick={()=>{
     if(window.confirm('출발일을 오늘('+data.today+')로 변경할까요? 기존 7KM 신청은 유지되고 오늘부터 감탄일기를 쓸 수 있습니다.')){
      save({kind:'change-start',startDate:data.today});
     }
    }}>오늘부터 시작하도록 출발일 변경하기 →</button>
   </div>
  )}<h3 style={{fontSize:25,color:'#14643e',margin:'15px 0 8px'}}>나의 새 도전: {diaries.length} / 7KM</h3><progress value={diaries.length} max={7} style={{width:'100%',height:16}}/><p style={{margin:'12px 0'}}><button type="button" onClick={()=>document.getElementById('restart-records')?.scrollIntoView({behavior:'smooth',block:'start'})} style={{...btn,background:'#f5d044',color:'#243822',width:'100%',fontSize:17,padding:14}}>📖 저장한 7KM 감탄일기 {diaries.length}건 보기 ↓</button></p>{canDiary?<><p style={{color:'#24744f',fontWeight:700}}>✅ 신청 완료! 오늘부터 감탄일기를 작성할 수 있어요.</p><button style={btn} onClick={()=>document.getElementById('restart-diary')?.scrollIntoView({behavior:'smooth',block:'start'})}>오늘의 감탄일기 쓰기 ↓</button></>:!completed?<p style={{background:'#fff4d6',padding:12,borderRadius:10}}>✅ 다시출발 신청이 완료됐어요. 선택한 출발일인 <b>{attempt.start_date}</b>부터 감탄일기를 작성할 수 있습니다. 그날 다시 접속해 주세요.</p>:null}{completed&&<p>🎉 7KM 완주! 음료 쿠폰 지급 대상입니다. 쿠폰 지급 일정은 운영자 안내를 확인해 주세요.</p>}</>}
 </div>

 {attempt&&<section id="restart-records" style={{...card,scrollMarginTop:15,border:'2px solid #9acfac'}}>
  <h2 style={{margin:'0 0 8px',fontSize:23}}>📖 나의 7KM 다시출발 기록 <span style={{color:'#13834b'}}>{diaries.length}건</span></h2>
  <p style={{fontSize:14,color:'#64746b',margin:'0 0 14px'}}>이곳에서 새 7KM 감탄일기만 확인할 수 있어요. 날짜를 누르면 실천 내용을 볼 수 있습니다.</p>
  {flash&&<p role="status" style={{background:'#e4f7e9',color:'#126638',borderRadius:12,padding:12,fontWeight:700}}>{flash}</p>}
  {!diaries.length?<p style={{background:'#f5f8f5',padding:16,borderRadius:12}}>아직 저장된 새 7KM 감탄일기가 없습니다. 첫 일기를 저장하면 여기에 나타납니다.</p>:
   [...diaries].sort((a,b)=>b.diary_date.localeCompare(a.diary_date)).map((item,i)=>(
    <details key={item.diary_date} open={i===0} style={{border:'1px solid #d4e5d8',borderRadius:12,marginTop:9,background:'#fff'}}>
     <summary style={{cursor:'pointer',fontWeight:800,padding:'15px 12px',fontSize:16}}>✅ {item.day_number}일차 · {item.diary_date.replaceAll('-','.')} <span style={{color:'#16804d',fontSize:13}}>저장 완료</span></summary>
     <div style={{borderTop:'1px solid #e2eee3',padding:'13px 15px'}}>
      <p style={{fontWeight:700,margin:'0 0 8px'}}>오늘의 탄소중립 실천</p>
      <p style={{fontSize:14,color:'#4b6254',margin:'0 0 14px'}}>{(item.action_codes||[]).map(code=>data.actions?.find(x=>x.action_code===code)?.action_name||code).join(' · ')||'실천 기록'}{item.other_action_text?' · '+item.other_action_text:''}</p>
      <p style={{whiteSpace:'pre-wrap',lineHeight:1.7,margin:0}}>{item.diary_text}</p>
     </div>
    </details>
   ))}
 </section>}

 {canDiary&&<div id="restart-diary" style={{...card,scrollMarginTop:20}}><h2>오늘의 다시출발 감탄일기</h2><p>원래 코스의 감탄일기와 별도로 저장됩니다. 같은 날짜는 수정할 수 있어요.</p><fieldset><legend>오늘 실천한 행동 (1개 이상)</legend>{(data.actions||[]).map(a=><label key={a.action_code} style={{display:'block',padding:5}}><input type="checkbox" checked={codes.includes(a.action_code)} onChange={e=>setCodes(v=>e.target.checked?[...v,a.action_code]:v.filter(x=>x!==a.action_code))}/> {a.action_name}</label>)}</fieldset><label>기타 실천<input style={{display:'block',width:'100%',padding:9,boxSizing:'border-box'}} value={other} onChange={e=>setOther(e.target.value)}/></label><label>오늘의 감탄일기 (10~500자)<textarea style={{display:'block',width:'100%',minHeight:150,padding:10,boxSizing:'border-box'}} value={diary} onChange={e=>setDiary(e.target.value)} /></label><p>{diary.length}자</p><button disabled={busy} style={btn} onClick={()=>save({kind:'diary',actionCodes:codes,otherActionText:other,diaryText:diary})}>오늘의 일기 저장</button></div>}
 {(completed||data.p.is_completed)&&<div style={card}><h2>🏆 온기동행 탄소중립 실천·생각 공모전</h2><p>마라톤 참여 소감, 평소 탄소중립 실천, 기후위기, 원주시 기후정책 제안 등 자유롭게 작성해 주세요.</p><p><b>11월 16일까지 제출 · 1,000자 내외 권장 · 임시저장 가능</b></p><p>선택 참여이며, 우수작에는 소정의 상품과 별도 시상식이 있습니다.</p><label>주제<select disabled={data.essay?.status==='submitted'} value={essay.topic} onChange={e=>setEssay({...essay,topic:e.target.value})}>{topics.map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><p><label>글 제목<input disabled={data.essay?.status==='submitted'} style={{display:'block',width:'100%',padding:9,boxSizing:'border-box'}} value={essay.title} onChange={e=>setEssay({...essay,title:e.target.value})}/></label></p><label>나의 이야기<textarea disabled={data.essay?.status==='submitted'} value={essay.body} onChange={e=>setEssay({...essay,body:e.target.value})} style={{display:'block',minHeight:230,width:'100%',padding:10,boxSizing:'border-box'}} /></label><p>{essay.body.length}자</p>{data.essay?.status==='submitted'?<p>✅ 최종 제출 완료</p>:<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button disabled={busy} style={btn} onClick={()=>save({kind:'essay',...essay,submit:false})}>임시저장</button><button disabled={busy||!essay.title.trim()||!essay.body.trim()} style={btn} onClick={()=>{if(confirm('제출 후에는 수정할 수 없습니다. 최종 제출할까요?'))save({kind:'essay',...essay,submit:true})}}>최종 제출</button></div>}</div>}
 </>}
 </main>
}

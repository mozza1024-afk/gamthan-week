'use client';
import {useEffect,useState} from 'react';
const fetchApi=async(token,body)=>{
 const r=await fetch('/api/restart',{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},...(body?{body:JSON.stringify(body)}:{})});
 const j=await r.json();if(!r.ok||j.success===false)throw Error(j.message||'요청 실패');return j;
};
const dates=()=>{const now=new Date(Date.now()+9*3600000).toISOString().slice(0,10);return Array.from({length:6},(_,i)=>'2026-10-'+String(i+20).padStart(2,'0')).filter(d=>d>=now)};
const topics=[['marathon','감탄위크 실천 소감'],['daily','일상 속 탄소중립'],['climate','기후위기와 우리의 삶'],['wonju','원주시 기후정책 제안'],['free','환경·지속가능성 자유주제']];
export default function Restart(){
 const [token,setToken]=useState(''),[data,setData]=useState(null),[start,setStart]=useState(''),[codes,setCodes]=useState([]),[diary,setDiary]=useState(''),[other,setOther]=useState(''),[essay,setEssay]=useState({topic:'marathon',title:'',body:''}),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{setToken(localStorage.getItem('gamthan_token')||'')},[]);
 async function load(){if(!token)return;try{setData(await fetchApi(token));setErr('')}catch(e){setErr(e.message)}}
 useEffect(()=>{if(token)load()},[token]);
 useEffect(()=>{if(data?.essay)setEssay({topic:data.essay.topic||'marathon',title:data.essay.title||'',body:data.essay.body||''})},[data?.essay?.id]);
 async function save(body){try{setBusy(true);setErr('');await fetchApi(token,body);await load();alert(body.kind==='essay'?(body.submit?'공모전 제출이 완료되었습니다.':'임시저장되었습니다.'):'저장되었습니다.')}catch(e){setErr(e.message)}finally{setBusy(false)}}
 const attempt=data?.attempt,diaries=data?.diaries||[],completed=attempt?.status==='completed'||new Set(diaries.map(x=>x.day_number)).size===7;
 const canDiary=attempt&&data.today>=attempt.start_date&&data.today<=attempt.end_date;
 const todayDiary=diaries.find(x=>x.diary_date===data?.today);
 useEffect(()=>{if(todayDiary){setCodes(todayDiary.action_codes||[]);setDiary(todayDiary.diary_text||'');setOther(todayDiary.other_action_text||'')}},[todayDiary?.diary_date]);
 const card={background:'#fff',border:'1px solid #dce8dd',borderRadius:16,padding:20,margin:'16px 0'};
 const btn={background:'#24744f',border:0,color:'white',borderRadius:10,padding:'13px 18px',cursor:'pointer',fontWeight:700};
 return <main style={{maxWidth:660,margin:'0 auto',padding:'24px 16px 80px',fontFamily:'system-ui,sans-serif',color:'#253b31',background:'#f7faf7',minHeight:'100vh'}}>
 <a href="/" style={{color:'#24744f'}}>← 감탄위크 홈</a>
 <h1>🌱 7KM 다시출발 마라톤</h1>
 <p>멈췄던 실천, 다시 시작해요! 개별 안내 문자를 받으신 기존 참가자 대상 프로그램입니다.</p>
 <div style={card}><b>☕ 7일 완주 시 음료 쿠폰 지급</b><p>완주 후 온기동행 탄소중립 실천·생각 공모전에 참여할 수 있어요. 우수작에는 소정의 상품이 제공되며 별도 시상식이 열립니다.</p></div>
 {!token&&<div style={card}>기존 감탄위크 참가자 로그인이 필요해요.<p><a href="/">홈에서 먼저 로그인하기 →</a></p></div>}
 {err&&<div role="alert" style={{...card,color:'#b42424'}}>{err}</div>}
 {data&&<><div style={card}><h2>{data.p.display_name} 님의 다시출발</h2><p>기존 {data.p.course_days}KM 기록은 그대로 유지됩니다.</p>
 {!attempt? <>{data.eligible?<><p>원하는 출발일을 선택해 주세요. 10월 31일까지 7일간 실천해야 해요.</p><label>출발일 <select value={start} onChange={e=>setStart(e.target.value)}><option value="">날짜 선택</option>{dates().map(d=><option key={d} value={d}>{d}</option>)}</select></label><p><button disabled={!start||busy} style={btn} onClick={()=>save({kind:'join',startDate:start})}>7KM 다시출발 신청</button></p></>:<p>기존 코스 종료 후 미완주가 확정된 분만 신청할 수 있어요. 현재 기존 코스는 그대로 이어가 주세요.</p>}</>:<><p><b>출발일:</b> {attempt.start_date} / <b>완주 예정:</b> {attempt.end_date}</p><h3>{diaries.length} / 7KM</h3><progress value={diaries.length} max={7} style={{width:'100%'}}/>{completed&&<p>🎉 7KM 완주! 음료 쿠폰 지급 대상입니다. 쿠폰 지급 일정은 운영자 안내를 확인해 주세요.</p>}</>}
 </div>
 {canDiary&&<div style={card}><h2>오늘의 다시출발 감탄일기</h2><p>원래 코스의 감탄일기와 별도로 저장됩니다. 같은 날짜는 수정할 수 있어요.</p><fieldset><legend>오늘 실천한 행동 (1개 이상)</legend>{(data.actions||[]).map(a=><label key={a.action_code} style={{display:'block',padding:5}}><input type="checkbox" checked={codes.includes(a.action_code)} onChange={e=>setCodes(v=>e.target.checked?[...v,a.action_code]:v.filter(x=>x!==a.action_code))}/> {a.action_name}</label>)}</fieldset><label>기타 실천<input style={{display:'block',width:'100%',padding:9,boxSizing:'border-box'}} value={other} onChange={e=>setOther(e.target.value)}/></label><label>오늘의 감탄일기 (10~500자)<textarea style={{display:'block',width:'100%',minHeight:150,padding:10,boxSizing:'border-box'}} value={diary} onChange={e=>setDiary(e.target.value)} /></label><p>{diary.length}자</p><button disabled={busy} style={btn} onClick={()=>save({kind:'diary',actionCodes:codes,otherActionText:other,diaryText:diary})}>오늘의 일기 저장</button></div>}
 {(completed||data.p.is_completed)&&<div style={card}><h2>🏆 온기동행 탄소중립 실천·생각 공모전</h2><p>마라톤 참여 소감, 평소 탄소중립 실천, 기후위기, 원주시 기후정책 제안 등 자유롭게 작성해 주세요.</p><p><b>11월 16일까지 제출 · 1,000자 내외 권장 · 임시저장 가능</b></p><p>선택 참여이며, 우수작에는 소정의 상품과 별도 시상식이 있습니다.</p><label>주제<select disabled={data.essay?.status==='submitted'} value={essay.topic} onChange={e=>setEssay({...essay,topic:e.target.value})}>{topics.map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><p><label>글 제목<input disabled={data.essay?.status==='submitted'} style={{display:'block',width:'100%',padding:9,boxSizing:'border-box'}} value={essay.title} onChange={e=>setEssay({...essay,title:e.target.value})}/></label></p><label>나의 이야기<textarea disabled={data.essay?.status==='submitted'} value={essay.body} onChange={e=>setEssay({...essay,body:e.target.value})} style={{display:'block',minHeight:230,width:'100%',padding:10,boxSizing:'border-box'}} /></label><p>{essay.body.length}자</p>{data.essay?.status==='submitted'?<p>✅ 최종 제출 완료</p>:<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button disabled={busy} style={btn} onClick={()=>save({kind:'essay',...essay,submit:false})}>임시저장</button><button disabled={busy||!essay.title.trim()||!essay.body.trim()} style={btn} onClick={()=>{if(confirm('제출 후에는 수정할 수 없습니다. 최종 제출할까요?'))save({kind:'essay',...essay,submit:true})}}>최종 제출</button></div>}</div>}
 </>}
 </main>
}

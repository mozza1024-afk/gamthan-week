'use client';
import {useEffect,useRef,useState} from 'react';
const fetchApi=async(token,body)=>{
 const r=await fetch('/api/restart',{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},...(body?{body:JSON.stringify(body)}:{})});
 const j=await r.json();if(!r.ok||j.success===false)throw Error(j.message||'요청 실패');return j;
};
const dates=()=>{const now=new Date(Date.now()+9*3600000).toISOString().slice(0,10);return Array.from({length:6},(_,i)=>'2026-10-'+String(i+20).padStart(2,'0')).filter(d=>d>=now)};
// Compress phone-camera images before posting to the one-photo endpoint.
async function prepareRestartPhoto(file){
 if(!file||!String(file.type||'').startsWith('image/'))throw Error('사진 파일을 선택해 주세요.');
 if(file.size>20*1024*1024)throw Error('20MB 이하 사진을 선택해 주세요.');
 const source=URL.createObjectURL(file);
 try{
  const img=await new Promise((resolve,reject)=>{
   const image=new Image();
   image.onload=()=>resolve(image);
   image.onerror=()=>reject(new Error('사진을 열 수 없습니다. JPG 또는 PNG 사진을 선택해 주세요.'));
   image.src=source;
  });
  const canvas=document.createElement('canvas');
  const maxSide=Math.max(img.naturalWidth,img.naturalHeight);
  if(!maxSide)throw Error('사진 크기를 확인할 수 없습니다.');
  const attempts=[{size:1250,q:.8},{size:1000,q:.7},{size:800,q:.58}];
  for(const setting of attempts){
   const ratio=Math.min(1,setting.size/maxSide);
   canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));
   canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
   const context=canvas.getContext('2d');
   context.fillStyle='#fff';
   context.fillRect(0,0,canvas.width,canvas.height);
   context.drawImage(img,0,0,canvas.width,canvas.height);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',setting.q));
   if(blob&&blob.size<=1024*1024&&blob.size>0)return new File([blob],'7km-practice.jpg',{type:'image/jpeg'});
  }
  throw Error('사진 압축에 실패했습니다. 조금 더 작은 사진을 선택해 주세요.');
 }finally{URL.revokeObjectURL(source);}
}
const topics=[['marathon','감탄위크 실천 소감'],['daily','일상 속 탄소중립'],['climate','기후위기와 우리의 삶'],['wonju','원주시 기후정책 제안'],['free','환경·지속가능성 자유주제']];
export default function Restart(){
 const diaryRef=useRef(null);
 const [token,setToken]=useState(''),[login,setLogin]=useState({phone:'',birth6:''}),[data,setData]=useState(null),[practicePhoto,setPracticePhoto]=useState(null),[photoBusy,setPhotoBusy]=useState(false),[photoMessage,setPhotoMessage]=useState(''),[start,setStart]=useState(''),[codes,setCodes]=useState([]),[diary,setDiary]=useState(''),[other,setOther]=useState(''),[essay,setEssay]=useState({topic:'marathon',title:'',body:''}),[err,setErr]=useState(''),[busy,setBusy]=useState(false),[flash,setFlash]=useState('');
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
 async function save(body){try{setBusy(true);setErr('');setFlash('');await fetchApi(token,body);await load();if(body.kind==='join'||body.kind==='change-start'){setTimeout(()=>diaryRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),120)}else if(body.kind==='diary'){const updated=await fetchApi(token);setData(updated);const finished=updated.attempt?.status==='completed'||new Set((updated.diaries||[]).map(x=>x.day_number)).size===7;setFlash(finished?'🎉 7KM 완주! 일기 7건이 모두 저장되어 별도 최종 제출 없이 완주가 확정되었습니다.':'✅ 오늘의 7KM 감탄일기를 저장했어요! 아래에서 기록을 확인할 수 있습니다.');setTimeout(()=>document.getElementById(finished?'restart-finish':'restart-records')?.scrollIntoView({behavior:'smooth',block:'start'}),180)}else alert(body.kind==='essay'?(body.submit?'공모전 제출이 완료되었습니다.':'임시저장되었습니다.'):'저장되었습니다.')}catch(e){setErr(e.message)}finally{setBusy(false)}}
 async function submitPracticePhoto(event){
  event.preventDefault();
  if(!practicePhoto||photoBusy||busy)return;
  setPhotoBusy(true);
  setPhotoMessage('');
  setErr('');
  try{
   const jpeg=await prepareRestartPhoto(practicePhoto);
   const form=new FormData();
   form.append('photo',jpeg);
   const response=await fetch('/api/restart/photo',{method:'POST',headers:{Authorization:'Bearer '+token},body:form});
   const result=await response.json().catch(()=>({success:false,message:'서버 응답을 읽을 수 없습니다.'}));
   if(!response.ok||result.success===false)throw Error(result.message||'사진 업로드에 실패했습니다.');
   setPracticePhoto(null);
   setPhotoMessage('✅ 실천사진 1장이 등록되었습니다. 7KM 완주 기록과 함께 안전하게 보관됩니다.');
   await load();
  }catch(e){setErr(e.message);}
  finally{setPhotoBusy(false);}
 }
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
 <div style={{textAlign:'left',paddingTop:8}}><strong>참여 안내</strong><ul style={{lineHeight:1.9,paddingLeft:24}}><li>기존 코스 종료 후 미완주자 및 28KM 완주가 불가능해진 참가자 중 문자 안내를 받은 분 대상</li><li>다시 1일차부터 7일간 실천</li><li>기존 도전 기록은 별도로 보존</li><li>완주 후 소감문 공모전은 선택 참여</li><li>소감문은 임시저장 가능, 11월 16일까지 제출</li></ul></div>
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
 {!attempt? <>{data.eligible?<><p>기존 실천 기록은 보존됩니다. 원하는 출발일을 선택해 10월 31일까지 새롭게 7일을 실천해 주세요.</p>{data.eligibility?.reason==='28km_unreachable'&&<p style={{background:'#eaf6ed',borderRadius:10,padding:12,color:'#225b39'}}>기존 28KM 코스는 아직 진행 중이지만, 남은 날 모두 작성해도 28KM 완주가 어려워 재도전 자격이 부여됐습니다. 기존 기록은 그대로 남습니다.</p>}<label>출발일 <select value={start} onChange={e=>setStart(e.target.value)}><option value="">날짜 선택</option>{dates().map(d=><option key={d} value={d}>{d}</option>)}</select></label><p><button disabled={!start||busy} style={btn} onClick={()=>save({kind:'join',startDate:start})}>7KM 다시출발 신청</button></p></>:<p>기존 코스 완주 가능성이 남아 있는 동안에는 기존 도전을 계속해 주세요. 종료 후 미완주가 확정되거나 28KM 완주가 불가능해지면 신청할 수 있습니다.</p>}</>:<><p><b>출발일:</b> {attempt.start_date} / <b>완주 예정:</b> {attempt.end_date}</p>{attempt.status==='active'&&diaries.length===0&&data.today<attempt.start_date&&data.today<='2026-10-25'&&(
   <div style={{background:'#eaf8ee',border:'1px solid #b9dfc2',borderRadius:12,padding:14,margin:'14px 0'}}>
    <strong>출발일을 잘못 선택하셨나요?</strong>
    <p style={{margin:'8px 0 12px'}}>아직 일기를 작성하지 않았다면 기존 신청을 취소하지 않고 오늘({data.today})부터 시작하도록 변경할 수 있어요.</p>
    <button type="button" disabled={busy} style={{...btn,width:'100%'}} onClick={()=>{
     if(window.confirm('출발일을 오늘('+data.today+')로 변경할까요? 기존 7KM 신청은 유지되고 오늘부터 감탄일기를 쓸 수 있습니다.')){
      save({kind:'change-start',startDate:data.today});
     }
    }}>오늘부터 시작하도록 출발일 변경하기 →</button>
   </div>
  )}<h3 style={{fontSize:25,color:'#14643e',margin:'15px 0 8px'}}>나의 새 도전: {diaries.length} / 7KM</h3><progress value={diaries.length} max={7} style={{width:'100%',height:16}}/><p style={{margin:'12px 0'}}><button type="button" onClick={()=>document.getElementById('restart-records')?.scrollIntoView({behavior:'smooth',block:'start'})} style={{...btn,background:'#f5d044',color:'#243822',width:'100%',fontSize:17,padding:14}}>📖 저장한 7KM 감탄일기 {diaries.length}건 보기 ↓</button></p>{canDiary?<><p style={{color:'#24744f',fontWeight:700}}>✅ 신청 완료! 오늘부터 감탄일기를 작성할 수 있어요.</p><button style={btn} onClick={()=>document.getElementById('restart-diary')?.scrollIntoView({behavior:'smooth',block:'start'})}>오늘의 감탄일기 쓰기 ↓</button></>:!completed?<p style={{background:'#fff4d6',padding:12,borderRadius:10}}>✅ 다시출발 신청이 완료됐어요. 선택한 출발일인 <b>{attempt.start_date}</b>부터 감탄일기를 작성할 수 있습니다. 그날 다시 접속해 주세요.</p>:null}{completed&&<section id="restart-finish" role="status" style={{background:'#e5f8eb',border:'2px solid #50a774',borderRadius:16,padding:20,margin:'18px 0',scrollMarginTop:16}}>
  <div style={{fontSize:28,fontWeight:900,color:'#13613d',lineHeight:1.4}}>🎉 7KM 다시출발 완주!</div>
  <p style={{fontSize:16,lineHeight:1.7,fontWeight:700,color:'#254a37'}}>1~7일차 감탄일기 7건이 모두 저장되어 <b>완주가 자동 확정</b>됐어요. 마라톤을 위해 추가로 '최종 제출' 버튼을 누를 필요는 없습니다.</p>
  <p style={{padding:'12px 14px',background:'#fff',borderRadius:10,fontWeight:700}}>☕ 7KM 완주 음료 쿠폰 지급 대상입니다. 쿠폰 지급 일정은 운영자 안내를 확인해 주세요.</p>
  <button type="button" style={{...btn,background:'#276e4e',width:'100%',marginTop:5,padding:15}} onClick={()=>document.getElementById('restart-photo')?.scrollIntoView({behavior:'smooth',block:'start'})}>📸 나의 실천사진 1장 {data.restartPhotoUrl?'확인하기':'남기기'} →</button>
  <div style={{borderTop:'1px solid #addabc',marginTop:18,paddingTop:18}}>
   <strong style={{fontSize:19,color:'#16452e'}}>🏆 다음 도전! 나의 탄소중립 이야기 공모전</strong>
   <p style={{lineHeight:1.7,margin:'10px 0'}}>7일간의 실천이 어떤 변화를 만들었나요? 마라톤 소감이나 원주시 기후정책에 대한 생각을 글로 들려주세요. <b>우수작에는 상품과 별도 시상식</b>이 준비되어 있어요!</p>
   <button type="button" style={{...btn,width:'100%',padding:16,fontSize:17,background:'#185d3d'}} onClick={()=>document.getElementById('restart-essay')?.scrollIntoView({behavior:'smooth',block:'start'})}>✍️ 수기공모전 참여하고 글쓰기 →</button>
   <p style={{fontSize:13,color:'#59705f',margin:'10px 0 0'}}>수기공모전 참여는 선택이며, 참가하지 않아도 7KM 완주와 음료 쿠폰 대상 자격은 그대로 유지됩니다.</p>
  </div>
 </section>}</>}
 </div>

 {completed&&<section id="restart-photo" style={{...card,border:'2px solid #91cbb0',scrollMarginTop:16}}>
  <div style={{display:'inline-block',background:'#e3f7e8',color:'#165f40',fontSize:13,fontWeight:800,borderRadius:30,padding:'6px 10px'}}>📸 7KM 완주 기념</div>
  <h2 style={{fontSize:23,margin:'12px 0'}}>나의 탄소중립 실천사진 1장</h2>
  <p style={{lineHeight:1.75}}>내가 실천한 탄소중립 행동을 보여주는 사진 <b>1장</b>을 남겨 보세요! 텀블러 사용, 걷기, 올바른 분리배출 등 어떤 실천도 좋아요. 얼굴이 나오지 않아도 됩니다.</p>
  <p style={{background:'#f2f8f4',padding:12,borderRadius:10,fontSize:14}}>실천사진 등록은 <b>선택</b>이에요. 사진을 올리지 않아도 7일간 감탄일기를 작성했다면 7KM 완주와 음료 쿠폰 대상 자격이 유지됩니다.</p>
  {data.restartPhotoUrl?<>
   <p style={{fontWeight:800,color:'#1f7949'}}>✅ 실천사진 1장 등록 완료</p>
   <img src={data.restartPhotoUrl} alt="내가 등록한 7KM 탄소중립 실천사진" style={{display:'block',width:'100%',maxHeight:380,objectFit:'contain',borderRadius:14,background:'#f2f5f0'}} />
   <p style={{fontSize:13,color:'#647567'}}>실천사진은 재도전 기록에 별도로 보관되며 1장만 등록할 수 있어요.</p>
  </>:<form onSubmit={submitPracticePhoto} style={{display:'grid',gap:12}}>
   <label style={{display:'block',fontWeight:800}}>사진 선택 (1장)
    <input type="file" accept="image/*" disabled={photoBusy} onChange={e=>{setPracticePhoto(e.target.files?.[0]||null);setPhotoMessage('')}} style={{display:'block',maxWidth:'100%',boxSizing:'border-box',marginTop:9,fontSize:14}} />
   </label>
   {practicePhoto&&<p style={{fontSize:14,color:'#456655',margin:0}}>선택한 사진: {practicePhoto.name}</p>}
   <button type="submit" disabled={!practicePhoto||photoBusy} style={{...btn,width:'100%',padding:15,fontSize:17,opacity:!practicePhoto||photoBusy?.6:1}}>{photoBusy?'사진을 압축하고 등록하는 중...':'📷 실천사진 1장 등록하기'}</button>
  </form>}
  {photoMessage&&<p role="status" style={{padding:12,background:'#e3f7e7',borderRadius:10,color:'#17653b'}}>{photoMessage}</p>}
 </section>}

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
 {(completed||data.p.is_completed)&&<section id="restart-essay" style={{...card,border:'2px solid #d2bb6b',scrollMarginTop:18}}>
  <div style={{display:'inline-block',padding:'6px 11px',background:'#fff2be',borderRadius:30,color:'#76530b',fontSize:13,fontWeight:800}}>🏆 완주자 특별 참여 기회</div>
  <h2 style={{fontSize:23,lineHeight:1.35,margin:'12px 0'}}>온기동행 탄소중립 실천·생각 수기공모전</h2>
  <p style={{fontSize:16,lineHeight:1.8}}>7일간의 감탄일기와 일상 속 작은 실천, 기후위기에 대한 생각, 원주시 기후정책 제안까지! <b>여러분의 경험이 지역을 바꾸는 소중한 이야기가 됩니다.</b></p>
  <div style={{background:'#fff8dc',borderRadius:12,padding:'13px 14px',margin:'14px 0'}}>
    <p style={{margin:'0 0 5px',fontWeight:800}}>🎁 우수작 소정의 상품 및 별도 시상식</p>
    <p style={{margin:0,fontSize:14}}>📅 11월 16일까지 · ✍️ 1,000자 내외 권장 · 💾 임시저장 가능</p>
  </div>
  <p style={{color:'#5b6d60',fontSize:14}}>공모전은 선택 참여예요. 참가하지 않아도 7KM 완주와 음료 쿠폰 자격은 유지됩니다. 아래 '최종 제출'은 <b>마라톤이 아닌 수기 원고 제출</b>을 뜻합니다.</p><label>주제<select disabled={data.essay?.status==='submitted'} value={essay.topic} onChange={e=>setEssay({...essay,topic:e.target.value})}>{topics.map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><p><label>글 제목<input disabled={data.essay?.status==='submitted'} style={{display:'block',width:'100%',padding:9,boxSizing:'border-box'}} value={essay.title} onChange={e=>setEssay({...essay,title:e.target.value})}/></label></p><label>나의 이야기<textarea disabled={data.essay?.status==='submitted'} value={essay.body} onChange={e=>setEssay({...essay,body:e.target.value})} style={{display:'block',minHeight:230,width:'100%',padding:10,boxSizing:'border-box'}} /></label><p>{essay.body.length}자</p>{data.essay?.status==='submitted'?<p style={{background:'#e4f7e9',borderRadius:12,padding:14,fontWeight:800,color:'#206a3c'}}>✅ 수기공모전 원고 최종 제출 완료! 참여해 주셔서 고맙습니다.</p>:<>
   {(!essay.title.trim()||!essay.body.trim())&&<p style={{fontSize:13,color:'#71603c',background:'#fff8df',borderRadius:10,padding:12}}>📌 제목과 나의 이야기를 작성하면 수기공모전 원고 최종 제출 버튼이 활성화됩니다. <b>글을 쓰지 않아도 마라톤 완주는 이미 확정됐어요!</b></p>}
   <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
    <button type="button" disabled={busy} style={{...btn,background:'#476b56'}} onClick={()=>save({kind:'essay',...essay,submit:false})}>💾 수기 원고 임시저장</button>
    <button type="button" disabled={busy||!essay.title.trim()||!essay.body.trim()} style={{...btn,opacity:busy||!essay.title.trim()||!essay.body.trim()?0.45:1}} onClick={()=>{if(confirm('수기공모전 원고를 최종 제출하면 수정할 수 없습니다. 원고를 제출할까요?'))save({kind:'essay',...essay,submit:true})}}>🏆 수기공모전 원고 최종 제출</button>
   </div>
  </>}</section>}
 </>}
 </main>
}

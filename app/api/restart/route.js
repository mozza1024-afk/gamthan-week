import {dbRequest,effectiveToday,requireParticipant,json} from '../../../lib/server.js';
import {restartEligibility} from '../../../lib/restart-eligibility.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const enc=x=>encodeURIComponent(String(x??''));
const add=(date,n)=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const error=(message,status=400)=>json({success:false,message},status);
async function context(request){
 const s=await requireParticipant(request);
 const [rows,today]=await Promise.all([dbRequest('participants?select=id,display_name,status,course_days,start_date,end_date,is_completed&id=eq.'+enc(s.sub)+'&limit=1'),effectiveToday()]);
 const p=rows?.[0];if(!p||p.status==='cancelled')throw Error('유효한 기존 참가자만 신청할 수 있습니다.');
 const [attempts,essay,originalDiaries]=await Promise.all([
 dbRequest('restart_attempts?select=*&participant_id=eq.'+enc(p.id)+'&limit=1'),
 dbRequest('ongi_essays?select=*&participant_id=eq.'+enc(p.id)+'&limit=1'),
 dbRequest('diaries?select=diary_date&participant_id=eq.'+enc(p.id)+'&order=diary_date.asc')
 ]);
 const attempt=attempts?.[0]||null;
 const diaries=attempt?await dbRequest('restart_diaries?select=diary_date,day_number,diary_text,action_codes,other_action_text&attempt_id=eq.'+enc(attempt.id)+'&order=day_number.asc'):[];
 const eligibility=restartEligibility(p,originalDiaries,today);
 return {p,today,attempt,diaries,essay:essay?.[0]||null,eligible:eligibility.eligible,eligibility};
}
export async function GET(request){
 try{const c=await context(request);const actions=await dbRequest('actions?select=action_code,action_name&is_active=eq.true&order=sort_order.asc');return json({success:true,...c,actions});}
 catch(e){return error(e.message,e.status||500)}
}
export async function POST(request){
 try{
  const c=await context(request);const b=await request.json();const kind=String(b.kind||'');
  if(kind==='join'){
   if(c.attempt)return error('이미 다시출발을 신청하셨습니다.');
   if(!c.eligible)return error('기존 코스의 미완주가 확정되었거나 28KM 완주가 불가능해진 기존 참가자만 신청할 수 있습니다.');
   const start=String(b.startDate||'');
   if(!/^2026-10-(2[0-5])$/.test(start)||start<c.today)return error('오늘부터 10월 25일 사이의 출발일을 선택해 주세요.');
   await dbRequest('restart_attempts',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({participant_id:c.p.id,start_date:start})});
  } else if(kind==='change-start'){
   // 기존 신청 및 일기 기록을 보존하며, 시작 전이고 작성한 일기가 없는 경우에만 출발일 변경.
   if(!c.attempt)return error('기존 다시출발 신청을 찾을 수 없습니다.');
   if(c.attempt.status!=='active'||c.diaries.length>0)return error('감탄일기를 작성한 뒤에는 출발일을 변경할 수 없습니다.');
   if(c.today>=c.attempt.start_date)return error('이미 출발한 마라톤은 시작일을 변경할 수 없습니다.');
   const start=String(b.startDate||'');
   if(!/^2026-10-(2[0-5])$/.test(start)||start<c.today)return error('오늘부터 10월 25일 사이의 출발일만 선택할 수 있습니다.');
   if(start===c.attempt.start_date)return error('기존 출발일과 같은 날짜입니다.');
   const updated=await dbRequest(
     'restart_attempts?select=id,start_date,end_date&id=eq.'+enc(c.attempt.id)+'&participant_id=eq.'+enc(c.p.id)+'&start_date=eq.'+enc(c.attempt.start_date)+'&status=eq.active',
     {method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({start_date:start})}
   );
   if(!Array.isArray(updated)||updated.length!==1)return error('변경 중 다른 요청이 처리되었습니다. 새로고침 후 다시 확인해 주세요.',409);
  } else if(kind==='diary'){
   if(!c.attempt||c.attempt.status==='cancelled')return error('재도전 신청을 먼저 해주세요.');
   const today=c.today;
   if(today<c.attempt.start_date||today>c.attempt.end_date)return error('선택한 7일 실천 기간에만 작성할 수 있습니다.');
   const text=String(b.diaryText||'').trim();const codes=[...new Set(Array.isArray(b.actionCodes)?b.actionCodes.map(String):[])];
   const actions=await dbRequest('actions?select=action_code&is_active=eq.true');
   const valid=new Set(actions.map(x=>x.action_code));
   if(text.length<10||text.length>500||!codes.length||codes.some(x=>!valid.has(x)))return error('실천 행동을 선택하고 감탄일기를 10~500자로 작성해 주세요.');
   const day=Math.round((new Date(today+'T00:00:00Z')-new Date(c.attempt.start_date+'T00:00:00Z'))/86400000)+1;
   await dbRequest('restart_diaries?on_conflict=attempt_id,diary_date',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({attempt_id:c.attempt.id,diary_date:today,day_number:day,diary_text:text,action_codes:codes,other_action_text:String(b.otherActionText||'').slice(0,500)})});
   const all=await dbRequest('restart_diaries?select=day_number&attempt_id=eq.'+enc(c.attempt.id));
   if(new Set(all.map(x=>x.day_number)).size===7){await dbRequest('restart_attempts?id=eq.'+enc(c.attempt.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({status:'completed',completed_at:new Date().toISOString()})})}
  } else if(kind==='essay'){
   const originalCompleted=Boolean(c.p.is_completed);
   const restartCompleted=c.attempt?.status==='completed'||new Set(c.diaries.map(x=>x.day_number)).size===7;
   if(!originalCompleted&&!restartCompleted)return error('마라톤 완주 후 공모전에 참여할 수 있습니다.');
   if(c.today>'2026-11-16')return error('공모전 제출 기간이 종료되었습니다.');
   if(c.essay?.status==='submitted')return error('이미 최종 제출된 글입니다.');
   const title=String(b.title||'').trim().slice(0,150),body=String(b.body||'').trim(),topic=String(b.topic||'free').slice(0,50);
   const submit=Boolean(b.submit);
   if(body.length>5000)return error('글은 5,000자 이하로 작성해 주세요.');
   if(submit&&(!title||!body))return error('제목과 내용을 입력해 주세요.');
   await dbRequest('ongi_essays?on_conflict=participant_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({participant_id:c.p.id,topic,title,body,status:submit?'submitted':'draft',submitted_at:submit?new Date().toISOString():null,updated_at:new Date().toISOString()})});
  }else return error('지원하지 않는 요청입니다.');
  return json({success:true,message:'정상적으로 저장되었습니다.'});
 }catch(e){return error(e.message,e.status||500)}
}

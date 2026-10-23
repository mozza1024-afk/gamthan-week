import {dbRequest,requireAdmin,kstToday,json} from '../../../../lib/server.js';

export const runtime='nodejs';
export const dynamic='force-dynamic';

function fail(error) {
  return json({success:false,message:'재도전 현황을 불러오지 못했습니다.'},error?.status===401?401:500);
}
function koreaDate(timestamp){
  if(!timestamp)return '';
  const d=new Date(timestamp);
  return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
}

export async function GET(request){
 try {
  const admin=await requireAdmin(request);
  const [attempts,diaries,participants]=await Promise.all([
   dbRequest('restart_attempts?select=id,participant_id,start_date,end_date,status,created_at,completed_at,coupon_status&order=created_at.desc'),
   dbRequest('restart_diaries?select=attempt_id,diary_date,day_number&order=diary_date.desc'),
   dbRequest('participants?select=id,display_name,course_days,organization_id,organization_name_snapshot')
  ]);
  const allowed=new Map((participants||[]).filter(p=>
    admin.role==='super_admin'||String(p.organization_id)===String(admin.org)
  ).map(p=>[String(p.id),p]));

  const diaryCounts=new Map();
  const todayDiaryAttempts=new Set();
  const today=kstToday();
  for(const d of diaries||[]){
   const key=String(d.attempt_id);
   diaryCounts.set(key,(diaryCounts.get(key)||0)+1);
   if(d.diary_date===today)todayDiaryAttempts.add(key);
  }
  const rows=(attempts||[]).filter(a=>allowed.has(String(a.participant_id))).map(a=>{
   const p=allowed.get(String(a.participant_id));
   const count=diaryCounts.get(String(a.id))||0;
   return {
    id:a.id,
    name:p.display_name,
    organization:p.organization_name_snapshot||'',
    originalCourse:p.course_days,
    startDate:a.start_date,
    endDate:a.end_date,
    appliedDate:koreaDate(a.created_at),
    appliedAt:a.created_at,
    completedDays:count,
    status:a.status,
    completed:a.status==='completed'||count>=7,
    couponStatus:a.coupon_status,
    recordedToday:todayDiaryAttempts.has(String(a.id))
   };
  });
  return json({
   success:true,
   asOf:new Date().toISOString(),
   today,
   stats:{
    total:rows.length,
    newToday:rows.filter(r=>r.appliedDate===today).length,
    started:rows.filter(r=>r.completedDays>0).length,
    wroteToday:rows.filter(r=>r.recordedToday).length,
    completed:rows.filter(r=>r.completed).length,
    totalDiaries:rows.reduce((n,r)=>n+r.completedDays,0)
   },
   rows
  });
 } catch(error) {return fail(error);}
}

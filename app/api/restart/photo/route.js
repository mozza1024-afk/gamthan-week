import {dbRequest, json, requireParticipant, signedPhotoUrl, uploadPhoto} from '../../../../lib/server.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Keep the single restart proof photo separate from original-course completion photos.
// The existing private Supabase bucket is reused: no schema change is required.
const enc = value => encodeURIComponent(String(value ?? ''));
const photoPath = attemptId => 'restart/' + attemptId + '/practice.jpg';
const fail = (message, status=400) => json({success:false,message},status);

export async function POST(request) {
 try {
  const session=await requireParticipant(request);
  const participants=await dbRequest('participants?select=id,status&id=eq.'+enc(session.sub)+'&limit=1');
  const participant=participants?.[0];
  if (!participant || participant.status==='cancelled')return fail('로그인한 참가자만 사진을 올릴 수 있습니다.',401);

  const attempts=await dbRequest('restart_attempts?select=id,status&participant_id=eq.'+enc(participant.id)+'&limit=1');
  const attempt=attempts?.[0];
  if(!attempt || attempt.status==='cancelled')return fail('7KM 다시출발 신청을 확인할 수 없습니다.');

  const diaries=await dbRequest('restart_diaries?select=day_number&attempt_id=eq.'+enc(attempt.id));
  if(new Set((diaries||[]).map(d=>d.day_number)).size!==7)return fail('7일간의 감탄일기를 모두 저장한 후 실천사진을 올릴 수 있습니다.');

  const path=photoPath(attempt.id);
  if(await signedPhotoUrl(path))return fail('실천사진은 이미 1장이 등록되어 있습니다. 다시 올릴 수 없습니다.',409);

  const form=await request.formData();
  const files=form.getAll('photo');
  if(files.length!==1 || typeof files[0]==='string')return fail('실천사진 1장을 선택해 주세요.');
  const file=files[0];
  if(file.type!=='image/jpeg')return fail('JPG 형식으로 압축된 사진만 등록할 수 있습니다.');
  if(!file.size || file.size>1024*1024)return fail('사진은 1MB 이하로 압축해서 올려 주세요.');

  try{
   await uploadPhoto(path,file,'image/jpeg');
  }catch(e){
   if(/already exists|duplicate|409|already owned|ResourceAlreadyExists/i.test(String(e.message||''))){
    return fail('실천사진은 이미 1장이 등록되어 있습니다.',409);
   }
   throw e;
  }
  return json({success:true,message:'7KM 실천사진 1장이 등록됐습니다.',photoUrl:await signedPhotoUrl(path)});
 } catch(error) {
  const status=Number(error?.status)||500;
  return fail(status===401?'로그인 시간이 만료되었습니다. 다시 로그인해 주세요.':status===500?'사진 등록 중 문제가 발생했습니다. 다시 시도해 주세요.':error.message,status);
 }
}

import {dbRequest, json, requireAdmin} from '../../../../lib/server.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Keep an admin-only view of essays separate from participant-facing drafts.
// Draft bodies are deliberately not returned; only final submissions can be read/exported.
export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    const [essays, participants, attempts] = await Promise.all([
      dbRequest('ongi_essays?select=id,participant_id,topic,title,body,status,submitted_at,updated_at&order=updated_at.desc'),
      dbRequest('participants?select=id,display_name,course_days,organization_id,organization_name_snapshot,is_completed'),
      dbRequest('restart_attempts?select=participant_id,status'),
    ]);

    const people = new Map((participants || [])
      .filter(p => admin.role === 'super_admin' || String(p.organization_id) === String(admin.org))
      .map(p => [String(p.id), p]));

    const restart = new Map((attempts || []).map(a => [String(a.participant_id), a.status]));
    const visible = (essays || []).filter(e => people.has(String(e.participant_id)));
    const submitted = visible.filter(e => e.status === 'submitted' && e.submitted_at);
    const drafts = visible.filter(e => e.status === 'draft');

    const rows = visible.map(e => {
      const person = people.get(String(e.participant_id));
      const isSubmitted = e.status === 'submitted' && Boolean(e.submitted_at);
      return {
        id: e.id,
        name: person.display_name,
        organization: person.organization_name_snapshot || '',
        originalCourse: person.course_days,
        originalCompleted: Boolean(person.is_completed),
        restartStatus: restart.get(String(e.participant_id)) || null,
        topic: e.topic,
        title: isSubmitted ? e.title : '',
        body: isSubmitted ? e.body : '',
        characterCount: isSubmitted ? Array.from(e.body || '').length : 0,
        status: isSubmitted ? 'submitted' : 'draft',
        submittedAt: isSubmitted ? e.submitted_at : null,
        updatedAt: e.updated_at,
      };
    });

    return json({
      success: true,
      asOf: new Date().toISOString(),
      stats: {submitted: submitted.length, drafts: drafts.length},
      rows,
    });
  } catch(error) {
    const status = error?.status === 401 || error?.status === 403 ? error.status : 500;
    return json({
      success: false,
      message: status === 500 ? '수기공모전 접수 현황을 불러오지 못했습니다.' : '관리자 로그인이 필요합니다.',
    }, status);
  }
}

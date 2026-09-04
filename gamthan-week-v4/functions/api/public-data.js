import {
  dbRequest,
  effectiveToday,
  json,
  methodNotAllowed,
  readSettings
} from '../../src/server.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') {
    return methodNotAllowed();
  }

  try {
    const [
      settings,
      organizations,
      actions,
      participants,
      today
    ] = await Promise.all([
      readSettings(context.env),

      dbRequest(
        context.env,
        'organizations?select=id,organization_code,organization_name&is_active=eq.true&order=sort_order.asc'
      ),

      dbRequest(
        context.env,
        'actions?select=action_code,action_name,action_description&is_active=eq.true&order=sort_order.asc'
      ),

      dbRequest(
        context.env,
        'participants?select=id&registration_source=eq.online&status=neq.cancelled'
      ),

      effectiveToday(context.env),
    ]);

    const rawLimit =
      Number(settings.ONLINE_APPLICATION_LIMIT || 100);

    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.floor(rawLimit)
        : 100;

    const count =
      (participants || []).length;

    return json({
      success: true,

      appName:
        settings.APP_NAME ||
        '감탄위크 마라톤–나의 감탄일기',

      applicationStartDate:
        settings.APPLICATION_START_DATE,

      applicationEndDate:
        settings.APPLICATION_END_DATE,

      activityStartDate:
        settings.ACTIVITY_START_DATE,

      activityEndDate:
        settings.ACTIVITY_END_DATE,

      privacyRetentionDate:
        settings.PRIVACY_RETENTION_DATE || '',

      today,

      // 이전 Cloudflare 페이지는 신규 신청을 완전히 종료
      applicationOpen: false,

      devMode: false,

      onlineApplicationLimit: limit,

      onlineApplicationCount: count,

      onlineApplicationRemaining:
        Math.max(limit - count, 0),

      organizations,
      actions,
    });

  } catch (error) {
    return json(
      {
        success: false,
        message: error.message
      },
      error.status || 500
    );
  }
}

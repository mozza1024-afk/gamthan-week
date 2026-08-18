import { dbRequest, effectiveToday, json, methodNotAllowed, readSettings } from '../../src/server.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET') return methodNotAllowed();
  try {
    const [settings, organizations, actions, participants, today] = await Promise.all([
      readSettings(context.env),
      dbRequest(context.env, 'organizations?select=id,organization_code,organization_name&is_active=eq.true&order=sort_order.asc'),
      dbRequest(context.env, 'actions?select=action_code,action_name,action_description&is_active=eq.true&order=sort_order.asc'),
      dbRequest(context.env, 'participants?select=id&registration_source=eq.online&status=neq.cancelled'),
      effectiveToday(context.env),
    ]);

    const limit = Number(settings.ONLINE_APPLICATION_LIMIT || 100);
    const count = participants.length;
    const devMode = Boolean(String(settings.DEV_TEST_DATE || '').trim());
    const withinApplication = devMode || (today >= settings.APPLICATION_START_DATE && today <= settings.APPLICATION_END_DATE);

    return json({
      success: true,
      appName: settings.APP_NAME || '감탄위크 마라톤–나의 감탄일기',
      applicationStartDate: settings.APPLICATION_START_DATE,
      applicationEndDate: settings.APPLICATION_END_DATE,
      activityStartDate: settings.ACTIVITY_START_DATE,
      activityEndDate: settings.ACTIVITY_END_DATE,
      privacyRetentionDate: settings.PRIVACY_RETENTION_DATE || '',
      today,
      applicationOpen: withinApplication && count < limit,
      devMode,
      onlineApplicationLimit: limit,
      onlineApplicationCount: count,
      onlineApplicationRemaining: Math.max(limit - count, 0),
      organizations,
      actions,
    });
  } catch (error) {
    return json({ success: false, message: error.message }, error.status || 500);
  }
}

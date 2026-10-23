// Existing-course completion potential, independent of the 7KM restart diary table.
// Original diaries can only be recorded on their own activity date (no backdating).
// All dates are ISO 8601 local-calendar dates from effectiveToday() (Asia/Seoul).
const dayMs = 86400000;
function dayNumber(value) {
  const text = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return NaN;
  return Date.parse(text + 'T00:00:00Z') / dayMs;
}

export function restartEligibility(participant, diaryDates, today) {
  const days = Number(participant?.course_days);
  const start = dayNumber(participant?.start_date);
  const end = dayNumber(participant?.end_date);
  const current = dayNumber(today);

  const invalid = {
    eligible: false,
    reason: 'not_eligible',
    originalDiaryCount: 0,
    possibleTotal: 0,
    remainingWritableDays: 0,
  };

  if (![7, 14, 21, 28].includes(days) || ![start, end, current].every(Number.isFinite)) return invalid;
  if (participant?.status === 'cancelled' || participant?.is_completed) return invalid;

  const recordedDays = new Set(
    (diaryDates || [])
      .map(row => dayNumber(typeof row === 'string' ? row : row?.diary_date))
      .filter(day => Number.isFinite(day) && day >= start && day <= end)
  );

  const recorded = recordedDays.size;
  if (recorded >= days || current < start) {
    return {...invalid, originalDiaryCount: recorded, possibleTotal: days};
  }

  const firstWritableDay = Math.max(current, start);
  let remaining = 0;
  for (let day = firstWritableDay; day <= end; day++) {
    if (!recordedDays.has(day)) remaining++;
  }
  const possibleTotal = recorded + remaining;
  const endedIncomplete = current > end;
  // Before the original end date, only 28KM entrants receive an early restart
  // when every remaining day still cannot produce the original 28 diaries.
  const impossible28 = days === 28 && current <= end && possibleTotal < days;

  return {
    eligible: endedIncomplete || impossible28,
    reason: endedIncomplete ? 'ended_incomplete' : impossible28 ? '28km_unreachable' : 'ongoing',
    originalDiaryCount: recorded,
    possibleTotal,
    remainingWritableDays: remaining,
  };
}

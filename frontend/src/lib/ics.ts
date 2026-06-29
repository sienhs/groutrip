import type { Schedule } from '../types/schedule';

function icsDate(ymd: string, hhmm: string): string {
  // YYYYMMDDTHHMMSS (local time, no Z = floating)
  return `${ymd.replace(/-/g, '')}T${hhmm.replace(':', '')}00`;
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function generateICS(groupTitle: string, schedules: Schedule[]): string {
  const sorted = [...schedules].sort((a, b) =>
    a.scheduleDate.localeCompare(b.scheduleDate) || a.orderIndex - b.orderIndex,
  );

  const events = sorted.map((s) => {
    const summary = icsEscape(s.placeName ?? s.title ?? '일정');
    const desc = s.memo ? `DESCRIPTION:${icsEscape(s.memo)}\r\n` : '';
    const cost = s.estimatedCost != null ? `X-COST:${s.estimatedCost}\r\n` : '';
    return [
      'BEGIN:VEVENT',
      `DTSTART:${icsDate(s.scheduleDate, s.startTime)}`,
      `DTEND:${icsDate(s.scheduleDate, s.endTime)}`,
      `SUMMARY:${summary}`,
      desc,
      cost,
      `UID:groutrip-${s.id}@groutrip`,
      'END:VEVENT',
    ].filter(Boolean).join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Groutrip//KO',
    `X-WR-CALNAME:${icsEscape(groupTitle)} 여행 일정`,
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadICS(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Часовой пояс для людей: даты в выгрузке и границы периода. Хранение — всегда UTC. */
export const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Yerevan";

type Parts = Record<string, string>;

const partsInZone = (at: Date, timeZone: string, withSeconds: boolean): Parts =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      ...(withSeconds && { second: "2-digit" }),
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value])
  );

/** Смещение пояса от UTC (мс) в заданный момент — через Intl, без таблиц поясов. */
const zoneOffsetMs = (at: Date, timeZone: string) => {
  const p = partsInZone(at, timeZone, true);
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - at.getTime();
};

/** «2026-09-01» в поясе → момент начала этих суток в UTC. */
export function zonedDayStartToUtc(day: string, timeZone = APP_TIMEZONE): Date {
  const [y, m, d] = day.split("-").map(Number);
  const midnightAsUtc = Date.UTC(y, m - 1, d);
  // смещение берётся на найденный момент ещё раз — в день перехода на летнее
  // время оно в полночь по UTC и в местную полночь разное
  const first = midnightAsUtc - zoneOffsetMs(new Date(midnightAsUtc), timeZone);
  return new Date(midnightAsUtc - zoneOffsetMs(new Date(first), timeZone));
}

/** Сегодня в поясе: «2026-09-25». */
export function todayInZone(timeZone = APP_TIMEZONE): string {
  const p = partsInZone(new Date(), timeZone, false);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Следующий день в формате YYYY-MM-DD. */
export function nextDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** Дата «ДД.ММ.ГГГГ» и время «ЧЧ:ММ» в поясе — для людей. */
export function formatInZone(at: Date, timeZone = APP_TIMEZONE) {
  const p = partsInZone(at, timeZone, false);
  return { date: `${p.day}.${p.month}.${p.year}`, time: `${p.hour}:${p.minute}` };
}

import prisma from "../../shared/config/prisma";
import { AppError } from "../../shared/errors/AppError";
import { nextDay, zonedDayStartToUtc } from "../../shared/lib/time";
import { buildFeedbackWorkbook } from "./feedback.export";
import type { FeedbackFilter } from "./feedback.validation";

/** Решено: обращения хранятся 2 месяца (docs/architecture.md §6b). */
const RETENTION_MONTHS = 2;

export const createFeedback = (data: { message: string }) =>
  prisma.feedback.create({
    data: { message: data.message },
    select: { id: true, createdAt: true },
  });

// ── служебное ──────────────────────────────────────────────────

const ITEM_SELECT = { id: true, message: true, createdAt: true, excludedAt: true } as const;

const filterWhere = (filter: FeedbackFilter) =>
  filter === "included" ? { excludedAt: null } : filter === "excluded" ? { excludedAt: { not: null } } : {};

export async function listFeedback(input: { page: number; pageSize: number; filter: FeedbackFilter }) {
  const where = filterWhere(input.filter);
  const [items, total] = await prisma.$transaction([
    prisma.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      select: ITEM_SELECT,
    }),
    prisma.feedback.count({ where }),
  ]);
  return { items, total, page: input.page, pageSize: input.pageSize };
}

/** Исключить обращение из выгрузки (мусор) или вернуть. Повторное исключение дату не меняет. */
export async function setExcluded(id: string, excluded: boolean) {
  const existing = await prisma.feedback.findUnique({ where: { id }, select: ITEM_SELECT });
  if (!existing) throw AppError.notFound("Feedback not found");
  if (excluded === (existing.excludedAt !== null)) return existing;
  return prisma.feedback.update({
    where: { id },
    data: { excludedAt: excluded ? new Date() : null },
    select: ITEM_SELECT,
  });
}

/** Удалить навсегда: мэрия его уже не получит. Нет такого — 404. */
export async function deleteFeedback(id: string) {
  const { count } = await prisma.feedback.deleteMany({ where: { id } });
  if (count === 0) throw AppError.notFound("Feedback not found");
}

/** Отметка «выгружено» ставится пачками: список id в одном запросе ограничен. */
const MARK_CHUNK = 5000;

/**
 * Excel для мэрии за дни [from, to] по часовому поясу приложения.
 * Каждое попавшее в файл обращение получает exportedAt — по нему, а не по
 * периоду журнала, решается удаление: пришедшее во время выгрузки или
 * возвращённое из исключённых потом останется до своей выгрузки.
 */
export async function exportFeedback(input: { from: string; to: string; exportedBy: string }) {
  const exportedAt = new Date();
  const periodFrom = zonedDayStartToUtc(input.from);
  const periodTo = zonedDayStartToUtc(nextDay(input.to));
  const rows = await prisma.feedback.findMany({
    where: { createdAt: { gte: periodFrom, lt: periodTo }, excludedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, message: true, createdAt: true },
  });

  const buffer = await buildFeedbackWorkbook({ from: input.from, to: input.to, rows, exportedAt });

  const ids = rows.map((r) => r.id);
  const marks = [];
  for (let i = 0; i < ids.length; i += MARK_CHUNK) {
    marks.push(
      prisma.feedback.updateMany({
        where: { id: { in: ids.slice(i, i + MARK_CHUNK) }, exportedAt: null },
        data: { exportedAt },
      })
    );
  }
  await prisma.$transaction([
    ...marks,
    prisma.exportBatch.create({
      data: { periodFrom, periodTo, count: rows.length, exportedBy: input.exportedBy, createdAt: exportedAt },
    }),
  ]);
  return { buffer, fileName: `ICU-${input.from}_${input.to}.xlsx`, count: rows.length };
}

export async function listExportBatches() {
  const items = await prisma.exportBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, periodFrom: true, periodTo: true, count: true, exportedBy: true, createdAt: true },
  });
  return { items };
}

/** Тот же день N месяцев назад; 30.04 − 2 мес. → 28/29.02, а не 02.03. */
const monthsBefore = (date: Date, months: number) => {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() - months;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const result = new Date(date);
  result.setUTCFullYear(y, m, Math.min(date.getUTCDate(), lastDay));
  return result;
};

/**
 * Удаляются обращения старше 2 месяцев, которые либо попали в файл для мэрии,
 * либо исключены админом как мусор. Невыгруженное остаётся, пока его не выгрузят.
 */
export async function purgeOldFeedback(now = new Date()) {
  const { count } = await prisma.feedback.deleteMany({
    where: {
      createdAt: { lt: monthsBefore(now, RETENTION_MONTHS) },
      OR: [{ exportedAt: { not: null } }, { excludedAt: { not: null } }],
    },
  });
  return count;
}

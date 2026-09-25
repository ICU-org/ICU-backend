import { Request, Response } from "express";
import { matchedData } from "express-validator";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { AppError } from "../../shared/errors/AppError";
import { logger } from "../../shared/config/logger";
import * as feedbackService from "./feedback.service";
import type { FeedbackFilter } from "./feedback.validation";

/** POST /api/feedback — message проверен и обрезан валидатором в цепочке маршрута */
export const create = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await feedbackService.createFeedback({ message: req.body.message }));
});

// ── служебное: /api/admin/feedback, под requireAdmin ──────────────
// Параметры — через matchedData: в Express 5 req.query только для чтения,
// и приведение типов валидатора туда не записывается.

/** GET /api/admin/feedback?page=&pageSize=&filter= */
export const adminList = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, pageSize = 50, filter = "all" } = matchedData(req) as {
    page?: number;
    pageSize?: number;
    filter?: FeedbackFilter;
  };
  res.json(await feedbackService.listFeedback({ page, pageSize, filter }));
});

/** PATCH /api/admin/feedback/:id — { excluded: boolean } */
export const adminSetExcluded = asyncHandler(async (req: Request, res: Response) => {
  const { id, excluded } = matchedData(req) as { id: string; excluded: boolean };
  res.json(await feedbackService.setExcluded(id, excluded));
});

/** DELETE /api/admin/feedback/:id — навсегда */
export const adminDelete = asyncHandler(async (req: Request, res: Response) => {
  const { id } = matchedData(req) as { id: string };
  await feedbackService.deleteFeedback(id);
  // кто и что удалил — для разбора; текста обращения в логе нет
  logger.info({ feedbackId: id, admin: req.admin?.login }, "Feedback deleted");
  res.status(204).end();
});

/** GET /api/admin/feedback/export?from=YYYY-MM-DD&to=YYYY-MM-DD — файл .xlsx */
export const adminExport = asyncHandler(async (req: Request, res: Response) => {
  if (!req.admin) throw AppError.unauthorized();
  const { from, to } = matchedData(req) as { from: string; to: string };
  const { buffer, fileName, count } = await feedbackService.exportFeedback({ from, to, exportedBy: req.admin.login });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.setHeader("X-Export-Count", String(count));
  res.send(buffer);
});

/** GET /api/admin/feedback/exports — журнал выгрузок */
export const adminExports = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await feedbackService.listExportBatches());
});

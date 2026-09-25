import { body, param, query } from "express-validator";
import { todayInZone } from "../../shared/lib/time";

/** Стартовые границы; уточняются на этапе ограничений (docs/project-plan.md). */
const MESSAGE_MIN_LENGTH = 3;
const MESSAGE_MAX_LENGTH = 2000;

/*
 * Управляющие символы (кроме \t и \n) и одиночные суррогаты вырезаются:
 * PostgreSQL не принимает \u0000 в TEXT, а битый UTF-16 не кодируется в UTF-8 —
 * без этого мусорный ввод с табло давал 500 вместо сохранения или 400.
 */
// eslint-disable-next-line no-control-regex -- ищем именно управляющие символы
const CONTROL_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F]/g;
const LONE_SURROGATES = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const stripUnsafeChars = (value: string) => value.replace(CONTROL_CHARS, "").replace(LONE_SURROGATES, "");

export const validateCreateFeedback = [
  body("message")
    .isString()
    .withMessage("Message must be a string")
    .bail()
    .customSanitizer(stripUnsafeChars)
    .trim()
    .isLength({ min: MESSAGE_MIN_LENGTH, max: MESSAGE_MAX_LENGTH })
    .withMessage(`Message must be ${MESSAGE_MIN_LENGTH}–${MESSAGE_MAX_LENGTH} characters`),
];

// ── служебное ──────────────────────────────────────────────────

export const FEEDBACK_FILTERS = ["all", "included", "excluded"] as const;
export type FeedbackFilter = (typeof FEEDBACK_FILTERS)[number];

export const validateListFeedback = [
  query("page").optional().isInt({ min: 1, max: 100000 }).toInt(),
  query("pageSize").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("filter").optional().isIn(FEEDBACK_FILTERS),
];

export const validateSetExcluded = [param("id").isUUID(), body("excluded").isBoolean({ strict: true })];

export const validateDeleteFeedback = [param("id").isUUID()];

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_EXPORT_DAYS = 366;
const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / 86_400_000;

/** Период в днях по часовому поясу приложения, границы включительно: ?from=2026-09-01&to=2026-09-30 */
export const validateExport = [
  query("from").matches(DAY).bail().isISO8601({ strict: true }),
  query("to")
    .matches(DAY)
    .bail()
    .isISO8601({ strict: true })
    .bail()
    .custom((to: string, { req }) => {
      const from = String(req.query?.from ?? "");
      if (!DAY.test(from)) return true; // ошибку покажет проверка from
      const days = dayNumber(to) - dayNumber(from);
      if (days < 0) throw new Error("to must not be before from");
      // будущие дни в файл попасть не могут, а «период до конца месяца» вводил бы мэрию в заблуждение
      if (to > todayInZone()) throw new Error("to must not be in the future");
      if (days >= MAX_EXPORT_DAYS) throw new Error(`Period must be at most ${MAX_EXPORT_DAYS} days`);
      return true;
    }),
];

import pino from "pino";
import { AppError } from "../errors/AppError";

const isDev = process.env.NODE_ENV === "development";

/** Ошибки, в тексте которых Prisma печатает аргументы запроса — то есть данные обращений. */
const ERRORS_WITH_ARGUMENTS = new Set(["PrismaClientValidationError"]);

/** Цепочка cause обрезается до типа и сообщения: там бывают тексты SQL с аргументами. */
export const errorSerializer = (err: unknown) => {
  if (!(err instanceof Error)) return err;
  if (ERRORS_WITH_ARGUMENTS.has(err.name)) {
    return { type: err.name, message: "[omitted: contains query arguments]" };
  }

  const causes: string[] = [];
  let current: unknown = (err as Error & { cause?: unknown }).cause;
  for (let depth = 0; current instanceof Error && depth < 5; depth++) {
    // та же защита для обёрнутой ошибки: AppError(…, { cause: prismaErr })
    causes.push(`${current.name}: ${ERRORS_WITH_ARGUMENTS.has(current.name) ? "[omitted]" : current.message}`);
    current = (current as Error & { cause?: unknown }).cause;
  }

  const extra: Record<string, unknown> = {};
  for (const key of ["code", "meta", "status"]) {
    const value = (err as unknown as Record<string, unknown>)[key];
    if (value !== undefined) extra[key] = value;
  }

  return {
    type: err.name,
    message: err.message,
    stack: err.stack,
    ...extra,
    ...(err instanceof AppError && { code: err.code, status: err.status }),
    ...(causes.length > 0 && { causes }),
  };
};

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  serializers: { err: errorSerializer, error: errorSerializer },
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
    },
  }),
});

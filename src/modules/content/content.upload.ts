import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { UPLOADS_DIR } from "../../shared/config/uploads";
import { AppError, ErrorCode } from "../../shared/errors/AppError";

const MAX_LOGO_BYTES = 1024 * 1024;
export const PARTNER_LOGOS_DIR = path.join(UPLOADS_DIR, "partners");

/** Файл в памяти: на диск попадает только после проверки содержимого. */
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_LOGO_BYTES, files: 1 } });

/** multer.single с ошибками в нашем конверте: большой файл — 413, прочее — 400. */
export const receiveLogo = (req: Request, res: Response, next: NextFunction) =>
  upload.single("logo")(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return next(new AppError(413, ErrorCode.FILE_TOO_LARGE, "Logo must be at most 1 MB"));
    }
    next(AppError.badRequest(ErrorCode.VALIDATION_FAILED, "Send one file in the \"logo\" field"));
  });

/**
 * Тип — по первым байтам, а не по имени и Content-Type от клиента.
 * Только растровые форматы: SVG может содержать скрипт.
 */
const detectImage = (data: Buffer): "png" | "jpg" | "webp" | null => {
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "jpg";
  if (data.length >= 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
};

/** Сохранить проверенный логотип под случайным именем; вернуть имя файла. */
export async function storeLogo(data: Buffer | undefined): Promise<string> {
  if (!data) throw AppError.badRequest(ErrorCode.VALIDATION_FAILED, "Send one file in the \"logo\" field");
  const ext = detectImage(data);
  if (!ext) throw AppError.badRequest(ErrorCode.UNSUPPORTED_FILE_TYPE, "Logo must be PNG, JPEG or WebP");
  const fileName = `${randomUUID()}.${ext}`;
  await fs.mkdir(PARTNER_LOGOS_DIR, { recursive: true });
  await fs.writeFile(path.join(PARTNER_LOGOS_DIR, fileName), data);
  return fileName;
}

/** Удалить файл логотипа; уже нет — не ошибка. Имя только из БД, но basename — на всякий случай. */
export async function removeLogo(fileName: string | null | undefined) {
  if (!fileName) return;
  await fs.rm(path.join(PARTNER_LOGOS_DIR, path.basename(fileName)), { force: true });
}

export const logoUrl = (fileName: string | null) => (fileName ? `/uploads/partners/${fileName}` : null);

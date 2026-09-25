import path from "path";

/** Загруженные файлы (логотипы партнёров). Раздаются по /uploads. В git не попадают. */
export const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || "uploads");

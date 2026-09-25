import "express";

declare module "express-serve-static-core" {
  interface Request {
    /** Идентификатор запроса, проставляется requestLogger. */
    id: string;
    /** Вошедший админ, проставляется requireAdmin. */
    admin?: { id: string; login: string };
  }
}

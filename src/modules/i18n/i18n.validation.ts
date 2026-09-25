import { query } from "express-validator";

/** ?lang=hy,ru-RU — языки по убыванию предпочтения (как navigator.languages). */
export const validateGetDictionary = [
  query("lang").optional().isString().isLength({ max: 200 }),
];

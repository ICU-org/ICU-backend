import { body } from "express-validator";

export const validateLogin = [
  body("login").isString().bail().trim().isLength({ min: 1, max: 64 }),
  body("password").isString().bail().isLength({ min: 1, max: 256 }),
];

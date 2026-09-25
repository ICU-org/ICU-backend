import { Router } from "express";
import { handleValidationErrors } from "../../shared/http/validation.middleware";
import { loginRateLimit, requireAdmin } from "./auth.middleware";
import { validateLogin } from "./auth.validation";
import { access, login, logout, me } from "./auth.controller";

/** Монтируется на /api/admin/auth — после adminNetworkGuard. */
const router = Router();

router.get("/access", access);
router.post("/login", loginRateLimit, validateLogin, handleValidationErrors, login);
router.post("/logout", logout);
router.get("/me", requireAdmin, me);

export default router;

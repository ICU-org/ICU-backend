import { Router } from "express";
import { handleValidationErrors } from "../../shared/http/validation.middleware";
import { validateGetDictionary } from "./i18n.validation";
import { getAdminDictionary, getDictionary } from "./i18n.controller";

const router = Router();

router.get("/", validateGetDictionary, handleValidationErrors, getDictionary);

/** Монтируется на /api/admin/i18n — после adminNetworkGuard. */
export const adminRouter = Router();

adminRouter.get("/", validateGetDictionary, handleValidationErrors, getAdminDictionary);

export default router;

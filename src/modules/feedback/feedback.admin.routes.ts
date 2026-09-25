import { Router } from "express";
import { handleValidationErrors } from "../../shared/http/validation.middleware";
import { validateDeleteFeedback, validateExport, validateListFeedback, validateSetExcluded } from "./feedback.validation";
import { adminDelete, adminExport, adminExports, adminList, adminSetExcluded } from "./feedback.controller";

/** Монтируется на /api/admin/feedback — после adminNetworkGuard и requireAdmin (app.ts). */
const router = Router();

router.get("/", validateListFeedback, handleValidationErrors, adminList);
router.get("/export", validateExport, handleValidationErrors, adminExport);
router.get("/exports", adminExports);
router.patch("/:id", validateSetExcluded, handleValidationErrors, adminSetExcluded); // статичные пути — выше
router.delete("/:id", validateDeleteFeedback, handleValidationErrors, adminDelete);

export default router;

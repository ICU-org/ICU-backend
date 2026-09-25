import { Router } from "express";
import { handleValidationErrors } from "../../shared/http/validation.middleware";
import { validateLang } from "./content.validation";
import { publicAbout, publicPartners } from "./content.controller";

/** Монтируется на /api/content — публично. */
const router = Router();

router.get("/partners", validateLang, handleValidationErrors, publicPartners);
router.get("/about", validateLang, handleValidationErrors, publicAbout);

export default router;

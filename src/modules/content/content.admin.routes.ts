import { Router } from "express";
import { handleValidationErrors } from "../../shared/http/validation.middleware";
import { receiveLogo } from "./content.upload";
import { validateAbout, validatePartner, validatePartnerId } from "./content.validation";
import {
  adminAbout,
  adminCreatePartner,
  adminDeletePartner,
  adminPartners,
  adminRemoveLogo,
  adminSaveAbout,
  adminSetLogo,
  adminUpdatePartner,
} from "./content.controller";

/** Монтируется на /api/admin/content — после adminNetworkGuard и requireAdmin (app.ts). */
const router = Router();

router.get("/partners", adminPartners);
router.post("/partners", validatePartner, handleValidationErrors, adminCreatePartner);
router.put("/partners/:id", validatePartnerId, validatePartner, handleValidationErrors, adminUpdatePartner);
router.delete("/partners/:id", validatePartnerId, handleValidationErrors, adminDeletePartner);
router.put("/partners/:id/logo", validatePartnerId, handleValidationErrors, receiveLogo, adminSetLogo);
router.delete("/partners/:id/logo", validatePartnerId, handleValidationErrors, adminRemoveLogo);

router.get("/about", adminAbout);
router.put("/about", validateAbout, handleValidationErrors, adminSaveAbout);

export default router;

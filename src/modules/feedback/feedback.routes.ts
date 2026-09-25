import { Router } from "express";
import { handleValidationErrors } from "../../shared/http/validation.middleware";
import { validateCreateFeedback } from "./feedback.validation";
import { create } from "./feedback.controller";

const router = Router();

router.post("/", validateCreateFeedback, handleValidationErrors, create);

export default router;

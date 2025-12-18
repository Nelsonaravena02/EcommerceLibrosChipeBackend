import { Router } from "express";
import { getSmartShippingQuote } from "../controllers/chileexpressController.js";

const router: Router = Router();

router.post("/quote", getSmartShippingQuote);

export default router;

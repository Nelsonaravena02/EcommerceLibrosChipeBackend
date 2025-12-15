// src/routes/shippingRoutes.ts
import { Router } from "express";
import { getSmartShippingQuote } from "../controllers/chileexpressController.js";

const router: Router = Router();

// Cotización “inteligente”: Coberturas + Cotizador
router.post("/quote", getSmartShippingQuote);

export default router;

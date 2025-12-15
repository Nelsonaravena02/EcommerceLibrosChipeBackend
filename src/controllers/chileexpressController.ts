// src/controllers/chilexpressSmartController.ts
import axios from "axios";
import type { Request, Response } from "express";
import { ORIGIN_SHIPPING } from "../config/shipping.js";

const BASE_GEO = "https://testservices.wschilexpress.com/georeference/api/v1.0";
const BASE_RATING = "https://testservices.wschilexpress.com/rating/api/v1.0";

interface AddressInput {
  regionCode: string;    // ej: "RM"
  countyName: string;    // ej: "Providencia"
  streetName: string;    // opcional para futuro (georeference)
  number: string;        // opcional
  postalCode?: string;
}

interface PackageInput {
  weight: string;  // "0.7"
  height: string;
  width: string;
  length: string;
}

interface SmartQuoteRequestBody {
  address: AddressInput;
  package: PackageInput;
  productType: number;    // 1 Doc / 3 Encomienda
  contentType: number;
  declaredWorth: string;
  deliveryTime: number;   // 0 todos
}

export const getSmartShippingQuote = async (req: Request, res: Response) => {
  try {
    const body = req.body as SmartQuoteRequestBody;

    if (!body.address || !body.package) {
      return res.status(400).json({
        success: false,
        error: "Faltan address o package en el body",
      });
    }

    const { address, package: pkg, productType, contentType, declaredWorth, deliveryTime } =
      body;

    if (!address.regionCode || !address.countyName) {
      return res.status(400).json({
        success: false,
        error: "Faltan regionCode o countyName en address",
      });
    }

    // 1) Consultar coberturas por región (RM, R1, etc.)
    const coverageResp = await axios.get(`${BASE_GEO}/coverage-areas`, {
      params: {
        RegionCode: address.regionCode, // ej: "RM"
        type: 0,                        // 0 = todas
      },
      headers: {
        "Ocp-Apim-Subscription-Key": process.env.CHILEXPRESS_SUBSCRIPTION_KEY as string,
      },
    });

    const coverageAreas: any[] = coverageResp.data.coverageAreas || [];

    // Buscar coincidencia por nombre de comuna (case-insensitive)
    const normalizedCounty = address.countyName.trim().toLowerCase();
    const coverage = coverageAreas.find(
      (c) => String(c.countyName).trim().toLowerCase() === normalizedCounty
    );

    if (!coverage) {
      return res.status(400).json({
        success: false,
        error: `No se encontró cobertura para la comuna: ${address.countyName}`,
      });
    }

    const destinationCountyCode = coverage.countyCode as string;

    // 2) Llamar al Cotizador con origin fijo y destino resuelto
    const quoteResp = await axios.post(
      `${BASE_RATING}/rates/courier`,
      {
        originCountyCode: ORIGIN_SHIPPING.originCountyCode,
        destinationCountyCode,
        package: pkg,
        productType,
        contentType,
        declaredWorth,
        deliveryTime,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": process.env.CHILEXPRESS_SUBSCRIPTION_KEY as string,
        },
      }
    );

    const options: any[] = quoteResp.data.data?.courierServiceOptions || [];
    const best = options[0] || null;

    return res.json({
      success: true,
      destinationCountyCode,
      quote: quoteResp.data,
      recommended: best
        ? {
            serviceType: best.serviceTypeCode,
            description: best.serviceDescription,
            price: parseInt(best.serviceValue || "0"),
            finalWeight: best.finalWeight,
            deliveryType: best.deliveryType,
          }
        : null,
    });
  } catch (error: any) {
    console.error("❌ Chilexpress SMART ERROR:", error.response?.data || error.message);
    const status = error.response?.status || 500;

    return res.status(status).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
};

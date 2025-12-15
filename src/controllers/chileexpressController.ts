// src/controllers/chilexpressSmartController.ts
import axios from "axios";
import type { Request, Response } from "express";
import { ORIGIN_SHIPPING } from "../config/shipping.js";

const BASE_GEO = "https://testservices.wschilexpress.com/georeference/api/v1.0";
const BASE_RATING = "https://testservices.wschilexpress.com/rating/api/v1.0";

interface AddressInput {
  regionCode: string;   // ej: "RM"
  countyName: string;   // ej: "Ñuñoa"
  streetName: string;   // ej: "Avenida Providencia"
  number: string;       // ej: "1245"
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

// Normaliza strings: minúsculas, sin tildes/ñ, sin espacios extras
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/ñ/g, "n")              // por si acaso
    .trim();

export const getSmartShippingQuote = async (req: Request, res: Response) => {
  try {
    const body = req.body as SmartQuoteRequestBody;

    if (!body.address || !body.package) {
      return res.status(400).json({
        success: false,
        error: "Faltan address o package en el body",
      });
    }

    const {
      address,
      package: pkg,
      productType,
      contentType,
      declaredWorth,
      deliveryTime,
    } = body;

    if (!address.regionCode || !address.countyName) {
      return res.status(400).json({
        success: false,
        error: "Faltan regionCode o countyName en address",
      });
    }

    // 1) Consultar coberturas por región (ej: RM) y type=0 (todas)
    const coverageResp = await axios.get(`${BASE_GEO}/coverage-areas`, {
      params: {
        RegionCode: address.regionCode,
        type: 0,
      },
      headers: {
        "Ocp-Apim-Subscription-Key": process.env
          .CHILEXPRESS_SUBSCRIPTION_KEY as string,
      },
    });

    const coverageAreas: any[] = coverageResp.data.coverageAreas || [];

    if (!coverageAreas.length) {
      return res.status(400).json({
        success: false,
        error: `No se encontraron coberturas para la región: ${address.regionCode}`,
      });
    }

    // Para debug: puedes dejar esto mientras pruebas
    // console.log(
    //   "Coberturas ejemplo:",
    //   coverageAreas.slice(0, 10).map((c) => ({ countyName: c.countyName, countyCode: c.countyCode }))
    // );

    const target = normalize(address.countyName);

    const coverage = coverageAreas.find((c) => {
      const name = normalize(String(c.countyName || ""));
      return name === target || name.includes(target) || target.includes(name);
    });

    if (!coverage) {
      return res.status(400).json({
        success: false,
        error: `No se encontró cobertura para la comuna: ${address.countyName}`,
      });
    }

    const destinationCountyCode = String(coverage.countyCode);

    // 2) Llamar al Cotizador con origin fijo y destino resuelto
    const quoteResp = await axios.post(
      `${BASE_RATING}/rates/courier`,
      {
        originCountyCode: ORIGIN_SHIPPING.originCountyCode, // FIJO, interno
        destinationCountyCode,                             // desde Coberturas
        package: pkg,
        productType,
        contentType,
        declaredWorth,
        deliveryTime,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": process.env
            .CHILEXPRESS_SUBSCRIPTION_KEY as string,
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

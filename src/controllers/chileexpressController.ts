import axios from "axios";
import type { Request, Response } from "express";
import { ORIGIN_SHIPPING } from "../config/shipping.js";

const BASE_GEO = "https://testservices.wschilexpress.com/georeference/api/v1.0";
const BASE_RATING = "https://testservices.wschilexpress.com/rating/api/v1.0";

interface AddressInput {
  regionCode: string;
  countyName: string;
  streetName: string;
  number: string;
  postalCode?: string;
}

interface PackageInput {
  weight: string;
  height: string;
  width: string;
  length: string;
}

interface SmartQuoteRequestBody {
  address: AddressInput;
  package: PackageInput;
  productType: number;
  contentType: number;
  declaredWorth: string;
  deliveryTime: number;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
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

    // 1) Coberturas por región
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
          "Ocp-Apim-Subscription-Key": process.env
            .CHILEXPRESS_SUBSCRIPTION_KEY as string,
        },
      }
    );

    const options: any[] = quoteResp.data.data?.courierServiceOptions || [];

    console.log(
      "Destino Chilexpress:",
      {
        regionCode: address.regionCode,
        countyName: address.countyName,
        destinationCountyCode,
      },
      "Opciones:",
      JSON.stringify(
        options.map((o) => ({
          serviceTypeCode: o.serviceTypeCode,
          serviceDescription: o.serviceDescription,
          serviceValue: o.serviceValue,
          deliveryType: o.deliveryType,
          finalWeight: o.finalWeight,
        })),
        null,
        2
      )
    );

    // Mejor opción por defecto (primera o la más barata, como prefieras)
    const best =
      options.length > 0
        ? options.reduce((min, o) =>
            parseInt(o.serviceValue || "0") < parseInt(min.serviceValue || "0")
              ? o
              : min
          )
        : null;

    return res.json({
      success: true,
      destinationCountyCode,
      quote: quoteResp.data,
      options: options.map((o) => ({
        serviceType: o.serviceTypeCode,
        description: o.serviceDescription,
        price: parseInt(o.serviceValue || "0"),
        finalWeight: o.finalWeight,
        deliveryType: o.deliveryType,
      })),
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
    console.error(
      "❌ Chilexpress SMART ERROR:",
      error.response?.data || error.message
    );
    const status = error.response?.status || 500;

    return res.status(status).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
};

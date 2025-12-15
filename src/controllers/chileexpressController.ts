import axios from "axios";
import type { Request, Response } from "express";

interface ChilexpressRateRequest {
  originCountyCode: string;
  destinationCountyCode: string;
  package: {
    weight: string;
    height: string;
    width: string;
    length: string;
  };
  productType: number;
  contentType: number;
  declaredWorth: string;
  deliveryTime: number;
}

export const getShippingQuote = async (req: Request, res: Response) => {
  try {
    const data: ChilexpressRateRequest = req.body;

    const quoteResponse = await axios.post(
      "https://testservices.wschilexpress.com/rating/api/v1.0/rates/courier",
      {
        originCountyCode: data.originCountyCode,
        destinationCountyCode: data.destinationCountyCode,
        package: data.package,
        productType: data.productType,
        contentType: data.contentType,
        declaredWorth: data.declaredWorth,
        deliveryTime: data.deliveryTime,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": process.env.CHILEXPRESS_SUBSCRIPTION_KEY as string,
        },
      }
    );

    const options = quoteResponse.data.data?.courierServiceOptions || [];
    const bestOption = options[0];

    res.json({
      success: true,
      quote: quoteResponse.data,
      recommended: bestOption
        ? {
            serviceType: bestOption.serviceTypeCode,
            description: bestOption.serviceDescription,
            price: parseInt(bestOption.serviceValue || "0"),
            finalWeight: bestOption.finalWeight,
            deliveryType: bestOption.deliveryType,
          }
        : null,
    });
  } catch (error: any) {
    console.error("❌ Chilexpress ERROR:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
};

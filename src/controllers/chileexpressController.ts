import axios from 'axios';
import type { Request, Response } from 'express';

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

    console.log('🚚 Cotizando Chilexpress OFICIAL:', data);

    const tokenResponse = await axios.post('https://apiws.chilexpress.cl/api/v2/Auth/Login', {
      primary_key: process.env.CHILEXPRESS_PRIMARY_KEY,
      secondary_key: process.env.CHILEXPRESS_SECONDARY_KEY
    });

    const token = tokenResponse.data.access_token;

    const quoteResponse = await axios.post(
      'https://testservices.wschilexpress.com/rating/api/v1.0/rates/courier', 
      {
        originCountyCode: data.originCountyCode,
        destinationCountyCode: data.destinationCountyCode,
        package: {
          weight: data.package.weight,
          height: data.package.height,
          width: data.package.width,
          length: data.package.length
        },
        productType: data.productType,
        contentType: data.contentType,
        declaredWorth: data.declaredWorth,
        deliveryTime: data.deliveryTime
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Cotización:', quoteResponse.data);

    // Extraer primera opción (más barata)
    const bestOption = quoteResponse.data.data?.courierServiceOptions?.[0];

    res.json({
      success: true,
      quote: quoteResponse.data,
      recommended: {
        serviceType: bestOption?.serviceTypeCode,
        description: bestOption?.serviceDescription,
        price: parseInt(bestOption?.serviceValue || '0'),
        finalWeight: bestOption?.finalWeight,
        deliveryType: bestOption?.deliveryType
      }
    });

  } catch (error: any) {
    console.error('❌ Chilexpress ERROR:', error.response?.data);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
      statusCode: error.response?.data?.statusCode
    });
  }
};

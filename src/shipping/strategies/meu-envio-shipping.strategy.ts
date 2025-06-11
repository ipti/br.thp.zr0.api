import { Injectable } from '@nestjs/common';
import { ShippingStrategy } from './shipping.strategy';
import axios from 'axios';

import { ShippingOption } from '../entities/melhor-envio-result.entity';
import {
  ShippingContext,
  MeuEnvioRequest,
} from '../entities/shipping-context.entity';
import {
  ShippingCalculationResult,
  ShippingQuoteResponse,
} from '../entities/shipping-result.entity';

@Injectable()
export class MeuEnvioShippingStrategy implements ShippingStrategy {
  async calculate(
    context: ShippingContext,
  ): Promise<ShippingCalculationResult> {
    const requestPayload: MeuEnvioRequest = {
      from: {
        postal_code: context.originZipCode.replace('-', ''),
      },
      to: {
        postal_code: context.destinationZipCode.replace('-', ''),
      },
      products: context.products.map((p) => ({
        id: p.id.toString(),
        width: p.width,
        height: p.height,
        length: p.length,
        weight: p.weight,
        insurance_value: p.insuranceValue ?? 0,
        quantity: p.quantity,
      })),
    };
    const response = await axios.post<ShippingOption[]>(
      `${process.env.MELHOR_ENVIO_API_URL}/api/v2/me/shipment/calculate`,
      requestPayload,
      {
        headers: {
          Authorization: `Bearer ${process.env.MELHOR_ENVIO_API_TOKEN}`,
        },
      },
    );

    const shippingQuotes = this.parseShippingApiResponse(response.data);

    if (!shippingQuotes || shippingQuotes.length === 0) {
      throw new Error('No shipping options returned from MeuEnvio.');
    }

    // Seleciona o frete mais barato como exemplo
    const validOptions = shippingQuotes.filter((a) => a.error == null);
    const bestOption = validOptions.reduce((a, b) => (a.cost < b.cost ? a : b));

    return {
      bestOption,
      validOptions,
    };
  }

  parseShippingApiResponse(
    apiResponse: ShippingOption[],
  ): ShippingQuoteResponse {
    return apiResponse.map((item) => {
      const carrier = item.company?.name ?? 'Unknown';
      const trackingCarriers = ['Correios'];
      const cost = item.price ? parseFloat(item.price) : 0;
      const deliveryTime = item.delivery_time ?? 0;

      return {
        service: item.name ?? 'Unknown',
        carrier,
        cost,
        deliveryTime,
        tracking: trackingCarriers.includes(carrier),
        error: item.error ?? null,
        serviceCode: item.id?.toString() ?? undefined,
      };
    });
  }
}

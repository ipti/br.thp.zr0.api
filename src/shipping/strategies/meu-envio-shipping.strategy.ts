import { Injectable } from '@nestjs/common';
import { ShippingStrategy } from './shipping.strategy';
import axios from 'axios';
import {
  MeuEnvioRequest,
  ShippingContext,
} from 'src/shipping/entities/shipping-context.entity';
import { ShippingQuoteResponse } from 'src/shipping/entities/shipping-result.entity';

@Injectable()
export class MeuEnvioShippingStrategy implements ShippingStrategy {
  async calculate(context: ShippingContext): Promise<number> {
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
    const response = await axios.post<ShippingQuoteResponse>(
      'https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate',
      requestPayload,
      {
        headers: {
          Authorization: `Bearer ${process.env.MEU_ENVIO_API_TOKEN}`,
        },
      },
    );

    const shippingQuotes = response.data;

    if (!shippingQuotes || shippingQuotes.length === 0) {
      throw new Error('No shipping options returned from MeuEnvio.');
    }

    // Seleciona o frete mais barato como exemplo
    const bestOption = shippingQuotes.reduce((a, b) =>
      a.cost < b.cost ? a : b,
    );

    return bestOption.cost;
  }
}

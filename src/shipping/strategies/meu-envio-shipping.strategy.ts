import { Injectable, Logger } from '@nestjs/common';
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

export interface ProductDimensions {
  width: number;
  height: number;
  length: number;
  weight: number;
}

// Menores valores aceitos pela API do Melhor Envio para uma cotação válida.
const MIN_DIMENSION_CM = 1;
const MIN_WEIGHT_KG = 0.1;

@Injectable()
export class MeuEnvioShippingStrategy implements ShippingStrategy {
  private readonly logger = new Logger(MeuEnvioShippingStrategy.name);

  private sanitizeDimensions(
    dimensions: ProductDimensions,
    productId?: number | string,
  ): ProductDimensions {
    const sanitized = {
      width: dimensions.width > 0 ? dimensions.width : MIN_DIMENSION_CM,
      height: dimensions.height > 0 ? dimensions.height : MIN_DIMENSION_CM,
      length: dimensions.length > 0 ? dimensions.length : MIN_DIMENSION_CM,
      weight: dimensions.weight > 0 ? dimensions.weight : MIN_WEIGHT_KG,
    };

    if (
      sanitized.width !== dimensions.width ||
      sanitized.height !== dimensions.height ||
      sanitized.length !== dimensions.length ||
      sanitized.weight !== dimensions.weight
    ) {
      this.logger.warn(
        `Produto ${productId ?? '(desconhecido)'} com dimensões ausentes/zeradas ` +
          `(${JSON.stringify(dimensions)}); usando fallback mínimo para cotação de frete.`,
      );
    }

    return sanitized;
  }

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
        ...this.sanitizeDimensions(p, p.id),
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

  async calculatePrice(
    fromCep: string,
    toCep: string,
    dimensions: ProductDimensions,
  ): Promise<{ cost: number; deliveryTimeDays: number; service: string }> {
    const { width, height, length, weight } =
      this.sanitizeDimensions(dimensions);
    const payload = {
      from: { postal_code: fromCep },
      to: { postal_code: toCep },
      package: {
        height,
        width,
        length,
        weight,
      },
      services: '1,2,3', // vazio para retornar todos os serviços disponíveis
    };

    const response = await axios.post<ShippingOption[]>(
      `${process.env.MELHOR_ENVIO_API_URL}/api/v2/me/shipment/calculate`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.MELHOR_ENVIO_API_TOKEN}`,
        },
      },
    );

    const validOptions = (response?.data ?? [])
      .filter((item) => item.error == null && item.price)
      .map((item) => ({
        cost: parseFloat(item.price),
        deliveryTimeDays: item.delivery_time ?? 0,
        service: item.name ?? 'Unknown',
      }));

    if (validOptions.length === 0) {
      return { cost: 0, deliveryTimeDays: 0, service: 'Unknown' };
    }

    // Mesmo critério de "melhor opção" já usado em calculate(): menor custo.
    return validOptions.reduce((a, b) => (a.cost < b.cost ? a : b));
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

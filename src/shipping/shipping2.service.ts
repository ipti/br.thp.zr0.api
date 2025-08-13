import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MeuEnvioShippingStrategy } from './strategies/meu-envio-shipping.strategy';
import { ShippingRequestDto } from './dto/shipping.dto';
import { ShippingCalculationResult } from './entities/shipping-result.entity';

@Injectable()
export class Shipping2Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meuEnvioShippingStrategy: MeuEnvioShippingStrategy,
  ) {}

  async calculate(dto: ShippingRequestDto) {
    const shipments: {
      workshopId: number;
      result: ShippingCalculationResult;
    }[] = [];

    for (const orderItems of dto.orderItems) {
      const product_tw =
        await this.prisma.transformation_workshop_product.findMany({
          where: { product_fk: orderItems.productId },
        });

      const quantity_tw = product_tw.map((p) => {
        return {
          quantity: p.quantity,
          workshopId: p.transformation_workshop_fk,
        };
      });
      const teste = this.algothmsMoneyShipping(
        orderItems.quantity,
        quantity_tw,
      );

      console.log(teste);
    }

    return shipments;
  }

  private algothmsMoneyShipping(
    quantityTotal: number,
    tw: {
      quantity: number;
      workshopId: number | null;
    }[],
  ) {
    const resultado = {};
    let restante = quantityTotal;
    for (const quantity_tw_max of tw) {
      const qtd = Math.ceil(restante / quantity_tw_max.quantity);
      if (qtd > 0) {
        resultado[quantity_tw_max.workshopId!] =
          restante < quantity_tw_max.quantity
            ? restante
            : quantity_tw_max.quantity;
        restante = restante - quantity_tw_max.quantity;
      }
    }
    return resultado;
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MeuEnvioShippingStrategy } from './strategies/meu-envio-shipping.strategy';
import { ShippingRequestDto } from './dto/shipping.dto';
import { ShippingCalculationResult } from './entities/shipping-result.entity';
import { ShippingContext } from './entities/shipping-context.entity';

@Injectable()
export class Shipping2Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meuEnvioShippingStrategy: MeuEnvioShippingStrategy,
  ) { }

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
      const ordemItens = this.algothmsMoneyShipping(
        orderItems.quantity,
        quantity_tw,
      );

      // for (const [workshopId, quant] in Object.entries(ordemItens)) {

  
      //   const result = await this.meuEnvioShippingStrategy.calculate(context);


      //   console.log(ordemItens);
      // }

      return shipments;
    }
  }

  private async buildShippingContext(
    workshopId: number,
    items: {
      productId: number;
      quantity: number;
      product: ProductWithWorkshop;
    }[],
    destinationZipCode: string,
  ): Promise<ShippingContext> {
    const workshop = await this.prisma.transformation_workshop.findUnique({
      where: { id: workshopId },
      select: { cep: true },
    });

    if (!workshop) throw new Error(`Workshop ${workshopId} not found`);

    return {
      originZipCode: workshop.cep ?? '',
      destinationZipCode,
      products: items.map((item) => ({
        id: item.productId.toString(), // pode ser string ou number, conforme API
        width: item.product.width ?? 0,
        height: item.product.height ?? 0,
        length: item.product.length ?? 0,
        weight: item.product.weight ?? 0,
        insuranceValue: 0, // opcional, ajustar se precisar baseado no subtotal ou preço
        quantity: item.quantity,
      })),
    };
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


type ProductWithWorkshop = {
  id: number;
  weight: number | null;
  height: number | null;
  width: number | null;
  length: number | null;
  transformation_workshop_product: {
    id: number;
    transformation_workshop: {
      id: number;
      cep: string | null;
    } | null;
  }[];
};

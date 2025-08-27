import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ShippingRequestDto } from './dto/shipping.dto';
import { MeuEnvioShippingStrategy } from './strategies/meu-envio-shipping.strategy';
import { ShippingContext } from './entities/shipping-context.entity';
import { ShippingCalculationResult } from './entities/shipping-result.entity';

@Injectable()
export class ShippingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meuEnvioShippingStrategy: MeuEnvioShippingStrategy,
  ) {}

  async calculate(dto: ShippingRequestDto): Promise<{
    totalCost: number;
    shipments: { workshopId: number; result: ShippingCalculationResult }[];
  }> {
    const products = await this.fetchProductsWithWorkshop(
      dto.orderItems.map((i) => i.productId),
    );

    const itemsGrouped = await this.groupItemsByWorkshop(dto, products);

    let totalShippingCost = 0;

    const shipments: {
      workshopId: number;
      result: ShippingCalculationResult;
    }[] = [];

    console.log('Items grouped by workshop:', itemsGrouped);
    for (const [workshopId, items] of Object.entries(itemsGrouped)) {
      const context = await this.buildShippingContext(
        Number(workshopId),
        items,
        dto.destinationZipCode,
      );

      const total = items.reduce((acc, item) => acc + item.quantity, 0);
      const quantWorkshop = await this.algothmsMoneyShipping(total, items);

      console.log(quantWorkshop);
      const result = await this.meuEnvioShippingStrategy.calculate(context);
      totalShippingCost += result.bestOption.cost;
      shipments.push({ workshopId: Number(workshopId), result });
    }

    return {
      totalCost: totalShippingCost,
      shipments,
    };
  }

  private async fetchProductsWithWorkshop(
    productIds: number[],
  ): Promise<ProductWithWorkshop[]> {
    return this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        weight: true,
        height: true,
        width: true,
        length: true,
        transformation_workshop_product: {
          select: {
            id: true,
            transformation_workshop: {
              select: { id: true, cep: true },
            },
          },
        },
      },
    });
  }

  private async groupItemsByWorkshop(
    dto: ShippingRequestDto,
    products: ProductWithWorkshop[],
  ): Promise<
    Record<
      number,
      { productId: number; quantity: number; product: ProductWithWorkshop }[]
    >
  > {
    type GroupedItem = {
      productId: number;
      quantity: number;
      product: ProductWithWorkshop;
      quantity_tw: number | undefined;
    };

    const grouped: Record<number, GroupedItem[]> = {};

    for (const item of dto.orderItems) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found.`);
      }

      const workshopAssociations =
        product.transformation_workshop_product.filter(
          (tw) => tw.transformation_workshop?.id,
        );

      if (workshopAssociations.length === 0) {
        throw new Error(
          `Product ${item.productId} has no associated workshops.`,
        );
      }

      // Distribui a quantidade igualmente entre os workshops (ou repete a mesma quantidade para todos)
      // Aqui usamos a MESMA quantidade para cada workshop, mas você pode alterar essa lógica
      for (const association of workshopAssociations) {
        const workshopId = association.transformation_workshop!.id;

        const product_tw =
          await this.prisma.transformation_workshop_product.findFirst({
            where: {
              product_fk: item.productId,
              transformation_workshop_fk: workshopId,
            },
            select: { quantity: true, id: true },
          });

        if (!grouped[workshopId]) {
          grouped[workshopId] = [];
        }

        grouped[workshopId].push({
          productId: item.productId,
          quantity: item.quantity,
          quantity_tw: product_tw?.quantity, // Mantém a mesma quantidade para cada workshop
          product,
        });
      }
    }

    return grouped;
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

  private async algothmsMoneyShipping(quantityTotal: number, products: any) {
    const resultado = {};
    let restante = quantityTotal;
    for (const product of products) {
      const qtd = Math.floor(restante / product.quantity_tw);
      if (qtd > 0) {
        resultado[product.quantity_tw] = qtd;
        restante -= qtd * product.quantity_tw;
      }

      return resultado;
    }
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

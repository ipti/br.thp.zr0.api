/**
 * Testes de isolamento entre os dois fluxos de compra (Pronta Entrega vs.
 * Encomenda), exigidos pela TASK-09. Rodam como testes unitários comuns
 * (sem bootstrap de app/HTTP) porque a infraestrutura de e2e do projeto
 * (test/*.e2e-spec.ts via AppModule real) trava no bootstrap por um problema
 * pré-existente não relacionado a esta feature (ver Nota de execução da
 * TASK-09) — o valor de verificação aqui não depende de subir a aplicação.
 */
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { CreateOrderDto } from './orders/dto/create-order.dto';
import { CreateProductionOrderDto } from './production-order/dto/create-production-order.dto';

describe('Isolamento entre Pedido de Pronta Entrega e Pedido de Encomenda', () => {
  describe('CreateOrderDto (Pronta Entrega)', () => {
    it('não define nenhum campo de simulação/encomenda', () => {
      const dto = new CreateOrderDto();
      expect(dto).not.toHaveProperty('simulationMode');
      expect(dto).not.toHaveProperty('productionCapacity');
      expect(dto).not.toHaveProperty('saleType');
    });

    it('o ValidationPipe global (whitelist:true) descarta campos de encomenda enviados no payload de Pronta Entrega', async () => {
      const pipe = new ValidationPipe({ transform: true, whitelist: true });

      const result = (await pipe.transform(
        {
          userId: 1,
          items: [
            {
              productId: 'p1',
              workshopId: 1,
              quantity: 1,
              delivery_estimate: { cost: 0 },
            },
          ],
          simulationMode: 'DEADLINE',
          productionCapacity: 999,
        },
        { type: 'body', metatype: CreateOrderDto },
      )) as unknown as Record<string, unknown>;

      expect(result.simulationMode).toBeUndefined();
      expect(result.productionCapacity).toBeUndefined();
      expect(result.userId).toBe(1);
    });
  });

  describe('CreateProductionOrderDto (Encomenda)', () => {
    it('não define nenhum campo de estoque/workshop de pronta entrega', () => {
      const dto = new CreateProductionOrderDto();
      expect(dto).not.toHaveProperty('inventory');
      expect(dto).not.toHaveProperty('stockReservationId');
      expect(dto).not.toHaveProperty('coupon_code');
    });
  });

  describe('Isolamento de módulos (import estático)', () => {
    function readModuleSource(relativePath: string): string {
      return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
    }

    it('ProductionOrderModule nunca importa CheckoutModule/OrdersModule/InventoryModule', () => {
      const source = readModuleSource(
        'production-order/production-order.module.ts',
      );
      expect(source).not.toMatch(/CheckoutModule/);
      expect(source).not.toMatch(/OrdersModule/);
      expect(source).not.toMatch(/InventoryModule/);
    });

    it('CheckoutModule/OrdersModule nunca importam ProductionOrderModule', () => {
      const checkoutSource = readModuleSource('checkout/checkout.module.ts');
      const ordersSource = readModuleSource('orders/orders.module.ts');
      expect(checkoutSource).not.toMatch(/ProductionOrderModule/);
      expect(ordersSource).not.toMatch(/ProductionOrderModule/);
    });

    it('ProductionOrderService nunca referencia prisma.inventory/prisma.stock_reservation', () => {
      const source = readModuleSource(
        'production-order/shared/production-order.service.ts',
      );
      expect(source).not.toMatch(/\.inventory\./);
      expect(source).not.toMatch(/\.stock_reservation\./);
    });

    it('CheckoutService/OrdersService nunca referenciam production_capacity/production_reservation', () => {
      const checkoutSource = readModuleSource('checkout/checkout.service.ts');
      const ordersSource = readModuleSource('orders/orders.service.ts');
      expect(checkoutSource).not.toMatch(
        /production_capacity|production_reservation/,
      );
      expect(ordersSource).not.toMatch(
        /production_capacity|production_reservation/,
      );
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ShippingService } from './shipping.service';
import { PrismaService } from '../prisma/prisma.service';
import { MeuEnvioShippingStrategy } from './strategies/meu-envio-shipping.strategy';

describe('ShippingService', () => {
  let service: ShippingService;
  let prisma: {
    product: { findFirst: jest.Mock };
    inventory: { findMany: jest.Mock };
    stock_reservation: { groupBy: jest.Mock };
    transformation_workshop: { findUnique: jest.Mock };
  };
  let meuEnvioShippingStrategy: {
    calculatePrice: jest.Mock;
    calculate: jest.Mock;
  };

  const PRODUCT = {
    id: 1,
    uid: 'product-uid',
    name: 'Cadeira',
    width: 60,
    height: 40,
    length: 80,
    weight: 12.5,
  };

  beforeEach(async () => {
    prisma = {
      product: { findFirst: jest.fn().mockResolvedValue(PRODUCT) },
      inventory: {
        findMany: jest.fn().mockResolvedValue([
          {
            quantity: 10,
            transformation_workshop_fk: 1,
            transformation_workshop: { cep: '02000-000' },
          },
        ]),
      },
      stock_reservation: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
      transformation_workshop: {
        findUnique: jest.fn().mockResolvedValue({
          cep: '02000-000',
          name: 'OT A',
          state: 'SP',
          city: 'São Paulo',
        }),
      },
    };
    meuEnvioShippingStrategy = {
      calculatePrice: jest.fn().mockResolvedValue({
        cost: 30,
        deliveryTimeDays: 5,
        service: 'PAC',
      }),
      calculate: jest.fn().mockResolvedValue({
        bestOption: { cost: 30, deliveryTime: 5, service: 'PAC' },
        validOptions: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: MeuEnvioShippingStrategy,
          useValue: meuEnvioShippingStrategy,
        },
      ],
    }).compile();

    service = module.get<ShippingService>(ShippingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculate', () => {
    it('cota o frete de ranqueamento usando as dimensões reais do produto, não a caixa genérica', async () => {
      await service.calculate({
        destinationZipCode: '01000-000',
        orderItems: [{ productId: PRODUCT.uid, quantity: 5 }],
      } as never);

      expect(meuEnvioShippingStrategy.calculatePrice).toHaveBeenCalledWith(
        '01000-000',
        '02000-000',
        {
          width: PRODUCT.width,
          height: PRODUCT.height,
          length: PRODUCT.length,
          weight: PRODUCT.weight,
        },
      );
    });
  });
});

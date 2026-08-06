import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { ProductionCapacityService } from './production-capacity.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProductionCapacityService', () => {
  let service: ProductionCapacityService;
  let prisma: {
    production_capacity: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const CAPACITY = {
    transformation_workshop_fk: 1,
    product_fk: 10,
    monthly_capacity: 35,
    active: true,
  };

  beforeEach(async () => {
    prisma = {
      production_capacity: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionCapacityService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProductionCapacityService>(ProductionCapacityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('cria a capacidade de produção conectando produto e OT', async () => {
      prisma.production_capacity.create.mockResolvedValue(CAPACITY);

      const result = await service.create({
        idProduct: 10,
        idTransformationWorkshop: 1,
        monthlyCapacity: 35,
        active: true,
      });

      expect(result).toEqual(CAPACITY);
      expect(prisma.production_capacity.create).toHaveBeenCalledWith({
        data: {
          product: { connect: { id: 10 } },
          transformation_workshop: { connect: { id: 1 } },
          monthly_capacity: 35,
          active: true,
        },
      });
    });

    it('assume active=false quando não informado', async () => {
      prisma.production_capacity.create.mockResolvedValue(CAPACITY);

      await service.create({
        idProduct: 10,
        idTransformationWorkshop: 1,
        monthlyCapacity: 35,
      });

      const [args] = prisma.production_capacity.create.mock.calls[0] as [
        { data: { active: boolean } },
      ];
      expect(args.data.active).toBe(false);
    });
  });

  describe('findOne', () => {
    it('retorna a capacidade quando encontrada', async () => {
      prisma.production_capacity.findUnique.mockResolvedValue(CAPACITY);

      const result = await service.findOne(1, 10);

      expect(result).toEqual(CAPACITY);
    });

    it('lança 404 quando não encontrada', async () => {
      prisma.production_capacity.findUnique.mockResolvedValue(null);

      await expect(service.findOne(1, 10)).rejects.toThrow(HttpException);
    });
  });

  describe('update', () => {
    it('atualiza apenas os campos informados', async () => {
      prisma.production_capacity.findUnique.mockResolvedValue(CAPACITY);
      prisma.production_capacity.update.mockResolvedValue({
        ...CAPACITY,
        monthly_capacity: 40,
      });

      const result = await service.update(1, 10, { monthlyCapacity: 40 });

      expect(result.monthly_capacity).toBe(40);
      expect(prisma.production_capacity.update).toHaveBeenCalledWith({
        where: {
          transformation_workshop_fk_product_fk: {
            transformation_workshop_fk: 1,
            product_fk: 10,
          },
        },
        data: { monthly_capacity: 40 },
      });
    });

    it('lança 404 ao tentar atualizar capacidade inexistente', async () => {
      prisma.production_capacity.findUnique.mockResolvedValue(null);

      await expect(
        service.update(1, 10, { monthlyCapacity: 40 }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('remove', () => {
    it('remove a capacidade existente', async () => {
      prisma.production_capacity.findUnique.mockResolvedValue(CAPACITY);
      prisma.production_capacity.delete.mockResolvedValue(CAPACITY);

      const result = await service.remove(1, 10);

      expect(result).toEqual({
        message: 'Capacidade de produção removida com sucesso',
      });
    });

    it('lança 404 ao tentar remover capacidade inexistente', async () => {
      prisma.production_capacity.findUnique.mockResolvedValue(null);

      await expect(service.remove(1, 10)).rejects.toThrow(HttpException);
    });
  });

  describe('findAll', () => {
    it('filtra por produto, OT e active quando informados', async () => {
      prisma.production_capacity.findMany.mockResolvedValue([CAPACITY]);
      prisma.production_capacity.count.mockResolvedValue(1);

      const result = await service.findAll({
        idProduct: 10,
        idTransformationWorkshop: 1,
        active: true,
        page: 1,
        limit: 20,
      });

      expect(result.data).toEqual([CAPACITY]);
      expect(result.pagination.total).toBe(1);
      expect(prisma.production_capacity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            product_fk: 10,
            transformation_workshop_fk: 1,
            active: true,
          },
        }),
      );
    });
  });
});

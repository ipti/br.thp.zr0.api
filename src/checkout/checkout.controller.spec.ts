import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('CheckoutController', () => {
  let controller: CheckoutController;
  let checkoutService: {
    reserveStock: jest.Mock;
    releaseExpiredReservations: jest.Mock;
  };

  beforeEach(async () => {
    checkoutService = {
      reserveStock: jest.fn().mockResolvedValue({ expiresAt: new Date() }),
      releaseExpiredReservations: jest.fn().mockResolvedValue({ released: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckoutController],
      providers: [{ provide: CheckoutService, useValue: checkoutService }],
    }).compile();

    controller = module.get<CheckoutController>(CheckoutController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delega a reserva de estoque ao CheckoutService', async () => {
    const body = { userId: 1, items: [] } as never;

    await controller.reserve(body);

    expect(checkoutService.reserveStock).toHaveBeenCalledWith(body);
  });

  it('exige JwtAuthGuard em POST /checkout/release-expired', () => {
    const reflector = new Reflector();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const { releaseExpired } = controller;
    const guards = reflector.get<unknown[]>(GUARDS_METADATA, releaseExpired);

    expect(guards).toContain(JwtAuthGuard);
  });

  it('release-expired delega ao CheckoutService', async () => {
    await controller.releaseExpired();

    expect(checkoutService.releaseExpiredReservations).toHaveBeenCalledTimes(1);
  });
});

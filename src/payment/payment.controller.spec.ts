import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

describe('PaymentController', () => {
  let controller: PaymentController;
  const paymentService = {
    getPaymentIntent: jest.fn(),
    refundPaymentIntent: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [{ provide: PaymentService, useValue: paymentService }],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
  });

  it('protege todos os endpoints com JwtAuthGuard', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, PaymentController) ?? [];
    expect(guards).toContain(JwtAuthGuard);
  });

  it('usa a identidade autenticada ao buscar o pagamento', async () => {
    paymentService.getPaymentIntent.mockResolvedValue({ id: 'pi_1' });

    await controller.getPaymentIntent(
      { user: { id: 7, role: 'CUSTOMER' } } as never,
      '10',
    );

    expect(paymentService.getPaymentIntent).toHaveBeenCalledWith(
      10,
      7,
      'CUSTOMER',
    );
  });

  it('impede reembolso por cliente', async () => {
    await expect(
      controller.refundPaymentIntent(
        { user: { id: 7, role: 'CUSTOMER' } } as never,
        { idOrder: 10 },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

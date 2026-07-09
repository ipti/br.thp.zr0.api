import { PaymentMethod } from '@prisma/client';

// dto/create-order.dto.ts
export class CreateOrderDto {
  customerId: number;
  destinationZipCode: string;
  workshopId: number;
  orderItems: {
    productId: number;
    quantity: number;
  }[];
  paymentMethod: PaymentMethod;
}

export class CreateStockReservationDto {
  userId: number;
  items: {
    productId: string;
    workshopId: number;
    quantity: number;
  }[];
}

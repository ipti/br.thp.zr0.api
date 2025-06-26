export interface CheckoutResult {
  orderId: number;
  total: number;
  shipping: {
    cost: number;
    service: string;
    deliveryTime: number;
  };
  payment: {
    method: string;
    status: 'pending' | 'paid';
  };
}

export type ProductWithPrice = {
  id: number;
  price: number | null;
};

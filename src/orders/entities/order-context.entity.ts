export interface OrderContext {
  paymentMethod: 'credit_card' | 'pix' | 'boleto';
  customerId: number;
  shippingAddress: {
    zipCode: string;
    state: string;
    city: string;
    district: string;
    street: string;
    number: string;
    complement?: string;
  };
}

export interface ProductForShipping {
  id: number | string;
  width: number; // cm
  height: number; // cm
  length: number; // cm
  weight: number; // kg
  insuranceValue?: number;
  quantity: number;
}

export interface ShippingContext {
  originZipCode: string;
  destinationZipCode: string;
  products: ProductForShipping[];
}
export interface MeuEnvioProduct {
  id: string; // ou number, depende do seu sistema
  width: number;
  height: number;
  length: number;
  weight: number;
  insurance_value: number;
  quantity: number;
}

export interface MeuEnvioRequest {
  from: { postal_code: string };
  to: { postal_code: string };
  products: MeuEnvioProduct[];
}

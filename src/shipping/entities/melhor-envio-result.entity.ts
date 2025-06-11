export interface ShippingOption {
  id: number;
  name: string;
  price: string;
  discount: string;
  currency: string;
  delivery_time: number;
  delivery_range: {
    min: number;
    max: number;
  };
  packages: Package[];
  additional_services: AdditionalServices;
  company: Company;
  error?: string | null;
}

export interface Package {
  price?: string; // nem sempre presente, pode ser opcional
  discount?: string; // idem
  format: string;
  dimensions: Dimensions;
  weight: string;
  insurance_value: string;
  products: Product[];
}

export interface Dimensions {
  height: number;
  width: number;
  length: number;
}

export interface Product {
  id: string;
  quantity: number;
}

export interface AdditionalServices {
  receipt: boolean;
  own_hand: boolean;
  collect: boolean;
}

export interface Company {
  id: number;
  name: string;
  picture: string;
}

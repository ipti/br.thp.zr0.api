export interface ShippingRate {
  service: string; // e.g., "PAC", "SEDEX"
  carrier: string; // e.g., "Correios", "Jadlog"
  cost: number; // e.g., 28.90
  deliveryTime: number; // in business days
  tracking: boolean; // true if tracking is available
  error?: string | null; // optional error field
  serviceCode?: string; // internal service code
}
export interface ShippingCalculationResult {
  bestOption: ShippingRate;
  validOptions: ShippingRate[];
}

export type ShippingQuoteResponse = ShippingRate[];

export interface ProductionReservationAllocation {
  workshopId: number;
  quantity: number;
  productionReservationId: number;
  estimatedReadyAt: Date;
}

export interface ReservationResult {
  expiresAt: Date;
  reservations: ProductionReservationAllocation[];
}

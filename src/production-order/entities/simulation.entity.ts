import { SimulationMode } from '@prisma/client';

export interface ShipmentAllocation {
  workshopId: number;
  workshopName: string;
  quantity: number;
  freightCost: number;
  freightService: string;
  freightDeliveryDaysBusiness: number;
  readyAt: Date; // finishDateFor(...) — sempre produção do zero
  deliveryAt: Date; // readyAt + trânsito convertido em dias corridos
}

export interface SimulationPlan {
  mode: SimulationMode;
  shipments: ShipmentAllocation[];
  totalCost: number;
  maxDeliveryAt: Date;
}

export interface SimulationResult {
  costPlan?: SimulationPlan;
  deadlinePlan?: SimulationPlan;
  unavailable?: boolean; // true = nenhuma OT com capacidade ativa para o produto
}

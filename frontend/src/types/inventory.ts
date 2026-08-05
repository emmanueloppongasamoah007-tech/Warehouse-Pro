export type InventoryStatus = "healthy" | "low" | "critical";

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  location: string;
  stock: number;
  target: number;
  status: InventoryStatus;
  updatedAt: string;
}

export interface ShoppingItem {
  id: number;
  addedById: number;
  addedByName: string;
  name: string;
  quantity: string | null;
  checked: boolean;
  createdAt: string;
}

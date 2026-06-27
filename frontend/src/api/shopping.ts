import instance from './instance';
import type { ApiResponse } from '../types/auth';
import type { ShoppingItem } from '../types/shopping';

export const getShoppingItems = (groupId: number) =>
  instance.get<ApiResponse<ShoppingItem[]>>(`/api/groups/${groupId}/shopping-items`).then((r) => r.data.data);

export const addShoppingItem = (groupId: number, name: string, quantity?: string) =>
  instance
    .post<ApiResponse<ShoppingItem>>(`/api/groups/${groupId}/shopping-items`, { name, quantity: quantity ?? null })
    .then((r) => r.data.data);

export const toggleShoppingItem = (groupId: number, itemId: number) =>
  instance
    .patch<ApiResponse<ShoppingItem>>(`/api/groups/${groupId}/shopping-items/${itemId}/check`)
    .then((r) => r.data.data);

export const deleteShoppingItem = (groupId: number, itemId: number) =>
  instance.delete(`/api/groups/${groupId}/shopping-items/${itemId}`);

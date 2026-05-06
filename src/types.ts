export type UserRole = 'admin' | 'staff';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  photoURL?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stockLevel: number;
  minStockAlert: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Sale {
  id: string;
  invoiceId: string;
  totalAmount: number;
  discount: number;
  paidAmount: number;
  change: number;
  customerName: string;
  items: SaleItem[];
  handledBy: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  recordedBy: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
}

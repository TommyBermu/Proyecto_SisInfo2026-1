export type Role = 'customer' | 'waiter' | 'kitchen' | 'admin';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'starter' | 'main' | 'dessert' | 'drink';
  image: string;
  available: boolean;
}

export interface Table {
  id: string;
  number: number;
  seats: number;
  status: 'free' | 'occupied' | 'waiting-food' | 'payment-pending';
  x: number; // For map position
  y: number; // For map position
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  notes?: string;
  status: 'pending' | 'cooking' | 'ready' | 'served';
}

export interface Order {
  id: string;
  tableId: string; // "takeaway" for non-table orders
  items: OrderItem[];
  status: 'open' | 'closed';
  createdAt: Date;
  completedAt?: Date;
  total: number;
  waiterId?: string;
}

export interface Reservation {
  id: string;
  name: string;
  email: string;
  phone: string;
  date: Date;
  guests: number;
  status: 'confirmed' | 'cancelled';
}

export interface SaleStats {
  date: string;
  totalSales: number;
  ordersCount: number;
}

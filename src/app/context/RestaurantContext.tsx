import React, { createContext, useContext, useState, ReactNode } from 'react';

// --- Types ---

export type DishStatus = 'active' | 'inactive';
export type TableStatus = 'free' | 'occupied' | 'waiting_food' | 'payment_pending';
export type OrderStatus = 'pending' | 'cooking' | 'ready' | 'completed';

export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  status: DishStatus;
}

export interface Table {
  id: string;
  number: number;
  status: TableStatus;
  seats: number;
  currentOrderId?: string;
  position: { x: number; y: number }; // For map visualization
}

export interface OrderItem {
  dishId: string;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  tableId: string; // or 'takeaway'
  items: OrderItem[];
  status: OrderStatus;
  createdAt: Date;
  total: number;
  waiterName?: string;
  viewedByWaiter?: boolean;
}

export interface Reservation {
  id: string;
  name: string;
  date: Date;
  time: string;
  guests: number;
  phone: string;
  notes?: string;
}

interface RestaurantContextType {
  dishes: Dish[];
  tables: Table[];
  orders: Order[];
  reservations: Reservation[];

  // Actions
  toggleDishStatus: (id: string) => void;
  updateTableStatus: (id: string, status: TableStatus) => void;
  createOrder: (tableId: string, items: OrderItem[], waiterName?: string) => void;
  updateOrder: (orderId: string, items: OrderItem[]) => void;
  addItemsToOrder: (orderId: string, newItems: OrderItem[]) => void;
  completeOrder: (orderId: string) => void;
  markOrderAsViewed: (orderId: string) => void;
  addReservation: (reservation: Reservation) => void;
}

// --- Mock Data ---

const INITIAL_DISHES: Dish[] = [
  {
    id: '1',
    name: 'Lomo Saltado',
    description: 'Trozos de carne salteados con cebolla, tomate y papas fritas.',
    price: 45.00,
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80',
    category: 'Platos Fuertes',
    status: 'active',
  },
  {
    id: '2',
    name: 'Ceviche Clásico',
    description: 'Pescado fresco marinado en limón con cebolla y cilantro.',
    price: 38.00,
    image: 'https://images.unsplash.com/photo-1535914254981-b5012eebbd15?auto=format&fit=crop&q=80',
    category: 'Entradas',
    status: 'active',
  },
  {
    id: '3',
    name: 'Aji de Gallina',
    description: 'Pollo deshilachado en una crema de ají amarillo con papas.',
    price: 35.00,
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80',
    category: 'Platos Fuertes',
    status: 'active',
  },
  {
    id: '4',
    name: 'Pisco Sour',
    description: 'Cóctel clásico peruano a base de pisco y limón.',
    price: 25.00,
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80',
    category: 'Bebidas',
    status: 'active',
  },
  {
    id: '5',
    name: 'Suspiro a la Limeña',
    description: 'Postre tradicional de manjar blanco y merengue.',
    price: 18.00,
    image: 'https://images.unsplash.com/photo-1605090931399-163ac71a4218?auto=format&fit=crop&q=80',
    category: 'Postres',
    status: 'inactive',
  },
  {
    id: '6',
    name: 'Causa Limeña',
    description: 'Suave pastel de papa amarilla relleno de pollo, palta y mayonesa.',
    price: 22.00,
    image: 'https://images.unsplash.com/photo-1766456127047-806cdecdc139?auto=format&fit=crop&q=80',
    category: 'Entradas',
    status: 'active',
  },
  {
    id: '7',
    name: 'Papa a la Huancaína',
    description: 'Papas hervidas cubiertas con una salsa cremosa de queso y ají amarillo.',
    price: 20.00,
    image: 'https://images.unsplash.com/photo-1646304730898-4bb884b3e2da?auto=format&fit=crop&q=80',
    category: 'Entradas',
    status: 'active',
  },
  {
    id: '8',
    name: 'Anticuchos',
    description: 'Brochetas de corazón de res marinadas en especias y asadas a la parrilla.',
    price: 28.00,
    image: 'https://images.unsplash.com/photo-1761315414620-7f0f3ebdd866?auto=format&fit=crop&q=80',
    category: 'Entradas',
    status: 'active',
  },
  {
    id: '9',
    name: 'Pollo a la Brasa',
    description: 'Pollo asado al carbón acompañado de papas fritas y ensalada.',
    price: 55.00,
    image: 'https://images.unsplash.com/photo-1516684465974-78661ba8165d?auto=format&fit=crop&q=80',
    category: 'Platos Fuertes',
    status: 'active',
  },
  {
    id: '10',
    name: 'Tacu Tacu con Lomo',
    description: 'Mezcla de arroz y frijoles fritos servido con lomo saltado.',
    price: 48.00,
    image: 'https://images.unsplash.com/photo-1726514734441-dde9eabd9208?auto=format&fit=crop&q=80',
    category: 'Platos Fuertes',
    status: 'active',
  },
  {
    id: '11',
    name: 'Chicha Morada',
    description: 'Refrescante bebida de maíz morado con piña, canela y clavo.',
    price: 12.00,
    image: 'https://images.unsplash.com/photo-1706463267841-70aa1d625fdc?auto=format&fit=crop&q=80',
    category: 'Bebidas',
    status: 'active',
  },
  {
    id: '12',
    name: 'Inca Kola',
    description: 'La bebida del sabor nacional.',
    price: 8.00,
    image: 'https://images.unsplash.com/photo-1619517448766-3ca8bd5198af?auto=format&fit=crop&q=80',
    category: 'Bebidas',
    status: 'active',
  },
  {
    id: '13',
    name: 'Mazamorra Morada',
    description: 'Postre de maíz morado con frutas secas y especias.',
    price: 15.00,
    image: 'https://images.unsplash.com/photo-1708782340357-b7b38d653979?auto=format&fit=crop&q=80',
    category: 'Postres',
    status: 'active',
  },
  {
    id: '14',
    name: 'Picarones',
    description: 'Anillos de masa frita de zapallo y camote bañados en miel de chancaca.',
    price: 18.00,
    image: 'https://images.unsplash.com/photo-1709203813530-cdb59bd1411f?auto=format&fit=crop&q=80',
    category: 'Postres',
    status: 'active',
  },
];

const INITIAL_TABLES: Table[] = [
  { id: 't1', number: 1, status: 'free', seats: 4, position: { x: 0, y: 0 } },
  { id: 't2', number: 2, status: 'occupied', seats: 2, position: { x: 1, y: 0 } },
  { id: 't3', number: 3, status: 'waiting_food', seats: 4, position: { x: 0, y: 1 } },
  { id: 't4', number: 4, status: 'payment_pending', seats: 6, position: { x: 1, y: 1 } },
  { id: 't5', number: 5, status: 'free', seats: 2, position: { x: 2, y: 0 } },
  { id: 't6', number: 6, status: 'free', seats: 4, position: { x: 2, y: 1 } },
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'o1',
    tableId: 't2',
    items: [{ dishId: '1', quantity: 1 }, { dishId: '4', quantity: 2 }],
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
    total: 95.00,
    waiterName: 'Juan Pérez',
    viewedByWaiter: true,
  },
  {
    id: 'o2',
    tableId: 't3',
    items: [{ dishId: '2', quantity: 2 }],
    status: 'ready',
    createdAt: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
    total: 76.00,
    waiterName: 'María López',
    viewedByWaiter: false,
  },
];

const INITIAL_RESERVATIONS: Reservation[] = [
  {
    id: 'r1',
    name: 'Carlos Mendoza',
    date: new Date(),
    time: '19:00',
    guests: 4,
    phone: '999-888-777',
    notes: 'Mesa cerca de la ventana, cumpleaños',
  },
  {
    id: 'r2',
    name: 'Ana Torres',
    date: new Date(),
    time: '20:30',
    guests: 2,
    phone: '999-111-222',
    notes: 'Aniversario, ambiente romántico',
  },
  {
    id: 'r3',
    name: 'Roberto Silva',
    date: new Date(),
    time: '21:00',
    guests: 6,
    phone: '999-333-444',
    notes: 'Reunion de negocios',
  },
];

// --- Context ---

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const RestaurantProvider = ({ children }: { children: ReactNode }) => {
  const [dishes, setDishes] = useState<Dish[]>(INITIAL_DISHES);
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [reservations, setReservations] = useState<Reservation[]>(INITIAL_RESERVATIONS);

  const toggleDishStatus = (id: string) => {
    setDishes(prev => prev.map(d => d.id === id ? { ...d, status: d.status === 'active' ? 'inactive' : 'active' } : d));
  };

  const updateTableStatus = (id: string, status: TableStatus) => {
    setTables(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const createOrder = (tableId: string, items: OrderItem[], waiterName?: string) => {
    const total = items.reduce((acc, item) => {
      const dish = dishes.find(d => d.id === item.dishId);
      return acc + (dish ? dish.price * item.quantity : 0);
    }, 0);

    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9),
      tableId,
      items,
      status: 'pending',
      createdAt: new Date(),
      total,
      waiterName,
      viewedByWaiter: true,
    };

    setOrders(prev => [...prev, newOrder]);
    updateTableStatus(tableId, 'waiting_food');
  };

  const updateOrder = (orderId: string, items: OrderItem[]) => {
    const total = items.reduce((acc, item) => {
      const dish = dishes.find(d => d.id === item.dishId);
      return acc + (dish ? dish.price * item.quantity : 0);
    }, 0);

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, items, total } : o));
  };

  const addItemsToOrder = (orderId: string, newItems: OrderItem[]) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = [...order.items, ...newItems];
    const total = updatedItems.reduce((acc, item) => {
      const dish = dishes.find(d => d.id === item.dishId);
      return acc + (dish ? dish.price * item.quantity : 0);
    }, 0);

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, items: updatedItems, total } : o));
  };

  const completeOrder = (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'ready', viewedByWaiter: false } : o));
    // Optionally update table status if needed, logic depends on workflow
  };

  const markOrderAsViewed = (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, viewedByWaiter: true } : o));
  };

  const addReservation = (reservation: Reservation) => {
    setReservations(prev => [...prev, reservation]);
  };

  return (
    <RestaurantContext.Provider value={{
      dishes,
      tables,
      orders,
      reservations,
      toggleDishStatus,
      updateTableStatus,
      createOrder,
      updateOrder,
      addItemsToOrder,
      completeOrder,
      markOrderAsViewed,
      addReservation
    }}>
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) throw new Error('useRestaurant must be used within a RestaurantProvider');
  return context;
};
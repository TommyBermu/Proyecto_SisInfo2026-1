import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../../lib/supabase';

// --- Types ---

export type DishStatus = 'active' | 'inactive';
export type TableStatus = 'disponible' | 'ocupada' | 'pidiendo' | 'esperando' | 'limpiando';
export type OrderStatus = 'pending' | 'cooking' | 'ready' | 'completed';
export type PedidoEstadoDB = 'pendiente' | 'en_preparacion' | 'listo' | 'entregado' | 'cancelado';

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
  waiterName?: string;
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
  mesaId?: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: Date;
  horaPedido?: string;
  total: number;
  waiterName?: string;
  viewedByWaiter?: boolean;
  meseroId?: string;
}

export interface Reservation {
  id: string;
  name: string;
  email?: string;
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
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Lomo Saltado',
    description: 'Trozos de carne salteados con cebolla, tomate y papas fritas.',
    price: 45.00,
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80',
    category: 'Platos Fuertes',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Ceviche Clásico',
    description: 'Pescado fresco marinado en limón con cebolla y cilantro.',
    price: 38.00,
    image: 'https://images.unsplash.com/photo-1535914254981-b5012eebbd15?auto=format&fit=crop&q=80',
    category: 'Entradas',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Aji de Gallina',
    description: 'Pollo deshilachado en una crema de ají amarillo con papas.',
    price: 35.00,
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80',
    category: 'Platos Fuertes',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    name: 'Pisco Sour',
    description: 'Cóctel clásico peruano a base de pisco y limón.',
    price: 25.00,
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80',
    category: 'Bebidas',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    name: 'Suspiro a la Limeña',
    description: 'Postre tradicional de manjar blanco y merengue.',
    price: 18.00,
    image: 'https://images.unsplash.com/photo-1605090931399-163ac71a4218?auto=format&fit=crop&q=80',
    category: 'Postres',
    status: 'inactive',
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    name: 'Causa Limeña',
    description: 'Suave pastel de papa amarilla relleno de pollo, palta y mayonesa.',
    price: 22.00,
    image: 'https://images.unsplash.com/photo-1766456127047-806cdecdc139?auto=format&fit=crop&q=80',
    category: 'Entradas',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000007',
    name: 'Papa a la Huancaína',
    description: 'Papas hervidas cubiertas con una salsa cremosa de queso y ají amarillo.',
    price: 20.00,
    image: 'https://images.unsplash.com/photo-1646304730898-4bb884b3e2da?auto=format&fit=crop&q=80',
    category: 'Entradas',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000008',
    name: 'Anticuchos',
    description: 'Brochetas de corazón de res marinadas en especias y asadas a la parrilla.',
    price: 28.00,
    image: 'https://images.unsplash.com/photo-1761315414620-7f0f3ebdd866?auto=format&fit=crop&q=80',
    category: 'Entradas',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000009',
    name: 'Pollo a la Brasa',
    description: 'Pollo asado al carbón acompañado de papas fritas y ensalada.',
    price: 55.00,
    image: 'https://images.unsplash.com/photo-1516684465974-78661ba8165d?auto=format&fit=crop&q=80',
    category: 'Platos Fuertes',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000010',
    name: 'Tacu Tacu con Lomo',
    description: 'Mezcla de arroz y frijoles fritos servido con lomo saltado.',
    price: 48.00,
    image: 'https://images.unsplash.com/photo-1726514734441-dde9eabd9208?auto=format&fit=crop&q=80',
    category: 'Platos Fuertes',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000011',
    name: 'Chicha Morada',
    description: 'Refrescante bebida de maíz morado con piña, canela y clavo.',
    price: 12.00,
    image: 'https://images.unsplash.com/photo-1706463267841-70aa1d625fdc?auto=format&fit=crop&q=80',
    category: 'Bebidas',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000012',
    name: 'Inca Kola',
    description: 'La bebida del sabor nacional.',
    price: 8.00,
    image: 'https://images.unsplash.com/photo-1619517448766-3ca8bd5198af?auto=format&fit=crop&q=80',
    category: 'Bebidas',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000013',
    name: 'Mazamorra Morada',
    description: 'Postre de maíz morado con frutas secas y especias.',
    price: 15.00,
    image: 'https://images.unsplash.com/photo-1708782340357-b7b38d653979?auto=format&fit=crop&q=80',
    category: 'Postres',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000014',
    name: 'Picarones',
    description: 'Anillos de masa frita de zapallo y camote bañados en miel de chancaca.',
    price: 18.00,
    image: 'https://images.unsplash.com/photo-1709203813530-cdb59bd1411f?auto=format&fit=crop&q=80',
    category: 'Postres',
    status: 'active',
  },
];

// Orders are loaded from Supabase only - no stub data
const INITIAL_ORDERS: Order[] = [];

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

// --- Helper Functions ---

const mapDBStatusToFrontend = (status: PedidoEstadoDB): OrderStatus => {
  switch (status) {
    case 'pendiente':
      return 'pending';
    case 'en_preparacion':
      return 'cooking';
    case 'listo':
      return 'ready';
    case 'entregado':
      return 'completed';
    case 'cancelado':
      return 'pending';
    default:
      return 'pending';
  }
};

const mapFrontendStatusToDB = (status: OrderStatus): PedidoEstadoDB => {
  switch (status) {
    case 'pending':
      return 'pendiente';
    case 'cooking':
      return 'en_preparacion';
    case 'ready':
      return 'listo';
    case 'completed':
      return 'entregado';
    default:
      return 'pendiente';
  }
};

export const RestaurantProvider = ({ children }: { children: ReactNode }) => {
  const [dishes, setDishes] = useState<Dish[]>(INITIAL_DISHES);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const mapMesaToTable = (mesa: any, index: number): Table => ({
    id: mesa.id,
    number: Number(mesa.numero),
    status: mesa.estado || 'disponible',
    seats: mesa.capacidad,
    waiterName: mesa.waiter_name ?? mesa.full_name ?? undefined,
    position: { x: index % 4, y: Math.floor(index / 4) },
  });

  const enrichTablesWithOrders = (mesaTables: Table[], activeOrders: Order[]) => {
    const activeOrderByTableId = new Map(
      activeOrders
        .filter(order => order.status !== 'completed')
        .map(order => [order.mesaId || order.tableId, order])
    );

    return mesaTables.map((table): Table => {
      const activeOrder = activeOrderByTableId.get(table.id);
      if (!activeOrder) {
        return {
          ...table,
          currentOrderId: undefined,
          waiterName: undefined,
          status: table.status === 'esperando' || table.status === 'limpiando' || table.status === 'pidiendo' || table.status === 'ocupada'
            ? table.status
            : 'disponible',
        };
      }

      const status: TableStatus = activeOrder.status === 'ready' ? 'esperando' : 'ocupada';

      return {
        ...table,
        currentOrderId: activeOrder.id,
        waiterName: activeOrder.waiterName,
        status,
      };
    });
  };

  const resolveMesaId = (tableId: string) => {
    const byId = tables.find(table => table.id === tableId);
    if (byId) return byId.id;

    const numericId = Number(String(tableId).replace(/^t/i, ''));
    if (!Number.isNaN(numericId)) {
      const byNumber = tables.find(table => table.number === numericId);
      if (byNumber) return byNumber.id;
    }

    return tableId;
  };

  // Fetch orders and their details from Supabase
  const fetchOrders = async () => {
    try {
      // Fetch all pedidos that are not served (para mostrar en cocina)
      const { data: pedidos, error: pedidosError } = await supabase
        .from('pedido')
        .select('*')
        .in('estado_preparacion', ['pendiente', 'en_preparacion', 'listo'])
        .order('created_at', { ascending: true });

      if (pedidosError) throw pedidosError;

      if (pedidos && pedidos.length > 0) {
        // Fetch details for each order
        const ordersWithDetails: Order[] = [];
        const meseroIds = Array.from(new Set(pedidos.map((pedido: any) => pedido.mesero_id).filter(Boolean)));
        const meserosById = new Map<string, string>();

        if (meseroIds.length > 0) {
          const { data: meseros } = await supabase
            .from('empleado')
            .select('id, nombre, apellido, full_name, email')
            .in('id', meseroIds);

          (meseros || []).forEach((mesero: any) => {
            const displayName = mesero.full_name || [mesero.nombre, mesero.apellido].filter(Boolean).join(' ').trim() || mesero.email || 'Mesero';
            meserosById.set(mesero.id, displayName);
          });
        }

        for (const pedido of pedidos) {
          const { data: detalles, error: detallesError } = await supabase
            .from('detalle_pedido')
            .select('*, plato(id, nombre, valor_actual)')
            .eq('pedido_id', pedido.id);

          if (detallesError) throw detallesError;

          const items: OrderItem[] = (detalles || []).map((d: any) => ({
            dishId: d.plato_id,
            quantity: d.cantidad,
            notes: d.anotacion,
          }));

          const total = items.reduce((acc, item) => {
            const detail = detalles?.find((d: any) => d.plato_id === item.dishId);
            return acc + (detail ? detail.precio_unitario * item.quantity : 0);
          }, 0);

          ordersWithDetails.push({
            id: pedido.id,
            tableId: pedido.mesa_id || 'takeaway',
            mesaId: pedido.mesa_id || undefined,
            items,
            status: mapDBStatusToFrontend(pedido.estado_preparacion),
            createdAt: new Date(pedido.created_at),
            horaPedido: pedido.hora_pedido || undefined,
            total,
            waiterName: meserosById.get(pedido.mesero_id) || 'Mesero',
            viewedByWaiter: true,
            meseroId: pedido.mesero_id,
          });
        }

        setOrders(ordersWithDetails);
        setTables(prevTables => enrichTablesWithOrders(prevTables, ordersWithDetails));
      } else {
        // No orders found - set empty array
        setOrders([]);
        setTables(prevTables => enrichTablesWithOrders(prevTables, []));
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      // On error, clear orders to ensure DB is source of truth
      setOrders([]);
    }
  };

  const fetchTables = async () => {
    try {
      const { data, error } = await supabase
        .from('mesa')
        .select('*')
        .order('numero', { ascending: true });

      if (error) throw error;

      if (data) {
        const baseTables = data.map((mesa: any, index: number) => mapMesaToTable(mesa, index));
        setTables(enrichTablesWithOrders(baseTables, orders));
      } else {
        setTables([]);
      }
    } catch (err) {
      console.error('Error fetching tables:', err);
      setTables([]);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchReservations();
    fetchTables();

    // Set up realtime subscriptions
    const reservasChannel = supabase
      .channel('public:reserva')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reserva' }, () => {
        fetchReservations();
      })
      .subscribe();

    const pedidosChannel = supabase
      .channel('public:pedido')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido' }, () => {
        fetchOrders();
      })
      .subscribe();

    const detallesChannel = supabase
      .channel('public:detalle_pedido')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'detalle_pedido' }, () => {
        fetchOrders();
      })
      .subscribe();

    const mesasChannel = supabase
      .channel('public:mesa')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesa' }, () => {
        fetchTables();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(reservasChannel);
      supabase.removeChannel(pedidosChannel);
      supabase.removeChannel(detallesChannel);
      supabase.removeChannel(mesasChannel);
    };
  }, []);

  const fetchReservations = async () => {
    try {
      const { data, error } = await supabase
        .from('reserva')
        .select('*');
        
      if (error) throw error;
      
      if (data) {
        const mappedReservations: Reservation[] = data.map((r: any) => ({
          id: r.id,
          name: r.nombre || 'Sin nombre',
          date: new Date(r.fecha + 'T00:00:00'),
          time: r.hora,
          guests: r.num_personas,
          phone: r.telefono || '',
          notes: r.anotaciones,
        }));
        setReservations(mappedReservations);
      }
    } catch (err) {
      console.error("Error fetching reservations:", err);
    }
  };

  const toggleDishStatus = (id: string) => {
    setDishes(prev => prev.map(d => d.id === id ? { ...d, status: d.status === 'active' ? 'inactive' : 'active' } : d));
  };

  const updateTableStatus = (id: string, status: TableStatus) => {
    setTables(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    supabase
      .from('mesa')
      .update({ estado: status })
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error('Error updating mesa status:', error);
      });
  };

  const createOrder = async (tableId: string, items: OrderItem[], waiterName?: string) => {
    try {
      const waiterEmail = waiterName?.includes('@') ? waiterName : 'mesero@trilogia.com';
      const { data: empleado, error: empleadoError } = await supabase
        .from('empleado')
        .select('id, nombre, apellido, email, rol')
        .eq('email', waiterEmail)
        .eq('rol', 'mesero')
        .single();

      if (empleadoError || !empleado) {
        throw new Error(`No empleado mesero found for email ${waiterEmail}`);
      }

      const meseroId = empleado.id;

      const mesaId = resolveMesaId(tableId);
      const horaPedido = new Date().toTimeString().slice(0, 8);

      // Create the pedido
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedido')
        .insert([
          {
            fecha: new Date().toISOString().split('T')[0],
            mesa_id: mesaId,
            mesero_id: meseroId,
            estado_preparacion: 'pendiente',
            hora_pedido: horaPedido,
            prioridad: 0,
          },
        ])
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      if (pedido) {
        // Create detalle_pedido for each item
        const detalles = items.map((item) => {
          const dish = dishes.find(d => d.id === item.dishId);
          return {
            pedido_id: pedido.id,
            plato_id: item.dishId,
            precio_unitario: dish?.price || 0,
            cantidad: item.quantity,
            anotacion: item.notes || null,
            estado: 'pendiente',
          };
        });

        const { error: detallesError } = await supabase
          .from('detalle_pedido')
          .insert(detalles);

        if (detallesError) throw detallesError;

        await updateTableStatus(mesaId, 'esperando');

        // Refetch to get the updated list from Supabase
        await fetchOrders();
      }
    } catch (err) {
      console.error('Error creating order:', err);
      // On error, refetch from DB to ensure we only show what's actually saved
      await fetchOrders();
      throw err; // Re-throw so the caller knows it failed
    }
  };

  const updateOrder = async (orderId: string, items: OrderItem[]) => {
    try {
      // Delete existing detalle_pedido
      await supabase.from('detalle_pedido').delete().eq('pedido_id', orderId);

      // Get the pedido to access mesa_id and other info
      const { data: pedido } = await supabase
        .from('pedido')
        .select('*')
        .eq('id', orderId)
        .single();

      if (!pedido) return;

      // Create new detalle_pedido
      const detalles = items.map((item) => {
        const dish = dishes.find(d => d.id === item.dishId);
        return {
          pedido_id: orderId,
          plato_id: item.dishId,
          precio_unitario: dish?.price || 0,
          cantidad: item.quantity,
          anotacion: item.notes || null,
          estado: 'pendiente',
        };
      });

      const { error } = await supabase.from('detalle_pedido').insert(detalles);

      if (error) throw error;

      await fetchOrders();
    } catch (err) {
      console.error('Error updating order:', err);
    }
  };

  const addItemsToOrder = async (orderId: string, newItems: OrderItem[]) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const detalles = newItems.map((item) => {
        const dish = dishes.find(d => d.id === item.dishId);
        return {
          pedido_id: orderId,
          plato_id: item.dishId,
          precio_unitario: dish?.price || 0,
          cantidad: item.quantity,
          anotacion: item.notes || null,
          estado: 'pendiente',
        };
      });

      const { error } = await supabase.from('detalle_pedido').insert(detalles);

      if (error) throw error;

      await fetchOrders();
    } catch (err) {
      console.error('Error adding items to order:', err);
    }
  };

  const completeOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('pedido')
        .update({ estado_preparacion: 'listo' })
        .eq('id', orderId);

      if (error) throw error;

      // Also update all detalle_pedido items to ready
      await supabase
        .from('detalle_pedido')
        .update({ estado: 'listo' })
        .eq('pedido_id', orderId);

      const order = orders.find(o => o.id === orderId);
      if (order?.mesaId) {
        await updateTableStatus(order.mesaId, 'limpiando');
      }

      await fetchOrders();
    } catch (err) {
      console.error('Error completing order:', err);
      // Fallback to local update
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'ready', viewedByWaiter: false } : o));
    }
  };

  const markOrderAsViewed = (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, viewedByWaiter: true } : o));
  };

  const addReservation = async (reservation: Reservation) => {
    // Optimistic update
    setReservations(prev => [...prev, reservation]);
    
    try {
      const { error } = await supabase.from('reserva').insert([{
        nombre: reservation.name,
        email: reservation.email,
        telefono: reservation.phone,
        fecha: reservation.date.toISOString().split('T')[0],
        hora: reservation.time,
        num_personas: reservation.guests,
        anotaciones: reservation.notes,
        estado: 'confirmada'
      }]);
      
      if (error) throw error;
    } catch (err) {
      console.error("Error creating reservation in Supabase:", err);
      // Opcional: revertir en caso de error
    }
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
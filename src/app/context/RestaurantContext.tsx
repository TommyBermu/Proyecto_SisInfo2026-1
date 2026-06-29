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
  stockLabel?: string;
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
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const fetchDishes = async () => {
    try {
      const [{ data: categories, error: categoriesError }, { data, error }] = await Promise.all([
        supabase.from('categoria').select('id, nombre'),
        supabase.from('plato').select('id, nombre, descripcion, valor_actual, foto_url, estado, categoria_id').order('nombre', { ascending: true }),
      ]);

      if (categoriesError) throw categoriesError;
      if (error) throw error;

      const categoryById = new Map((categories || []).map((category: any) => [category.id, category.nombre]));

      setDishes((data || []).map((plato: any) => ({
        id: plato.id,
        name: plato.nombre,
        description: plato.descripcion || '',
        price: Number(plato.valor_actual),
        image: plato.foto_url || '',
        category: categoryById.get(plato.categoria_id) || 'General',
        status: plato.estado === 'inactive' ? 'inactive' : 'active',
        stockLabel: plato.estado === 'inactive' ? 'Agotado' : 'Disponible',
      })));
    } catch (err) {
      console.error('Error fetching dishes:', err);
      setDishes([]);
    }
  };

  const mapMesaToTable = (mesa: any, index: number): Table => ({
    id: mesa.id,
    number: Number(mesa.numero),
    status: mesa.estado || 'disponible',
    seats: mesa.capacidad,
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
            .select('id, nombre, apellido, email')
            .in('id', meseroIds);

          (meseros || []).forEach((mesero: any) => {
            const displayName = [mesero.nombre, mesero.apellido].filter(Boolean).join(' ').trim() || mesero.email || 'Mesero';
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
            return acc + (detail ? Number(detail.precio_unitario) * item.quantity : 0);
          }, 0);

          // Preserve viewedByWaiter from local state when available so waiter clicks persist across refetches
          const existing = orders.find((o) => o.id === pedido.id);
          const viewedDefault = pedido.estado_preparacion === 'listo' ? false : true;
          const viewedFlag = existing?.viewedByWaiter ?? viewedDefault;

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
            viewedByWaiter: viewedFlag,
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
    fetchDishes();
    fetchOrders();
    fetchReservations();
    fetchTables();

    // Set up realtime subscriptions
    const platosChannel = supabase
      .channel('public:plato')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plato' }, () => {
        fetchDishes();
      })
      .subscribe();

    const reservasChannel = supabase
      .channel('public:reserva')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reserva' }, (payload) => {
        console.debug('Supabase reserva change:', payload);
        fetchReservations();
      })
      .subscribe();

    const pedidosChannel = supabase
      .channel('public:pedido')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido' }, (payload) => {
        console.debug('Supabase pedido change:', payload);
        fetchOrders();
      })
      .subscribe();

    const detallesChannel = supabase
      .channel('public:detalle_pedido')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'detalle_pedido' }, (payload) => {
        console.debug('Supabase detalle_pedido change:', payload);
        fetchOrders();
      })
      .subscribe();

    const mesasChannel = supabase
      .channel('public:mesa')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesa' }, (payload) => {
        console.debug('Supabase mesa change:', payload);
        fetchTables();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(platosChannel);
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
          guests: Number(r.num_personas),
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
    const currentDish = dishes.find(dish => dish.id === id);
    const nextStatus = currentDish?.status === 'active' ? 'inactive' : 'active';

    setDishes(prev => prev.map(d => d.id === id ? { ...d, status: nextStatus, stockLabel: nextStatus === 'inactive' ? 'Agotado' : 'Disponible' } : d));
    supabase
      .from('plato')
      .update({ estado: nextStatus })
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.error('Error updating plato stock:', error);
      });
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
      // Determine waiter / mesero id if we received an email; otherwise proceed without failing
      let meseroId: string | undefined = undefined;
      let waiterDisplayName = waiterName || 'Mesero';

      if (waiterName && waiterName.includes('@')) {
        const waiterEmail = waiterName;
        const { data: empleado, error: empleadoError } = await supabase
          .from('empleado')
          .select('id, nombre, apellido, email, rol')
          .eq('email', waiterEmail)
          .eq('rol', 'mesero')
          .single();

        if (!empleado || empleadoError) {
          console.warn('No empleado mesero found for email', waiterEmail, empleadoError);
          // fallback: keep meseroId undefined and use provided waiterName as display
        } else {
          meseroId = empleado.id;
          waiterDisplayName = [empleado.nombre, empleado.apellido].filter(Boolean).join(' ').trim() || empleado.email || waiterDisplayName;
        }
      }

      const mesaId = resolveMesaId(tableId);
      const horaPedido = new Date().toTimeString().slice(0, 8);

      // Create the pedido
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedido')
        .insert([
          {
            fecha: new Date().toISOString().split('T')[0],
            mesa_id: mesaId,
            mesero_id: meseroId ?? null,
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
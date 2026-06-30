import React, { useState, useEffect } from 'react';
import { useRestaurant, Order, OrderItem, Reservation } from '../context/RestaurantContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import {
  Plus, Minus, X, Search, Clock, Users, Calendar,
  StickyNote, ShoppingCart, ClipboardList, Trash2, MessageSquare,
  ChevronLeft, ChevronRight, Menu
} from 'lucide-react';

type TabType = 'new-order' | 'tables' | 'reservations';

export default function WaiterView() {
  const { orders, dishes, tables, reservations, createOrder, updateOrder, markOrderAsViewed, addItemsToOrder } = useRestaurant();
  const [activeTab, setActiveTab] = useState<TabType>('new-order');
  const [selectedTableForView, setSelectedTableForView] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);

  // Contar pedidos completados no vistos
  const unviewedCompletedCount = orders.filter(o => o.status === 'ready' && !o.viewedByWaiter).length;

  // No marcar todos por defecto; marcamos solamente la mesa que el mesero selecciona.

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedTableForView(null);
  };

  const handleSelectTable = (id: string | null) => {
    setSelectedTableForView(id);
    if (id) {
      // Find the order for this table and mark it as viewed
      const order = orders.find(o => o.tableId === id && o.status === 'ready');
      if (order && !order.viewedByWaiter) {
        void markOrderAsViewed(order.id);
      }
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-neutral-50 overflow-hidden">
      <aside className={clsx(
        "bg-white border-r border-neutral-200 flex flex-col shadow-sm transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64"
      )}>
        <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
          {!sidebarCollapsed && (
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Panel Mesero</h2>
              <p className="text-sm text-neutral-500 mt-1">Gestión de servicio</p>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <SidebarButton
            icon={<Plus size={20} />}
            label="Pedido"
            active={activeTab === 'new-order'}
            onClick={() => handleTabChange('new-order')}
            collapsed={sidebarCollapsed}
          />
          <SidebarButton
            icon={<ClipboardList size={20} />}
            label="Mesas"
            badge={unviewedCompletedCount}
            active={activeTab === 'tables'}
            onClick={() => handleTabChange('tables')}
            collapsed={sidebarCollapsed}
          />
          <SidebarButton
            icon={<Calendar size={20} />}
            label="Reservas"
            active={activeTab === 'reservations'}
            onClick={() => handleTabChange('reservations')}
            collapsed={sidebarCollapsed}
          />
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'new-order' && <NewOrderView />}
        {activeTab === 'tables' && (
          <TablesView
            selectedTableId={selectedTableForView}
            onSelectTable={handleSelectTable}
          />
        )}
        {activeTab === 'reservations' && <ReservationsView />}
      </div>
    </div>
  );
}

function SidebarButton({
  icon,
  label,
  badge,
  active,
  onClick,
  collapsed
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium relative",
        active
          ? "bg-neutral-900 text-white shadow-md"
          : "text-neutral-600 hover:bg-neutral-100"
      )}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
      {badge !== undefined && badge > 0 && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

// ============= NEW ORDER VIEW =============
function NewOrderView() {
  const { createOrder, dishes, tables } = useRestaurant();
  const { profile } = useAuth();
  const [selectedTable, setSelectedTable] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [noteModalItem, setNoteModalItem] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');

  useEffect(() => {
    const availableTables = tables.filter(table => table.status === 'disponible');
    if (!selectedTable && availableTables.length > 0) {
      setSelectedTable(availableTables[0].id);
    }
    if (selectedTable && !availableTables.some(table => table.id === selectedTable)) {
      setSelectedTable(availableTables[0]?.id || '');
    }
  }, [tables, selectedTable]);

  const occupiedTableIds = new Set(
    tables
      .filter(table => table.status !== 'disponible')
      .map(table => table.id)
  );

  const currentDate = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const filteredDishes = dishes.filter(d =>
    d.status === 'active' && d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (dishId: string) => {
    const existing = cartItems.find(item => item.dishId === dishId);
    if (existing) {
      setCartItems(prev => prev.map(item =>
        item.dishId === dishId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCartItems(prev => [...prev, { dishId, quantity: 1 }]);
    }
  };

  const updateQuantity = (dishId: string, delta: number) => {
    setCartItems(prev => prev.map(item =>
      item.dishId === dishId
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    ).filter(item => item.quantity > 0));
  };

  const removeItem = (dishId: string) => {
    setCartItems(prev => prev.filter(item => item.dishId !== dishId));
  };

  const openNoteModal = (dishId: string) => {
    const item = cartItems.find(i => i.dishId === dishId);
    setTempNote(item?.notes || '');
    setNoteModalItem(dishId);
  };

  const saveNote = () => {
    if (noteModalItem) {
      setCartItems(prev => prev.map(item =>
        item.dishId === noteModalItem
          ? { ...item, notes: tempNote }
          : item
      ));
    }
    setNoteModalItem(null);
    setTempNote('');
  };

  const calculateTotal = () => {
    return cartItems.reduce((acc, item) => {
      const dish = dishes.find(d => d.id === item.dishId);
      return acc + (dish ? dish.price * item.quantity : 0);
    }, 0);
  };

  const handleSubmitOrder = async () => {
    if (cartItems.length === 0) {
      alert('Agrega al menos un item al pedido');
      return;
    }

    if (!selectedTable) {
      alert('Selecciona una mesa');
      return;
    }

    try {
      await createOrder(selectedTable, cartItems, profile?.email || 'mesero@trilogia.com');

      // Reset form
      setCartItems([]);
      setSelectedTable(tables.find(table => table.status === 'disponible')?.id || '');
      alert('Pedido creado exitosamente');
    } catch (error) {
      console.error('Error sending order:', error);
      const message = (error && (error as any).message) ? (error as any).message : String(error);
      alert('No se pudo guardar el pedido en Supabase: ' + message);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="mb-6 bg-white rounded-lg p-4 shadow-sm border border-neutral-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <ShoppingCart className="text-neutral-700" size={24} />
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Nuevo Pedido</h2>
              <p className="text-sm text-neutral-500 capitalize">{currentDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-2 items-end">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Mesa activa</span>
              <div className="flex flex-wrap gap-2 max-w-xl justify-end">
                {tables.map(table => {
                  const isAvailable = table.status === 'disponible';
                  const isSelected = selectedTable === table.id;
                  return (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => isAvailable && setSelectedTable(table.id)}
                      disabled={!isAvailable}
                      className={clsx(
                        "min-w-[92px] px-3 py-2 rounded-lg border text-left transition-all",
                        isSelected
                          ? "bg-neutral-900 text-white border-neutral-900 shadow-md"
                          : isAvailable
                            ? "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-900"
                            : "bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed"
                      )}
                    >
                      <div className="text-sm font-bold">Mesa {table.number}</div>
                      <div className="text-[11px] uppercase tracking-wide">
                        {isAvailable ? 'Disponible' : table.status.replace('_', ' ')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        {selectedTable && occupiedTableIds.has(selectedTable) && (
          <div className="mt-3 px-4 py-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
            Esta mesa ya tiene un pedido abierto. Selecciona otra mesa disponible.
          </div>
        )}
      </div>

      {/* Main Panel */}
      <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
        {/* Left: Menu Search */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
              <input
                type="text"
                placeholder="Buscar platillo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredDishes.map(dish => (
              <motion.div
                key={dish.id}
                whileHover={{ scale: 1.01 }}
                className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <img src={dish.image} alt={dish.name} className="w-16 h-16 rounded-lg object-cover" />
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-900">{dish.name}</h3>
                  <p className="text-sm text-neutral-500">S/ {dish.price.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => addToCart(dish.id)}
                  className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  Agregar
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="font-bold text-lg text-neutral-900">Items del Pedido</h3>
            <p className="text-sm text-neutral-500">{cartItems.length} items agregados</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-400">
                <ShoppingCart size={48} className="mb-3 opacity-20" />
                <p>No hay items en el pedido</p>
              </div>
            ) : (
              cartItems.map(item => {
                const dish = dishes.find(d => d.id === item.dishId);
                if (!dish) return null;
                return (
                  <div key={item.dishId} className="bg-neutral-50 rounded-lg p-3 border border-neutral-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-neutral-900">{dish.name}</h4>
                      </div>
                      <button
                        onClick={() => removeItem(item.dishId)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-white border border-neutral-300 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.dishId, -1)}
                          className="p-2 hover:bg-neutral-100 rounded-l-lg"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="font-bold w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.dishId, 1)}
                          className="p-2 hover:bg-neutral-100 rounded-r-lg"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      <button
                        onClick={() => openNoteModal(item.dishId)}
                        className={clsx(
                          "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors",
                          item.notes
                            ? "bg-yellow-50 border-yellow-300 text-yellow-700"
                            : "bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                        )}
                      >
                        <MessageSquare size={16} />
                        {item.notes ? 'Editar nota' : 'Agregar nota'}
                      </button>
                    </div>

                    {item.notes && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 italic">
                        "{item.notes}"
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-neutral-200 bg-neutral-50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-bold text-neutral-900">Total</span>
              <span className="text-2xl font-bold text-neutral-900">S/ {calculateTotal().toFixed(2)}</span>
            </div>
            <button
              onClick={handleSubmitOrder}
              disabled={cartItems.length === 0}
              className="w-full bg-neutral-900 text-white py-3 rounded-lg font-bold hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
            >
              Enviar Pedido
            </button>
          </div>
        </div>
      </div>

      {/* Note Modal */}
      <AnimatePresence>
        {noteModalItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold text-neutral-900 mb-4">Nota para Cocina</h3>
              <textarea
                value={tempNote}
                onChange={(e) => setTempNote(e.target.value)}
                placeholder="Ej: Sin cebolla, extra picante..."
                className="w-full border border-neutral-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-neutral-900 mb-4"
                rows={4}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setNoteModalItem(null)}
                  className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveNote}
                  className="flex-1 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
                >
                  Guardar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============= TABLES VIEW =============
function TablesView({
  selectedTableId,
  onSelectTable
}: {
  selectedTableId: string | null;
  onSelectTable: (id: string | null) => void;
}) {
  const { orders, dishes, tables, addItemsToOrder } = useRestaurant();
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);

  // Filtrar mesas que tienen pedidos
  const tablesWithOrders = orders
    .filter(o => o.status !== 'completed')
    .map(order => {
      const table = tables.find(t => t.id === order.tableId);
      return { order, table };
    })
    .filter(({ table }) => table !== undefined);

  const selectedOrder = selectedTableId
    ? orders.find(o => o.tableId === selectedTableId && o.status !== 'completed')
    : null;

  const handleAddItems = (newItems: OrderItem[]) => {
    if (selectedOrder && newItems.length > 0) {
      addItemsToOrder(selectedOrder.id, newItems);
      setShowAddItemsModal(false);
      alert('Productos añadidos exitosamente al pedido');
    }
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Tables List */}
      <div className="w-96 bg-white border-r border-neutral-200 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-neutral-200">
          <h2 className="text-xl font-bold text-neutral-900">Mesas Activas</h2>
          <p className="text-sm text-neutral-500 mt-1">{tablesWithOrders.length} mesas con pedidos</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tablesWithOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400">
              <ClipboardList size={48} className="mb-3 opacity-20" />
              <p>No hay mesas con pedidos activos</p>
            </div>
          ) : (
            tablesWithOrders.map(({ order, table }) => {
              const isReady = order.status === 'ready';
              const isSelected = selectedTableId === order.tableId;
              const showBadge = isReady && !order.viewedByWaiter;

              return (
                <motion.button
                  key={order.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => onSelectTable(order.tableId)}
                  className={clsx(
                    "w-full p-4 rounded-lg border-2 transition-all text-left relative",
                    isSelected && "ring-2 ring-neutral-900",
                    isReady
                      ? "bg-green-50 border-green-300 hover:border-green-400"
                      : "bg-white border-neutral-200 hover:border-neutral-300"
                  )}
                >
                  {showBadge && (
                    <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  )}

                  <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-neutral-900">Mesa {table?.number}</h3>
                    <span className={clsx(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      isReady
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    )}>
                      {isReady ? 'Lista' : 'En cocina'}
                    </span>
                  </div>

                      {order.waiterName && (
                        <div className="mb-2 text-xs text-neutral-500">
                          Mesero: <span className="font-medium text-neutral-700">{order.waiterName}</span>
                        </div>
                      )}

                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    <Clock size={14} />
                    <span>{new Date(order.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="mt-2 text-sm text-neutral-600">
                    {order.items.length} items · S/ {order.total.toFixed(2)}
                  </div>
                </motion.button>
              );
            })
          )}
        </div>
      </div>

      {/* Order Details Panel */}
      <AnimatePresence mode="wait">
        {selectedOrder ? (
          <motion.div
            key={selectedTableId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 bg-neutral-50 p-6 overflow-y-auto"
          >
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900">
                    Mesa {tables.find(t => t.id === selectedOrder.tableId)?.number}
                  </h2>
                  <p className="text-neutral-600">Pedido #{selectedOrder.id.substring(0, 8)}</p>
                </div>
                <button
                  onClick={() => onSelectTable(null)}
                  className="p-2 hover:bg-neutral-200 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
                <h3 className="font-bold text-lg text-neutral-900 mb-4">Detalles del Pedido</h3>

                <div className="space-y-3">
                  {selectedOrder.items.map((item, idx) => {
                    const dish = dishes.find(d => d.id === item.dishId);
                    if (!dish) return null;
                    return (
                      <div key={idx} className="flex justify-between items-start pb-3 border-b border-neutral-200 last:border-0">
                        <div className="flex gap-3">
                          <div>
                            <p className="font-medium text-neutral-900">{dish.name}</p>
                            {item.notes && (
                              <p className="text-xs text-neutral-500 italic mt-1">"{item.notes}"</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-4 mt-4 border-t-2 border-neutral-300">
                  <span className="font-bold text-lg text-neutral-900">Total</span>
                  <span className="font-bold text-xl text-neutral-900">S/ {selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => setShowAddItemsModal(true)}
                className="w-full bg-neutral-900 text-white py-3 rounded-lg font-bold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Añadir Productos al Pedido
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-400">
            <div className="text-center">
              <ClipboardList size={64} className="mx-auto mb-4 opacity-20" />
              <p>Selecciona una mesa para ver los detalles</p>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Items Modal */}
      {showAddItemsModal && selectedOrder && (
        <AddItemsModal
          onClose={() => setShowAddItemsModal(false)}
          onConfirm={handleAddItems}
        />
      )}
    </div>
  );
}

// ============= ADD ITEMS MODAL =============
function AddItemsModal({
  onClose,
  onConfirm
}: {
  onClose: () => void;
  onConfirm: (items: OrderItem[]) => void;
}) {
  const { dishes } = useRestaurant();
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [noteModalItem, setNoteModalItem] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');

  const filteredDishes = dishes.filter(d =>
    d.status === 'active' && d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (dishId: string) => {
    const existing = cartItems.find(item => item.dishId === dishId);
    if (existing) {
      setCartItems(prev => prev.map(item =>
        item.dishId === dishId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCartItems(prev => [...prev, { dishId, quantity: 1 }]);
    }
  };

  const updateQuantity = (dishId: string, delta: number) => {
    setCartItems(prev => prev.map(item =>
      item.dishId === dishId
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    ).filter(item => item.quantity > 0));
  };

  const removeItem = (dishId: string) => {
    setCartItems(prev => prev.filter(item => item.dishId !== dishId));
  };

  const openNoteModal = (dishId: string) => {
    const item = cartItems.find(i => i.dishId === dishId);
    setTempNote(item?.notes || '');
    setNoteModalItem(dishId);
  };

  const saveNote = () => {
    if (noteModalItem) {
      setCartItems(prev => prev.map(item =>
        item.dishId === noteModalItem
          ? { ...item, notes: tempNote }
          : item
      ));
    }
    setNoteModalItem(null);
    setTempNote('');
  };

  const calculateTotal = () => {
    return cartItems.reduce((acc, item) => {
      const dish = dishes.find(d => d.id === item.dishId);
      return acc + (dish ? dish.price * item.quantity : 0);
    }, 0);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-neutral-900">Añadir Productos al Pedido</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 grid grid-cols-2 gap-6 p-6 overflow-hidden">
          {/* Left: Menu Search */}
          <div className="bg-neutral-50 rounded-lg border border-neutral-200 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-neutral-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar platillo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredDishes.map(dish => (
                <motion.div
                  key={dish.id}
                  whileHover={{ scale: 1.01 }}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  <img src={dish.image} alt={dish.name} className="w-12 h-12 rounded-lg object-cover" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900 text-sm">{dish.name}</h3>
                    <p className="text-xs text-neutral-500">S/ {dish.price.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => addToCart(dish.id)}
                    className="px-3 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-2 text-sm"
                  >
                    <Plus size={14} />
                    Agregar
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right: Cart */}
          <div className="bg-neutral-50 rounded-lg border border-neutral-200 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-neutral-200">
              <h3 className="font-bold text-lg text-neutral-900">Nuevos Productos</h3>
              <p className="text-sm text-neutral-500">{cartItems.length} items agregados</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-400">
                  <ShoppingCart size={48} className="mb-3 opacity-20" />
                  <p>No hay items seleccionados</p>
                </div>
              ) : (
                cartItems.map(item => {
                  const dish = dishes.find(d => d.id === item.dishId);
                  if (!dish) return null;
                  return (
                    <div key={item.dishId} className="bg-white rounded-lg p-3 border border-neutral-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-neutral-900 text-sm">{dish.name}</h4>
                          <p className="text-xs text-neutral-500">S/ {dish.price.toFixed(2)} c/u</p>
                        </div>
                        <button
                          onClick={() => removeItem(item.dishId)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-300 rounded-lg">
                          <button
                            onClick={() => updateQuantity(item.dishId, -1)}
                            className="p-2 hover:bg-neutral-100 rounded-l-lg"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="font-bold w-8 text-center text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.dishId, 1)}
                            className="p-2 hover:bg-neutral-100 rounded-r-lg"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <button
                          onClick={() => openNoteModal(item.dishId)}
                          className={clsx(
                            "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm",
                            item.notes
                              ? "bg-yellow-50 border-yellow-300 text-yellow-700"
                              : "bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                          )}
                        >
                          <MessageSquare size={14} />
                          {item.notes ? 'Editar nota' : 'Nota'}
                        </button>
                      </div>

                      {item.notes && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 italic">
                          "{item.notes}"
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-neutral-200 bg-white">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-bold text-neutral-900">Total Adicional</span>
                <span className="text-2xl font-bold text-neutral-900">S/ {calculateTotal().toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-neutral-300 rounded-lg hover:bg-neutral-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => onConfirm(cartItems)}
                  disabled={cartItems.length === 0}
                  className="flex-1 px-4 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed font-bold"
                >
                  Confirmar Pedido
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Note Modal */}
        <AnimatePresence>
          {noteModalItem && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl"
              >
                <h3 className="text-xl font-bold text-neutral-900 mb-4">Nota para Cocina</h3>
                <textarea
                  value={tempNote}
                  onChange={(e) => setTempNote(e.target.value)}
                  placeholder="Ej: Sin cebolla, extra picante..."
                  className="w-full border border-neutral-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-neutral-900 mb-4"
                  rows={4}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setNoteModalItem(null)}
                    className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveNote}
                    className="flex-1 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
                  >
                    Guardar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ============= RESERVATIONS VIEW =============
function ReservationsView() {
  const { reservations } = useRestaurant();
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // Ordenar reservas por fecha y hora (más recientes/próximas primero)
  const sortedReservations = [...reservations].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.time.localeCompare(b.time);
  });

  return (
    <div className="h-full flex overflow-hidden">
      {/* Reservations List */}
      <div className="w-96 bg-white border-r border-neutral-200 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-neutral-200">
          <h2 className="text-xl font-bold text-neutral-900">Todas las Reservas</h2>
          <p className="text-sm text-neutral-500 mt-1">
            {sortedReservations.length} reservas registradas
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sortedReservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400">
              <Calendar size={48} className="mb-3 opacity-20" />
              <p>No hay reservas en el sistema</p>
            </div>
          ) : (
            sortedReservations.map(reservation => (
              <motion.button
                key={reservation.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedReservation(reservation)}
                className={clsx(
                  "w-full p-4 rounded-lg border-2 transition-all text-left mb-2",
                  selectedReservation?.id === reservation.id
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "bg-white border-neutral-200 hover:border-neutral-300"
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Calendar size={18} />
                  <span className="text-sm font-medium">{new Date(reservation.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <Clock size={20} />
                  <span className="text-xl font-bold">{reservation.time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm opacity-80">
                  <Users size={14} />
                  <span>{reservation.guests} personas</span>
                </div>
              </motion.button>
            ))
          )}
        </div>
      </div>

      {/* Reservation Details Panel */}
      <AnimatePresence mode="wait">
        {selectedReservation ? (
          <motion.div
            key={selectedReservation.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 bg-neutral-50 p-6 overflow-y-auto"
          >
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-neutral-900">Detalles de Reserva</h2>
                <button
                  onClick={() => setSelectedReservation(null)}
                  className="p-2 hover:bg-neutral-200 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 space-y-6">
                <div>
                  <label className="text-sm text-neutral-500 font-medium">Cliente</label>
                  <p className="text-xl font-bold text-neutral-900 mt-1">{selectedReservation.name}</p>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm text-neutral-500 font-medium flex items-center gap-2">
                      <Calendar size={16} />
                      Fecha
                    </label>
                    <p className="text-lg font-semibold text-neutral-900 mt-1">{new Date(selectedReservation.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm text-neutral-500 font-medium flex items-center gap-2">
                      <Clock size={16} />
                      Hora
                    </label>
                    <p className="text-lg font-semibold text-neutral-900 mt-1">{selectedReservation.time}</p>
                  </div>
                  <div>
                    <label className="text-sm text-neutral-500 font-medium flex items-center gap-2">
                      <Users size={16} />
                      Personas
                    </label>
                    <p className="text-lg font-semibold text-neutral-900 mt-1">{selectedReservation.guests}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm text-neutral-500 font-medium">Teléfono</label>
                    <p className="text-lg font-semibold text-neutral-900 mt-1">{selectedReservation.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-neutral-500 font-medium">Correo Electrónico</label>
                    <p className="text-lg font-semibold text-neutral-900 mt-1">{selectedReservation.email || 'N/A'}</p>
                  </div>
                </div>

                {selectedReservation.notes && (
                  <div>
                    <label className="text-sm text-neutral-500 font-medium flex items-center gap-2 mb-2">
                      <StickyNote size={16} />
                      Anotaciones
                    </label>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-neutral-900">{selectedReservation.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-400">
            <div className="text-center">
              <Calendar size={64} className="mx-auto mb-4 opacity-20" />
              <p>Selecciona una reserva para ver los detalles</p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
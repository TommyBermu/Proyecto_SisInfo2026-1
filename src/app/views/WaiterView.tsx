import { useState } from "react";
import { useRestaurant, Table, MenuItem } from "../../context/RestaurantContext";
import { TableGrid } from "../components/waiter/TableGrid";
import { Plus, Check, DollarSign, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";

export default function WaiterView() {
  const { 
    menuItems, 
    createOrder, 
    closeTable, 
    tables,
    getOrdersByTable
  } = useRestaurant();
  
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [currentOrder, setCurrentOrder] = useState<{ id: string, quantity: number, notes?: string }[]>([]);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');

  const categories = ['Todos', 'Entrantes', 'Platos Principales', 'Postres', 'Bebidas'];

  const filteredItems = activeCategory === 'Todos' 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory);

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
    // Reset temporary order
    setCurrentOrder([]);
    setShowOrderPanel(true);
  };

  const handleAddToOrder = (item: MenuItem) => {
    setCurrentOrder(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, quantity: 1 }];
    });
  };

  const handleRemoveFromOrder = (itemId: string) => {
    setCurrentOrder(prev => prev.filter(i => i.id !== itemId));
  };

  const handleConfirmOrder = () => {
    if (!selectedTable) return;
    
    const items = currentOrder.map(orderItem => {
      const menuRef = menuItems.find(m => m.id === orderItem.id);
      return {
        menuItemId: orderItem.id,
        quantity: orderItem.quantity,
        name: menuRef?.name || 'Unknown',
        price: menuRef?.price || 0,
        notes: orderItem.notes
      };
    });

    createOrder(selectedTable.id, items, 'Mesero Actual');
    setShowOrderPanel(false);
  };

  const handleCloseTable = () => {
    if (!selectedTable) return;
    closeTable(selectedTable.id);
    setShowOrderPanel(false);
  };

  const existingOrder = selectedTable ? getOrdersByTable(selectedTable.id) : null;

  return (
    <div className="flex h-[calc(100vh-32px)] bg-neutral-100 overflow-hidden">
      {/* Table Grid (Left) */}
      <div className="flex-1 overflow-y-auto">
        <header className="p-6 pb-0">
          <h1 className="text-2xl font-bold text-neutral-800">Sala Principal</h1>
          <p className="text-neutral-500">Selecciona una mesa para gestionar pedidos</p>
        </header>
        <TableGrid onTableClick={handleTableClick} />
      </div>

      {/* Side Panel (Right) */}
      <AnimatePresence>
        {showOrderPanel && selectedTable && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-[450px] bg-white border-l border-neutral-200 shadow-2xl flex flex-col h-full absolute right-0 top-8 bottom-0 z-40"
          >
            {/* Panel Header */}
            <div className="bg-neutral-900 text-white p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Mesa {selectedTable.id}</h2>
                <span className={clsx("text-xs uppercase font-bold px-2 py-0.5 rounded", 
                  selectedTable.status === 'free' ? 'bg-emerald-500 text-white' : 
                  selectedTable.status === 'occupied' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'
                )}>
                  {selectedTable.status}
                </span>
              </div>
              <button onClick={() => setShowOrderPanel(false)} className="text-neutral-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* If table is occupied, show existing order */}
              {existingOrder && (
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                  <h3 className="font-bold text-neutral-800 mb-3 flex items-center justify-between">
                    Pedido en Curso
                    <span className="text-xs bg-neutral-200 text-neutral-600 px-2 py-1 rounded">
                      {existingOrder.status}
                    </span>
                  </h3>
                  <div className="space-y-2 text-sm">
                    {existingOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="font-mono">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-neutral-200 flex justify-between font-bold text-neutral-900 mt-2">
                      <span>Total</span>
                      <span>${existingOrder.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleCloseTable}
                    className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
                  >
                    <DollarSign size={18} />
                    Cerrar Cuenta e Imprimir
                  </button>
                </div>
              )}

              {/* Order Taking Interface */}
              {(!existingOrder || selectedTable.status === 'free') && (
                <>
                  <div>
                    <h3 className="font-bold text-neutral-800 mb-2">Nuevo Pedido</h3>
                    
                    {/* Categories */}
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                      {categories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          className={clsx(
                            "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                            activeCategory === cat ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Menu Items Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {filteredItems.map(item => (
                        <button
                          key={item.id}
                          disabled={!item.inStock}
                          onClick={() => handleAddToOrder(item)}
                          className="text-left p-3 rounded-xl border border-neutral-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all disabled:opacity-50 group relative"
                        >
                          <div className="font-medium text-sm leading-tight mb-1">{item.name}</div>
                          <div className="text-xs text-neutral-500 font-mono">${item.price}</div>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-emerald-600">
                            <Plus size={16} />
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Current Selection Summary */}
                    {currentOrder.length > 0 && (
                      <div className="border-t border-neutral-200 pt-4">
                        <h4 className="font-bold text-sm text-neutral-600 mb-2">Resumen</h4>
                        <ul className="space-y-2 mb-4">
                          {currentOrder.map(item => {
                            const menuRef = menuItems.find(m => m.id === item.id);
                            return (
                              <li key={item.id} className="flex justify-between items-center text-sm bg-white p-2 rounded shadow-sm border border-neutral-100">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-emerald-600">{item.quantity}x</span>
                                  <span>{menuRef?.name}</span>
                                </div>
                                <button onClick={() => handleRemoveFromOrder(item.id)} className="text-red-400 hover:text-red-600">
                                  <X size={14} />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                        <button
                          onClick={handleConfirmOrder}
                          className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
                        >
                          <Check size={18} />
                          Enviar a Cocina
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useRestaurant, Order } from '../context/RestaurantContext';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Clock, AlertTriangle, EyeOff } from 'lucide-react';
import { differenceInMinutes } from 'date-fns';
import { clsx } from 'clsx';

export default function KitchenView() {
  const { orders, completeOrder, dishes, toggleDishStatus } = useRestaurant();
  const activeOrders = orders.filter(o => o.status !== 'completed').sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Stock Control Panel State
  const [isStockPanelOpen, setIsStockPanelOpen] = useState(false);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-neutral-900 text-white p-6 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b border-neutral-700 pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Clock className="text-orange-500" />
          KDS - Cocina
        </h1>
        <button 
          onClick={() => setIsStockPanelOpen(!isStockPanelOpen)}
          className={clsx(
            "px-6 py-2 rounded-lg font-bold transition-colors flex items-center gap-2",
            isStockPanelOpen ? "bg-red-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
          )}
        >
          <EyeOff size={18} />
          Control de Stock
        </button>
      </div>

      {/* Orders Grid */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-6 h-full min-w-max">
          <AnimatePresence>
            {activeOrders.length === 0 ? (
              <div className="w-full flex items-center justify-center text-neutral-500 italic">
                No hay órdenes pendientes
              </div>
            ) : (
              activeOrders.map(order => (
                <OrderTicket 
                  key={order.id} 
                  order={order} 
                  onComplete={() => completeOrder(order.id)} 
                  dishes={dishes}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Stock Panel Overlay */}
      <AnimatePresence>
        {isStockPanelOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 h-1/3 bg-neutral-800 border-t border-neutral-700 shadow-2xl z-50 p-6 overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Disponibilidad de Platillos</h3>
              <button onClick={() => setIsStockPanelOpen(false)} className="text-neutral-400 hover:text-white">
                <AlertTriangle size={24} />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {dishes.map(dish => (
                <button
                  key={dish.id}
                  onClick={() => toggleDishStatus(dish.id)}
                  className={clsx(
                    "p-3 rounded-lg border text-left transition-all",
                    dish.status === 'active' 
                      ? "bg-neutral-700 border-neutral-600 hover:bg-neutral-600" 
                      : "bg-red-900/30 border-red-700 text-red-400 opacity-75"
                  )}
                >
                  <div className="font-bold text-sm truncate">{dish.name}</div>
                  <div className="text-xs mt-1 uppercase tracking-wider font-medium">
                    {dish.status === 'active' ? 'Disponible' : 'Agotado'}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OrderTicket({ order, onComplete, dishes }: { order: Order; onComplete: () => void; dishes: any[] }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(differenceInMinutes(new Date(), order.createdAt));
    }, 1000 * 60);
    setElapsed(differenceInMinutes(new Date(), order.createdAt));
    return () => clearInterval(interval);
  }, [order.createdAt]);

  const isLate = elapsed > 20; // Alert if > 20 mins

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={clsx(
        "w-[320px] h-full flex flex-col rounded-xl overflow-hidden border-2 shadow-lg bg-neutral-800 relative",
        isLate ? "border-red-500" : "border-neutral-700"
      )}
    >
      <div className={clsx(
        "p-4 flex justify-between items-center text-white",
        isLate ? "bg-red-600" : "bg-neutral-700"
      )}>
        <div>
          <span className="text-xs font-bold opacity-75 block">Mesa</span>
          <span className="text-2xl font-bold">#{order.tableId.replace('t', '')}</span>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold opacity-75 block">Tiempo</span>
          <span className="text-xl font-mono">{elapsed}m</span>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-neutral-800 text-neutral-200">
        {order.items.map((item, idx) => {
          const dish = dishes.find(d => d.id === item.dishId);
          return (
            <div key={idx} className="border-b border-neutral-700 pb-2 last:border-0">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-lg font-bold text-white">{item.quantity}x {dish?.name}</span>
              </div>
              {item.notes && (
                <p className="text-sm text-yellow-500 italic bg-yellow-900/20 p-2 rounded border border-yellow-900/50">
                  Nota: {item.notes}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-neutral-800 border-t border-neutral-700">
        <button 
          onClick={onComplete}
          className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 transition-all"
        >
          <CheckCircle size={24} />
          Completado
        </button>
      </div>
    </motion.div>
  );
}

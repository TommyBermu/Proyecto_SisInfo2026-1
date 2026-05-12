import { useState, useEffect } from "react";
import { useRestaurant, Order, OrderStatus } from "../context/RestaurantContext";
import { Clock, CheckCircle, Ban, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function KitchenView() {
  const { orders, updateOrderStatus, menuItems, toggleStock } = useRestaurant();
  const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'served');

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4">
      <header className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
        <h1 className="text-2xl font-bold tracking-wider flex items-center gap-3">
          <span className="text-emerald-500">KDS</span> SISTEMA DE COCINA
        </h1>
        <div className="flex items-center gap-4 text-sm text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            En tiempo
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
            Retrasado (+15m)
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-x-auto pb-4">
        <AnimatePresence>
          {activeOrders.map((order) => (
            <OrderCard key={order.id} order={order} onUpdateStatus={updateOrderStatus} />
          ))}
        </AnimatePresence>
        
        {activeOrders.length === 0 && (
          <div className="col-span-full py-20 text-center text-neutral-600">
            <CheckCircle size={48} className="mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-medium">Todo listo, Chef.</h3>
            <p>Esperando nuevas comandas.</p>
          </div>
        )}
      </div>

      {/* Quick Stock Toggle (Footer) */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-800 border-t border-neutral-700 p-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Control Rápido de Stock (Desactivar si falta ingrediente)</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleStock(item.id)}
              className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded border transition-colors whitespace-nowrap text-sm font-medium",
                item.inStock 
                  ? "bg-neutral-700 border-neutral-600 text-neutral-300 hover:bg-neutral-600" 
                  : "bg-red-900/50 border-red-700 text-red-400 line-through"
              )}
            >
              {!item.inStock && <Ban size={14} />}
              {item.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order, onUpdateStatus }: { order: Order, onUpdateStatus: (id: string, status: OrderStatus) => void }) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(formatDistanceToNow(new Date(order.createdAt), { locale: es, addSuffix: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, [order.createdAt]);

  const isLate = (new Date().getTime() - new Date(order.createdAt).getTime()) > 1000 * 60 * 15; // 15 mins

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={clsx(
        "rounded-lg border-l-4 overflow-hidden bg-neutral-800 shadow-lg flex flex-col h-[400px]", // Fixed height for alignment
        isLate ? "border-l-orange-500" : "border-l-emerald-500"
      )}
    >
      <div className="bg-neutral-700 p-3 flex justify-between items-start">
        <div>
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Mesa</span>
          <h2 className="text-2xl font-bold text-white leading-none">#{order.tableId}</h2>
        </div>
        <div className="text-right">
          <div className={clsx("flex items-center gap-1 font-mono text-sm font-bold", isLate ? "text-orange-400" : "text-emerald-400")}>
            <Clock size={14} />
            {elapsed}
          </div>
          <div className="text-xs text-neutral-500 mt-1">{formatDistanceToNow(order.createdAt, { addSuffix: true, locale: es })}</div>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-3">
        {order.items.map((item, idx) => (
          <div key={idx} className="border-b border-neutral-700 pb-2 last:border-0 last:pb-0">
            <div className="flex justify-between items-start">
              <span className="font-bold text-lg text-white">{item.quantity}x</span>
              <span className="flex-1 ml-3 font-medium text-neutral-200">{item.name}</span>
            </div>
            {item.notes && (
              <div className="mt-1 flex items-start gap-1 text-sm text-yellow-500 bg-yellow-900/20 p-1.5 rounded">
                <AlertTriangle size={12} className="mt-0.5" />
                <span className="italic">{item.notes}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 bg-neutral-800 border-t border-neutral-700">
        <button
          onClick={() => onUpdateStatus(order.id, 'served')}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded flex items-center justify-center gap-2 transition-colors uppercase tracking-wide text-sm"
        >
          <CheckCircle size={18} />
          Completar Orden
        </button>
      </div>
    </motion.div>
  );
}

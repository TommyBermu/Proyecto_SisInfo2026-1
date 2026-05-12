import clsx from "clsx";
import { useRestaurant, Table } from "../../context/RestaurantContext";
import { Users, Clock, DollarSign, Utensils } from "lucide-react";
import { motion } from "motion/react";

interface TableGridProps {
  onTableClick: (table: Table) => void;
}

export function TableGrid({ onTableClick }: TableGridProps) {
  const { tables } = useRestaurant();

  const getStatusColor = (status: Table['status']) => {
    switch (status) {
      case 'free': return 'bg-white border-neutral-200 text-neutral-600 hover:border-emerald-400 hover:text-emerald-600';
      case 'occupied': return 'bg-red-50 border-red-200 text-red-600';
      case 'waiting-food': return 'bg-orange-50 border-orange-200 text-orange-600';
      case 'ready-to-pay': return 'bg-emerald-50 border-emerald-200 text-emerald-600 animate-pulse';
      default: return 'bg-white';
    }
  };

  const getStatusIcon = (status: Table['status']) => {
    switch (status) {
      case 'free': return <Users size={16} />;
      case 'occupied': return <Utensils size={16} />;
      case 'waiting-food': return <Clock size={16} />;
      case 'ready-to-pay': return <DollarSign size={16} />;
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">
      {tables.map((table) => (
        <motion.button
          key={table.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onTableClick(table)}
          className={clsx(
            "relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-2 shadow-sm transition-colors",
            getStatusColor(table.status)
          )}
        >
          <span className="text-3xl font-bold">Mesa {table.id}</span>
          <div className="flex items-center gap-1 text-sm font-medium opacity-80">
            {getStatusIcon(table.status)}
            <span className="uppercase tracking-wide text-xs">
              {table.status.replace('-', ' ')}
            </span>
          </div>
          <div className="absolute top-3 right-3 text-xs font-medium bg-black/5 px-2 py-1 rounded-full">
            {table.seats} Pax
          </div>
        </motion.button>
      ))}
    </div>
  );
}

import { useState } from "react";
import { useRestaurant, Category } from "../context/RestaurantContext";
import { ShoppingBag, ChevronLeft, Plus, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";
import { Link } from "react-router";

export default function ClientMenuView() {
  const { menuItems } = useRestaurant();
  const [activeCategory, setActiveCategory] = useState<Category | 'Todos'>('Todos');

  const categories: (Category | 'Todos')[] = ['Todos', 'Entrantes', 'Platos Principales', 'Postres', 'Bebidas'];

  const filteredItems = activeCategory === 'Todos' 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory);

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-neutral-200 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900">
            <ChevronLeft size={20} />
            <span className="font-medium">Volver</span>
          </Link>
          <h1 className="text-xl font-serif font-bold text-neutral-900">Nuestro Menú</h1>
          <div className="w-8" /> {/* Spacer */}
        </div>
      </header>

      {/* Category Tabs */}
      <div className="sticky top-[60px] z-20 bg-neutral-50 py-4 px-4 overflow-x-auto">
        <div className="flex gap-2 max-w-5xl mx-auto min-w-max">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={clsx(
                "px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                activeCategory === cat 
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" 
                  : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <main className="max-w-5xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={item.id}
                className={clsx(
                  "bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-100 group hover:shadow-md transition-shadow",
                  !item.inStock && "opacity-60 grayscale"
                )}
              >
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {!item.inStock && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Agotado</span>
                    </div>
                  )}
                  {item.inStock && (
                    <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur text-emerald-700 font-bold px-3 py-1 rounded-lg shadow-sm">
                      ${item.price.toFixed(2)}
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-neutral-900 line-clamp-1">{item.name}</h3>
                  </div>
                  <p className="text-neutral-500 text-sm line-clamp-2 mb-4 h-10">{item.description}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                    <span className="text-xs text-neutral-400 font-medium uppercase tracking-wide">{item.category}</span>
                    <button 
                      disabled={!item.inStock}
                      className="p-2 rounded-full bg-neutral-100 text-neutral-600 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Ver detalles"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

import { Link } from "react-router";
import { UtensilsCrossed, Calendar, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

export default function ClientView() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero */}
      <section className="relative h-[60vh] flex items-center justify-center text-white">
        <div className="absolute inset-0 bg-black/60 z-10" />
        <img 
          src="https://images.unsplash.com/photo-1657940743533-9d7e78065042?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" 
          alt="Restaurant Ambiance" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-serif font-bold mb-6"
          >
            Sabor & Estilo
          </motion.h1>
          <p className="text-xl md:text-2xl mb-8 font-light text-neutral-200">
            Experiencia gastronómica inolvidable en el corazón de la ciudad.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/menu" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full text-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <UtensilsCrossed size={20} />
              Ver Menú
            </Link>
            <Link 
              to="/reservas" 
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white px-8 py-3 rounded-full text-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Calendar size={20} />
              Reservar Mesa
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-serif font-bold text-neutral-900 mb-6">Nuestra Cocina</h2>
            <p className="text-neutral-600 text-lg leading-relaxed mb-6">
              Ingredientes frescos, recetas tradicionales y un toque moderno. Cada plato cuenta una historia de pasión y excelencia culinaria.
            </p>
            <Link to="/menu" className="text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-1 group">
              Explorar nuestros platos 
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img src="https://images.unsplash.com/photo-1762922425249-144c3bb9167e?auto=format&fit=crop&w=800&q=80" className="rounded-2xl shadow-lg w-full h-48 object-cover translate-y-8" alt="Dish 1" />
            <img src="https://images.unsplash.com/photo-1655662844229-d2c2a81f09ec?auto=format&fit=crop&w=800&q=80" className="rounded-2xl shadow-lg w-full h-48 object-cover" alt="Dish 2" />
          </div>
        </div>
      </section>
    </div>
  );
}

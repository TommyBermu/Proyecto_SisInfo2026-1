import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRestaurant, Dish } from '../context/RestaurantContext';
import { Search, Clock, Users, X } from 'lucide-react';

export default function ClientView() {
  const { dishes, addReservation } = useRestaurant();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['all', ...Array.from(new Set(dishes.map(d => d.category)))];

  const filteredDishes = dishes.filter(d => {
    const matchesCategory = selectedCategory === 'all' || d.category === selectedCategory;
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="h-full overflow-y-auto bg-neutral-50 pb-20">
      {/* Hero Section */}
      <section className="relative h-[400px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <img 
          src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80" 
          alt="Restaurant Ambiance" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white text-center px-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-4"
          >
            Sabor & Alma
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl font-light mb-8 max-w-2xl"
          >
            Una experiencia culinaria que despierta tus sentidos.
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => setIsReservationOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-full font-medium transition-colors flex items-center gap-2"
          >
            <Clock size={20} />
            Reservar Mesa
          </motion.button>
        </div>
      </section>

      {/* Menu Section */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h2 className="text-3xl font-bold text-neutral-800">Nuestro Menú</h2>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar platillo..." 
                className="pl-10 pr-4 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-orange-500 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="flex overflow-x-auto gap-2 pb-6 mb-4 hide-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2 rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === cat 
                  ? 'bg-neutral-900 text-white' 
                  : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDishes.map((dish) => (
            <DishCard key={dish.id} dish={dish} />
          ))}
        </div>
      </section>

      {/* Reservation Modal */}
      <AnimatePresence>
        {isReservationOpen && (
          <ReservationModal onClose={() => setIsReservationOpen(false)} onSubmit={addReservation} />
        )}
      </AnimatePresence>
    </div>
  );
}

function DishCard({ dish }: { dish: Dish }) {
  const isInactive = dish.status === 'inactive';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-neutral-100 group ${isInactive ? 'opacity-60 grayscale' : ''}`}
    >
      <div className="relative h-48 overflow-hidden">
        <img 
          src={dish.image} 
          alt={dish.name} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {isInactive && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white/90 text-neutral-900 px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider">Agotado</span>
          </div>
        )}
      </div>
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-neutral-900">{dish.name}</h3>
          <span className="text-orange-600 font-bold text-lg">${dish.price.toFixed(2)}</span>
        </div>
        <p className="text-neutral-500 text-sm mb-4 line-clamp-2">{dish.description}</p>
        <div className="flex gap-2">
            <span className="inline-block px-3 py-1 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-full">
              {dish.category}
            </span>
        </div>
      </div>
    </motion.div>
  );
}

function ReservationModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (r: any) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    time: '',
    guests: 2,
    phone: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, combine date and time
    onSubmit({ ...formData, id: Math.random().toString() });
    onClose();
    alert('¡Reserva confirmada!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl z-10"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900">
          <X size={24} />
        </button>
        
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-neutral-900">Reservar Mesa</h3>
          <p className="text-neutral-500 text-sm">Asegura tu lugar en Sabor & Alma</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Nombre Completo</label>
            <input 
              required
              type="text" 
              className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Fecha</label>
              <input 
                required
                type="date" 
                className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Hora</label>
              <select 
                required
                className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                value={formData.time}
                onChange={e => setFormData({...formData, time: e.target.value})}
              >
                <option value="">Seleccionar</option>
                <option value="12:00">12:00 PM</option>
                <option value="13:00">1:00 PM</option>
                <option value="14:00">2:00 PM</option>
                <option value="19:00">7:00 PM</option>
                <option value="20:00">8:00 PM</option>
                <option value="21:00">9:00 PM</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Comensales</label>
              <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden">
                <button 
                  type="button"
                  className="px-3 py-2 bg-neutral-50 hover:bg-neutral-100 border-r"
                  onClick={() => setFormData(prev => ({...prev, guests: Math.max(1, prev.guests - 1)}))}
                >
                  -
                </button>
                <input 
                  type="number" 
                  className="w-full text-center py-2 focus:outline-none"
                  value={formData.guests}
                  readOnly
                />
                <button 
                  type="button"
                  className="px-3 py-2 bg-neutral-50 hover:bg-neutral-100 border-l"
                  onClick={() => setFormData(prev => ({...prev, guests: Math.min(10, prev.guests + 1)}))}
                >
                  +
                </button>
              </div>
            </div>
             <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Teléfono</label>
              <input 
                required
                type="tel" 
                className="w-full px-4 py-2 rounded-lg border border-neutral-200 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg mt-4 transition-colors shadow-lg hover:shadow-xl"
          >
            Confirmar Reserva
          </button>
        </form>
      </motion.div>
    </div>
  );
}

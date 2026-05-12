import { useState } from "react";
import { Link } from "react-router";
import { ChevronLeft, Calendar, Users, Clock, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import clsx from "clsx";

export default function ClientReservationsView() {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [guests, setGuests] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const availableTimes = ['13:00', '13:30', '14:00', '14:30', '15:00', '20:00', '20:30', '21:00', '21:30'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-neutral-100 relative">
        <div className="bg-emerald-600 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-10 -translate-y-10" />
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -translate-x-5 translate-y-5" />
          <Link to="/" className="absolute left-4 top-4 text-white/80 hover:text-white transition-colors">
            <ChevronLeft size={24} />
          </Link>
          <h2 className="text-2xl font-serif font-bold mb-1">Reservar Mesa</h2>
          <p className="text-emerald-100 text-sm">Reserva tu experiencia gastronómica hoy</p>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.form
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                {/* Date Picker (Mock) */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                    <Calendar size={16} className="text-emerald-600" />
                    Fecha
                  </label>
                  <input 
                    type="date" 
                    required
                    className="w-full border border-neutral-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>

                {/* Guests */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                    <Users size={16} className="text-emerald-600" />
                    Comensales
                  </label>
                  <div className="flex items-center justify-between border border-neutral-200 rounded-lg p-2">
                    <button 
                      type="button"
                      onClick={() => setGuests(Math.max(1, guests - 1))}
                      className="w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold transition-colors"
                    >
                      -
                    </button>
                    <span className="text-lg font-bold text-neutral-900">{guests}</span>
                    <button 
                      type="button"
                      onClick={() => setGuests(Math.min(10, guests + 1))}
                      className="w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Time Slots */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                    <Clock size={16} className="text-emerald-600" />
                    Hora
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableTimes.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={clsx(
                          "py-2 px-1 rounded-lg text-sm font-medium border transition-all",
                          selectedTime === time
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                        )}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={!selectedDate || !selectedTime || isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : "Confirmar Reserva"}
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10"
              >
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                  <Check size={40} strokeWidth={3} />
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 mb-2">¡Reserva Confirmada!</h3>
                <p className="text-neutral-600 mb-8">
                  Te esperamos el <span className="font-bold text-neutral-800">{selectedDate}</span> a las <span className="font-bold text-neutral-800">{selectedTime}</span> para {guests} personas.
                </p>
                <Link 
                  to="/" 
                  className="bg-neutral-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-neutral-800 transition-colors inline-block"
                >
                  Volver al Inicio
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

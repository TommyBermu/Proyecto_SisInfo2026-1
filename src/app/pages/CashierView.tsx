import React, { useState, useEffect } from 'react';
import {
  CreditCard, DollarSign, Receipt, TrendingUp, Clock,
  CheckCircle2, X, Scissors, Plus, Minus, ChevronRight,
  ArrowLeft, Smartphone, Banknote, RefreshCw, Star,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { useRestaurant, Order } from '../context/RestaurantContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../../lib/supabase';

type PaymentMethod = 'cash' | 'card' | 'transfer';
type SplitStep = 'assign' | 'pay';

interface TodayStats {
  totalSales: number;
  completedOrders: number;
  totalOrders: number;
}

interface ExpandedUnit {
  unitId: string;
  dishId: string;
  notes?: string;
}

interface SplitPartResult {
  paymentMethod: PaymentMethod;
  items: Array<{ dishId: string; quantity: number; notes?: string }>;
  montoRecibido?: number;
  propina: number;
}

const TIP_PERCENTAGES = [0, 10, 15, 20] as const;

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash:     'Efectivo',
  card:     'Tarjeta',
  transfer: 'Nequi / Daviplata',
};

const PAYMENT_ICONS: Record<PaymentMethod, React.ReactNode> = {
  cash:     <Banknote    size={16} />,
  card:     <CreditCard  size={16} />,
  transfer: <Smartphone  size={16} />,
};

const NEQUI_LS_KEY = 'restaurant_nequi_number';

const fmt = (n: number) =>
  '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ─── Payment method selector ──────────────────────────────────────────────────

function PaymentMethodSelector({
  value,
  onChange,
}: {
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
}) {
  return (
    <div className="flex gap-2">
      {(['cash', 'card', 'transfer'] as PaymentMethod[]).map(method => (
        <button
          key={method}
          type="button"
          onClick={() => onChange(method)}
          className={clsx(
            'flex-1 flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl border-2 text-xs font-semibold transition-all',
            value === method
              ? 'border-neutral-900 bg-neutral-900 text-white shadow-md'
              : 'border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:bg-neutral-50'
          )}
        >
          {PAYMENT_ICONS[method]}
          {PAYMENT_LABELS[method]}
        </button>
      ))}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function CashierView() {
  const { orders, tables, dishes, fetchOrders } = useRestaurant();
  const { profile } = useAuth();

  const [todayStats,        setTodayStats]        = useState<TodayStats>({ totalSales: 0, completedOrders: 0, totalOrders: 0 });
  const [paymentModalOrder, setPaymentModalOrder]  = useState<Order | null>(null);
  const [splitModalOrder,   setSplitModalOrder]    = useState<Order | null>(null);
  const [processingOrderId, setProcessingOrderId]  = useState<string | null>(null);
  const [paidOrderIds,      setPaidOrderIds]       = useState<Set<string>>(new Set());
  // Rating modal: stores the orderId just paid, awaiting rating or skip
  const [ratingOrderId,     setRatingOrderId]      = useState<string | null>(null);

  const fetchTodayStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data: pedidosHoy, count: totalOrders } = await supabase
      .from('pedido')
      .select('id', { count: 'exact' })
      .eq('fecha', today);

    const pedidoIds = (pedidosHoy || []).map((p: any) => p.id);
    if (pedidoIds.length === 0) {
      setTodayStats({ totalSales: 0, completedOrders: 0, totalOrders: 0 });
      return;
    }

    const { data: facturas, error } = await supabase
      .from('factura')
      .select('total')
      .eq('estado', 'pagada')
      .in('pedido_id', pedidoIds);

    if (error) console.error('Error fetching today stats:', error);
    const list = facturas || [];
    setTodayStats({
      totalSales:      list.reduce((acc, f) => acc + Number(f.total), 0),
      completedOrders: list.length,
      totalOrders:     totalOrders ?? 0,
    });
  };

  useEffect(() => { void fetchTodayStats(); }, []);

  const pendingPaymentOrders = orders.filter(o => o.status === 'ready' && !paidOrderIds.has(o.id));
  const getTableNumber = (tableId: string) => tables.find(t => t.id === tableId)?.number ?? 'N/A';
  const getDishName    = (dishId: string)  => dishes.find(d => d.id === dishId)?.name ?? 'Desconocido';

  // ── Single payment: RPC atómico (factura + venta_plato + venta_metodo_pago + venta_horario) ──

  const handleProcessPayment = async (
    orderId: string,
    method: PaymentMethod,
    receivedAmount?: number,
    tip = 0,
  ) => {
    if (!profile) { alert('No se encontró el perfil del cajero'); return; }
    const order = orders.find(o => o.id === orderId);
    if (!order) { alert('No se encontró la orden'); return; }

    setProcessingOrderId(orderId);
    const { error } = await supabase.rpc('procesar_pago_pedido', {
      p_pedido_id: orderId,
      p_cajero_id: profile.id,
      p_metodo_pago: method,
      p_propina: tip,
      p_monto_recibido: receivedAmount ?? null,
    });
    setProcessingOrderId(null);

    if (error) {
      console.error('[handleProcessPayment] error:', error);
      alert('No se pudo procesar el pago: ' + error.message);
      return;
    }

    setPaymentModalOrder(null);
    setPaidOrderIds(prev => new Set([...prev, orderId]));
    setRatingOrderId(orderId);
    try { await Promise.all([fetchTodayStats(), fetchOrders()]); } catch (e) { console.error('Refresh failed:', e); }
  };

  // ── Split payment: RPC atómico, una factura por parte ────────────────────────

  const handleSplitPayment = async (orderId: string, parts: SplitPartResult[]) => {
    if (!profile) { alert('No se encontró el perfil del cajero'); return; }
    const order = orders.find(o => o.id === orderId);
    if (!order) { alert('No se encontró la orden'); return; }

    const p_partes = parts
      .filter(p => p.items.length > 0)
      .map(part => ({
        metodo_pago: part.paymentMethod,
        propina: part.propina,
        monto_recibido: part.montoRecibido ?? null,
        items: part.items.map(item => ({
          plato_id: item.dishId,
          cantidad: item.quantity,
          precio_unitario: Number(dishes.find(d => d.id === item.dishId)?.price ?? 0),
        })),
      }));

    const { error } = await supabase.rpc('procesar_pago_dividido', {
      p_pedido_id: orderId,
      p_cajero_id: profile.id,
      p_partes,
    });

    if (error) {
      console.error('[handleSplitPayment] error:', error);
      alert('Error al separar la cuenta: ' + error.message);
      return;
    }

    setSplitModalOrder(null);
    setPaidOrderIds(prev => new Set([...prev, orderId]));
    setRatingOrderId(orderId);
    try { await Promise.all([fetchTodayStats(), fetchOrders()]); } catch (e) { console.error('Refresh failed:', e); }
  };

  // ── Rating ─────────────────────────────────────────────────────────────────

  const handleSubmitRating = async (stars: number, comment: string) => {
    const orderId = ratingOrderId;
    setRatingOrderId(null);
    if (!orderId) return;

    try {
      const [{ data: pedido }, { data: detalles }] = await Promise.all([
        supabase.from('pedido').select('mesero_id').eq('id', orderId).single(),
        supabase.from('detalle_pedido').select('chef_id').eq('pedido_id', orderId).not('chef_id', 'is', null),
      ]);

      const empleadosIds = new Set<string>();
      if (pedido?.mesero_id) empleadosIds.add(pedido.mesero_id);
      if (profile?.id) empleadosIds.add(profile.id);
      (detalles ?? []).forEach((d: { chef_id: string | null }) => { if (d.chef_id) empleadosIds.add(d.chef_id); });

      const rows = Array.from(empleadosIds).map(empleado_id => ({
        empleado_id,
        calificacion: stars,
        comentario: comment.trim() || null,
      }));

      if (rows.length > 0) {
        const { error } = await supabase.from('empleado_calificacion').insert(rows);
        if (error) console.error('Error saving rating:', error);
      }
    } catch (e) {
      console.error('Rating submission failed:', e);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] lg:overflow-hidden bg-neutral-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto lg:h-full flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">Caja</h1>
          <p className="text-neutral-600">Gestión de pagos y cierre de cuentas</p>
        </div>

        <div className="lg:flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:overflow-hidden">
          {/* Stats */}
          <div className="lg:col-span-1 space-y-6 lg:overflow-y-auto">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign size={24} />
                <span className="text-sm font-medium opacity-90">Total Ventas Hoy</span>
              </div>
              <p className="text-4xl font-bold">{fmt(todayStats.totalSales)}</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="text-blue-600" size={24} />
                <span className="font-semibold text-neutral-900">Estadísticas del Día</span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Órdenes Completadas</span>
                  <span className="font-bold text-neutral-900">{todayStats.completedOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Órdenes Totales</span>
                  <span className="font-bold text-neutral-900">{todayStats.totalOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Ticket Promedio</span>
                  <span className="font-bold text-neutral-900">
                    {todayStats.completedOrders > 0
                      ? fmt(todayStats.totalSales / todayStats.completedOrders)
                      : '$0'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Orders */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-md overflow-hidden flex flex-col min-h-[50vh] lg:min-h-0">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900">Cuentas por Cobrar</h2>
              <p className="text-sm text-neutral-600 mt-1">{pendingPaymentOrders.length} órdenes pendientes</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {pendingPaymentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <CheckCircle2 className="text-green-500 mb-4" size={64} />
                  <h3 className="text-xl font-semibold text-neutral-900 mb-2">No hay cuentas pendientes</h3>
                  <p className="text-neutral-600">Todas las órdenes han sido pagadas</p>
                </div>
              ) : (
                pendingPaymentOrders.map((order) => (
                  <div key={order.id} className="bg-neutral-50 rounded-lg p-5 border-2 border-neutral-200 hover:border-neutral-300 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-lg text-neutral-900">Mesa {getTableNumber(order.tableId)}</span>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Lista</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-neutral-600">
                          <Clock size={14} />
                          <span>{new Date(order.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-neutral-900">{fmt(order.total)}</p>
                    </div>

                    <div className="space-y-1.5 mb-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-neutral-700">{item.quantity}x {getDishName(item.dishId)}</span>
                          <span className="font-medium text-neutral-900">
                            {fmt((dishes.find(d => d.id === item.dishId)?.price || 0) * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setSplitModalOrder(order)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-neutral-300 text-neutral-700 rounded-lg font-medium hover:border-neutral-800 hover:text-neutral-900 transition-colors"
                      >
                        <Scissors size={16} />
                        Separar Cuenta
                      </button>
                      <button
                        onClick={() => setPaymentModalOrder(order)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-700 transition-colors"
                      >
                        <CreditCard size={16} />
                        Cobrar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {paymentModalOrder && (
          <PaymentModal
            order={paymentModalOrder}
            dishes={dishes}
            tables={tables}
            processing={processingOrderId === paymentModalOrder.id}
            onClose={() => setPaymentModalOrder(null)}
            onConfirm={(method, receivedAmount, tip) =>
              void handleProcessPayment(paymentModalOrder.id, method, receivedAmount, tip)
            }
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {splitModalOrder && (
          <SplitBillModal
            order={splitModalOrder}
            dishes={dishes}
            tables={tables}
            onClose={() => setSplitModalOrder(null)}
            onConfirm={(parts) => void handleSplitPayment(splitModalOrder.id, parts)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ratingOrderId && (
          <RatingModal
            onSkip={() => setRatingOrderId(null)}
            onSubmit={(stars, comment) => void handleSubmitRating(stars, comment)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── TipSelector ──────────────────────────────────────────────────────────────

function parseMoneyInput(raw: string): number {
  return parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0;
}

function TipSelector({
  subtotal, tipInput, onChange,
}: {
  subtotal: number;
  tipInput: string;
  onChange: (value: string) => void;
}) {
  const tipNum = parseMoneyInput(tipInput);
  const activePct = TIP_PERCENTAGES.find(pct => Math.round(subtotal * pct / 100) === Math.round(tipNum));

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Propina</p>
      <div className="flex gap-2 mb-3">
        {TIP_PERCENTAGES.map(pct => (
          <button
            key={pct}
            type="button"
            onClick={() => onChange(pct === 0 ? '' : String(Math.round(subtotal * pct / 100)))}
            className={clsx(
              'flex-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all',
              activePct === pct
                ? 'border-neutral-900 bg-neutral-900 text-white shadow-md'
                : 'border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:bg-neutral-50'
            )}
          >
            {pct === 0 ? 'Sin propina' : `${pct}%`}
          </button>
        ))}
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">$</span>
        <input
          type="number"
          min={0}
          placeholder="Otro monto"
          value={tipInput}
          onChange={e => onChange(e.target.value)}
          className="w-full pl-8 pr-4 py-2.5 border-2 border-neutral-200 rounded-xl text-sm font-bold focus:outline-none focus:border-neutral-900 transition-colors"
        />
      </div>
    </div>
  );
}

// ─── PaymentModal ─────────────────────────────────────────────────────────────

function PaymentModal({
  order, dishes, tables, processing, onClose, onConfirm,
}: {
  order: Order;
  dishes: any[];
  tables: any[];
  processing: boolean;
  onClose: () => void;
  onConfirm: (method: PaymentMethod, receivedAmount: number | undefined, tip: number) => void;
}) {
  const [method,          setMethod]          = useState<PaymentMethod>('cash');
  const [receivedInput,   setReceivedInput]   = useState('');
  const [tipInput,        setTipInput]        = useState('');
  const [nequiNumber,     setNequiNumber]     = useState(() => localStorage.getItem(NEQUI_LS_KEY) ?? '');
  const tableNum = tables.find(t => t.id === order.tableId)?.number ?? 'N/A';

  const subtotal      = order.total;
  const tipNum        = parseMoneyInput(tipInput);
  const grandTotal    = subtotal + tipNum;
  const receivedNum   = parseMoneyInput(receivedInput);
  const vuelto        = receivedNum - grandTotal;
  const cashReady     = receivedNum >= grandTotal;

  const handleConfirm = () => {
    if (method === 'transfer' && nequiNumber.trim()) {
      localStorage.setItem(NEQUI_LS_KEY, nequiNumber.trim());
    }
    onConfirm(method, method === 'cash' ? receivedNum : undefined, tipNum);
  };

  const canConfirm = method === 'cash' ? cashReady : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{   opacity: 0, scale: 0.95, y: 10  }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10"
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Cobrar Mesa {tableNum}</h2>
            <p className="text-sm text-neutral-500 mt-0.5">Total a cobrar: {fmt(grandTotal)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Items */}
          <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
            {order.items.map((item, idx) => {
              const dish = dishes.find(d => d.id === item.dishId);
              return (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-neutral-700">{item.quantity}x {dish?.name ?? 'Desconocido'}</span>
                  <span className="font-medium">{fmt((dish?.price ?? 0) * item.quantity)}</span>
                </div>
              );
            })}
            <div className="border-t border-neutral-200 pt-2 mt-2 flex justify-between text-neutral-600">
              <span>Subtotal</span><span>{fmt(subtotal)}</span>
            </div>
            {tipNum > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>Propina</span><span>{fmt(tipNum)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-neutral-900 pt-1">
              <span>Total</span><span>{fmt(grandTotal)}</span>
            </div>
          </div>

          <TipSelector subtotal={subtotal} tipInput={tipInput} onChange={setTipInput} />

          {/* Method selector */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Método de pago</p>
            <PaymentMethodSelector value={method} onChange={m => { setMethod(m); setReceivedInput(''); }} />
          </div>

          {/* Conditional flow */}
          <AnimatePresence mode="wait">
            {method === 'cash' && (
              <motion.div key="cash" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 block mb-2">
                    Monto recibido
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">$</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={receivedInput}
                      onChange={e => setReceivedInput(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 border-2 border-neutral-200 rounded-xl text-lg font-bold focus:outline-none focus:border-neutral-900 transition-colors"
                      autoFocus
                    />
                  </div>
                </div>
                <div className={clsx(
                  'flex justify-between items-center px-4 py-3 rounded-xl transition-all',
                  cashReady ? 'bg-green-50 border border-green-200' : 'bg-neutral-50 border border-neutral-200'
                )}>
                  <span className={clsx('text-sm font-semibold', cashReady ? 'text-green-700' : 'text-neutral-400')}>
                    Vuelto
                  </span>
                  <span className={clsx('text-xl font-bold', cashReady ? 'text-green-700' : 'text-neutral-300')}>
                    {cashReady ? fmt(vuelto) : '—'}
                  </span>
                </div>
              </motion.div>
            )}

            {method === 'card' && (
              <motion.div key="card" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                className="space-y-3">
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-4">
                  <CreditCard className="text-blue-600 flex-shrink-0" size={24} />
                  <div>
                    <p className="text-sm font-bold text-blue-900">Cobra {fmt(grandTotal)} en el datafono</p>
                    <p className="text-xs text-blue-600 mt-0.5">Confirma cuando el terminal apruebe el pago</p>
                  </div>
                </div>
              </motion.div>
            )}

            {method === 'transfer' && (
              <motion.div key="transfer" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 block mb-2">
                    Número Nequi / Daviplata del negocio
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                      <input
                        type="tel"
                        placeholder="300 123 4567"
                        value={nequiNumber}
                        onChange={e => setNequiNumber(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border-2 border-neutral-200 rounded-xl text-sm font-medium focus:outline-none focus:border-neutral-900 transition-colors"
                      />
                    </div>
                    {nequiNumber && (
                      <button
                        onClick={() => { localStorage.setItem(NEQUI_LS_KEY, nequiNumber.trim()); }}
                        title="Guardar como predeterminado"
                        className="px-3 py-2 border-2 border-neutral-200 rounded-xl text-neutral-500 hover:border-neutral-400 transition-colors"
                      >
                        <RefreshCw size={15} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-4">
                  <Smartphone className="text-purple-600 flex-shrink-0" size={24} />
                  <div>
                    <p className="text-sm font-bold text-purple-900">El cliente transfiere {fmt(grandTotal)}</p>
                    <p className="text-xs text-purple-600 mt-0.5">Confirma cuando veas el dinero en tu app</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-3 border border-neutral-300 rounded-xl font-medium hover:bg-neutral-50 transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm || processing}
              className={clsx(
                'flex-1 py-3 rounded-xl font-bold transition-colors',
                canConfirm && !processing
                  ? 'bg-neutral-900 text-white hover:bg-neutral-700'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              )}
            >
              {processing ? 'Procesando...' : (
                method === 'cash'     ? 'Cobrar y dar vuelto' :
                method === 'card'     ? 'Aprobado en datafono' :
                                        'Transferencia recibida'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── SplitBillModal ───────────────────────────────────────────────────────────

interface PartState {
  method:        PaymentMethod;
  receivedInput: string;
  tipInput:      string;
}

function SplitBillModal({
  order, dishes, tables, onClose, onConfirm,
}: {
  order: Order;
  dishes: any[];
  tables: any[];
  onClose: () => void;
  onConfirm: (parts: SplitPartResult[]) => void;
}) {
  const tableNum = tables.find(t => t.id === order.tableId)?.number ?? 'N/A';

  const expandedUnits: ExpandedUnit[] = order.items.flatMap(item =>
    Array.from({ length: item.quantity }, (_, i) => ({
      unitId: `${item.dishId}::${i}`,
      dishId: item.dishId,
      notes:  item.notes,
    }))
  );

  const maxParts = expandedUnits.length;

  const [step,       setStep]       = useState<SplitStep>('assign');
  const [numParts,   setNumParts]   = useState(Math.min(2, maxParts));
  const [activePart, setActivePart] = useState(0);
  const [nequiNumber, setNequiNumber] = useState(() => localStorage.getItem(NEQUI_LS_KEY) ?? '');

  const [assignments, setAssignments] = useState<Record<string, number | null>>(
    Object.fromEntries(expandedUnits.map(u => [u.unitId, null]))
  );

  const [partStates, setPartStates] = useState<PartState[]>(
    Array.from({ length: maxParts }, () => ({ method: 'cash' as PaymentMethod, receivedInput: '', tipInput: '' }))
  );

  // Unassign items outside range when numParts shrinks
  useEffect(() => {
    setAssignments(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(uid => {
        if (next[uid] !== null && (next[uid] as number) >= numParts) next[uid] = null;
      });
      return next;
    });
    if (activePart >= numParts) setActivePart(numParts - 1);
  }, [numParts]);

  const changeNumParts = (d: number) => setNumParts(prev => Math.max(2, Math.min(maxParts, prev + d)));

  const setAssignment = (uid: string, val: number | null) =>
    setAssignments(prev => ({ ...prev, [uid]: val }));

  const updatePart = (i: number, patch: Partial<PartState>) =>
    setPartStates(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));

  const allAssigned  = expandedUnits.every(u => assignments[u.unitId] !== null);
  const getPartUnits = (i: number) => expandedUnits.filter(u => assignments[u.unitId] === i);
  const getPartTotal = (i: number) =>
    getPartUnits(i).reduce((acc, u) => acc + Number(dishes.find(d => d.id === u.dishId)?.price ?? 0), 0);
  const getPartTip = (i: number) => parseMoneyInput(partStates[i].tipInput);
  const getPartGrandTotal = (i: number) => getPartTotal(i) + getPartTip(i);

  // Check if all cash parts have sufficient received amount (incluyendo propina)
  const cashPartsReady = Array.from({ length: numParts }, (_, i) => {
    const s = partStates[i];
    if (s.method !== 'cash') return true;
    const received = parseMoneyInput(s.receivedInput);
    return received >= getPartGrandTotal(i);
  }).every(Boolean);

  const buildParts = (): SplitPartResult[] =>
    Array.from({ length: numParts }, (_, i) => {
      const units = getPartUnits(i);
      const grouped = new Map<string, { dishId: string; quantity: number; notes?: string }>();
      units.forEach(u => {
        const key = `${u.dishId}|${u.notes ?? ''}`;
        const ex  = grouped.get(key);
        if (ex) ex.quantity++;
        else grouped.set(key, { dishId: u.dishId, quantity: 1, notes: u.notes });
      });
      const s        = partStates[i];
      const received = s.method === 'cash' ? parseMoneyInput(s.receivedInput) : undefined;
      return { paymentMethod: s.method, items: Array.from(grouped.values()), montoRecibido: received, propina: getPartTip(i) };
    });

  const handleConfirm = () => {
    if (nequiNumber.trim()) localStorage.setItem(NEQUI_LS_KEY, nequiNumber.trim());
    onConfirm(buildParts());
  };

  if (maxParts < 2) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm z-10 p-8 text-center">
          <Scissors className="mx-auto mb-4 text-neutral-400" size={40} />
          <h3 className="text-lg font-bold text-neutral-900 mb-2">No se puede separar</h3>
          <p className="text-neutral-500 text-sm mb-6">La cuenta tiene un solo ítem.</p>
          <button onClick={onClose}
            className="w-full py-2.5 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-700 transition-colors">
            Cerrar
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{   opacity: 0, scale: 0.95, y: 10  }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col z-10 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-neutral-200 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            {step === 'pay' && (
              <button onClick={() => setStep('assign')}
                className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors">
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <Scissors size={18} /> Separar Cuenta — Mesa {tableNum}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                {step === 'assign' ? 'Paso 1: Asigna los ítems' : 'Paso 2: Cobra cada parte'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex border-b border-neutral-200 flex-shrink-0 bg-neutral-50">
          {(['assign', 'pay'] as SplitStep[]).map((s, idx) => (
            <div key={s} className={clsx(
              'flex-1 py-2.5 text-center text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors',
              step === s ? 'bg-white text-neutral-900 border-b-2 border-neutral-900' : 'text-neutral-400'
            )}>
              <span className={clsx(
                'w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0',
                step === s ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-500'
              )}>{idx + 1}</span>
              {s === 'assign' ? 'Asignar ítems' : 'Cobrar partes'}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <AnimatePresence mode="wait">

            {/* ── STEP 1: ASSIGN ── */}
            {step === 'assign' && (
              <motion.div key="assign"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}
                className="flex-1 flex flex-col min-h-0">

                {/* Num-parts control */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-neutral-100 flex-shrink-0">
                  <div>
                    <p className="text-sm font-semibold text-neutral-800">Número de partes</p>
                    <p className="text-xs text-neutral-400">Máximo {maxParts} (un ítem por parte)</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => changeNumParts(-1)} disabled={numParts <= 2}
                      className="w-9 h-9 rounded-lg border-2 border-neutral-200 flex items-center justify-center hover:border-neutral-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center text-xl font-bold text-neutral-900">{numParts}</span>
                    <button onClick={() => changeNumParts(1)} disabled={numParts >= maxParts}
                      className="w-9 h-9 rounded-lg border-2 border-neutral-200 flex items-center justify-center hover:border-neutral-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                  {expandedUnits.map(unit => {
                    const dish     = dishes.find(d => d.id === unit.dishId);
                    const assigned = assignments[unit.unitId];
                    return (
                      <div key={unit.unitId} className={clsx(
                        'flex items-center gap-4 p-3.5 rounded-xl border-2 transition-all',
                        assigned !== null ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 bg-white'
                      )}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 truncate">{dish?.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-neutral-500">{fmt(dish?.price ?? 0)}</span>
                            {unit.notes && <span className="text-xs text-amber-600 italic truncate">· "{unit.notes}"</span>}
                          </div>
                        </div>
                        <select
                          value={assigned ?? ''}
                          onChange={e => setAssignment(unit.unitId, e.target.value === '' ? null : Number(e.target.value))}
                          className={clsx(
                            'flex-shrink-0 text-sm rounded-lg border-2 px-2 py-1.5 font-medium focus:outline-none cursor-pointer transition-all',
                            assigned !== null
                              ? 'border-neutral-900 bg-neutral-900 text-white'
                              : 'border-neutral-300 bg-white text-neutral-600 hover:border-neutral-500'
                          )}
                        >
                          <option value="">Sin asignar</option>
                          {Array.from({ length: numParts }, (_, i) => (
                            <option key={i} value={i}>Parte {i + 1}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between flex-shrink-0">
                  <span className={clsx('text-sm font-medium', allAssigned ? 'text-green-600' : 'text-neutral-400')}>
                    {allAssigned
                      ? `✓ ${expandedUnits.length} ítems asignados`
                      : `${expandedUnits.filter(u => assignments[u.unitId] === null).length} sin asignar`}
                  </span>
                  <button
                    onClick={() => { setActivePart(0); setStep('pay'); }}
                    disabled={!allAssigned}
                    className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-xl font-bold text-sm hover:bg-neutral-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Continuar <ChevronRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: PAY ── */}
            {step === 'pay' && (
              <motion.div key="pay"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.18 }}
                className="flex-1 flex flex-col min-h-0">

                {/* Tab bar */}
                <div className="flex-shrink-0 bg-neutral-100 px-4 pt-3 flex gap-1 border-b border-neutral-300 overflow-x-auto">
                  {Array.from({ length: numParts }, (_, i) => {
                    const isActive  = activePart === i;
                    const partTotal = getPartGrandTotal(i);
                    const s         = partStates[i];
                    const received  = parseMoneyInput(s.receivedInput);
                    const partReady = s.method !== 'cash' || received >= partTotal;
                    return (
                      <button key={i} onClick={() => setActivePart(i)}
                        className={clsx(
                          'flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-semibold transition-all border border-b-0',
                          isActive
                            ? 'bg-white text-neutral-900 border-neutral-300 shadow-sm z-10 -mb-px pb-[calc(0.625rem+1px)]'
                            : 'bg-neutral-200 text-neutral-500 border-transparent hover:bg-neutral-50 hover:text-neutral-700'
                        )}>
                        <span className={clsx(
                          'w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0',
                          partReady ? 'bg-green-600 text-white' : isActive ? 'bg-neutral-900 text-white' : 'bg-neutral-400 text-white'
                        )}>
                          {partReady ? '✓' : i + 1}
                        </span>
                        <span>Parte {i + 1}</span>
                        <span className={clsx('text-xs font-normal', isActive ? 'text-neutral-500' : 'text-neutral-400')}>
                          {fmt(partTotal)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Active part */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <AnimatePresence mode="wait">
                    <motion.div key={activePart}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
                      className="space-y-5">

                      {/* Items */}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Ítems</p>
                        <div className="space-y-2">
                          {getPartUnits(activePart).map(unit => {
                            const dish = dishes.find(d => d.id === unit.dishId);
                            return (
                              <div key={unit.unitId} className="flex justify-between items-center bg-neutral-50 rounded-xl px-4 py-2.5">
                                <div>
                                  <span className="text-sm font-semibold text-neutral-900">{dish?.name}</span>
                                  {unit.notes && <p className="text-xs text-amber-600 italic mt-0.5">"{unit.notes}"</p>}
                                </div>
                                <span className="text-sm font-medium text-neutral-700 ml-4">{fmt(dish?.price ?? 0)}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between items-center mt-3 px-1">
                          <span className="text-sm text-neutral-500">Subtotal parte {activePart + 1}</span>
                          <span className="font-medium text-neutral-700">{fmt(getPartTotal(activePart))}</span>
                        </div>
                        {getPartTip(activePart) > 0 && (
                          <div className="flex justify-between items-center px-1">
                            <span className="text-sm text-neutral-500">Propina</span>
                            <span className="font-medium text-neutral-700">{fmt(getPartTip(activePart))}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center px-1">
                          <span className="text-sm font-semibold text-neutral-700">Total parte {activePart + 1}</span>
                          <span className="text-lg font-bold text-neutral-900">{fmt(getPartGrandTotal(activePart))}</span>
                        </div>
                      </div>

                      <TipSelector
                        subtotal={getPartTotal(activePart)}
                        tipInput={partStates[activePart].tipInput}
                        onChange={v => updatePart(activePart, { tipInput: v })}
                      />

                      {/* Method */}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Método de pago</p>
                        <PaymentMethodSelector
                          value={partStates[activePart].method}
                          onChange={m => updatePart(activePart, { method: m, receivedInput: '' })}
                        />
                      </div>

                      {/* Conditional flow per method */}
                      <AnimatePresence mode="wait">
                        {partStates[activePart].method === 'cash' && (
                          <motion.div key="cash" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="space-y-3">
                            <div>
                              <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 block mb-2">
                                Monto recibido
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">$</span>
                                <input
                                  type="number"
                                  min={0}
                                  placeholder="0"
                                  value={partStates[activePart].receivedInput}
                                  onChange={e => updatePart(activePart, { receivedInput: e.target.value })}
                                  className="w-full pl-8 pr-4 py-3 border-2 border-neutral-200 rounded-xl text-lg font-bold focus:outline-none focus:border-neutral-900 transition-colors"
                                />
                              </div>
                            </div>
                            {(() => {
                              const received = parseMoneyInput(partStates[activePart].receivedInput);
                              const ready    = received >= getPartGrandTotal(activePart);
                              return (
                                <div className={clsx(
                                  'flex justify-between items-center px-4 py-3 rounded-xl transition-all',
                                  ready ? 'bg-green-50 border border-green-200' : 'bg-neutral-50 border border-neutral-200'
                                )}>
                                  <span className={clsx('text-sm font-semibold', ready ? 'text-green-700' : 'text-neutral-400')}>Vuelto</span>
                                  <span className={clsx('text-xl font-bold', ready ? 'text-green-700' : 'text-neutral-300')}>
                                    {ready ? fmt(received - getPartGrandTotal(activePart)) : '—'}
                                  </span>
                                </div>
                              );
                            })()}
                          </motion.div>
                        )}

                        {partStates[activePart].method === 'card' && (
                          <motion.div key="card" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-4">
                              <CreditCard className="text-blue-600 flex-shrink-0" size={22} />
                              <div>
                                <p className="text-sm font-bold text-blue-900">Cobra {fmt(getPartGrandTotal(activePart))} en el datafono</p>
                                <p className="text-xs text-blue-600 mt-0.5">Confirma cuando el terminal apruebe</p>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {partStates[activePart].method === 'transfer' && (
                          <motion.div key="transfer" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="space-y-3">
                            <div>
                              <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 block mb-2">
                                Número Nequi / Daviplata del negocio
                              </label>
                              <div className="relative">
                                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={15} />
                                <input
                                  type="tel"
                                  placeholder="300 123 4567"
                                  value={nequiNumber}
                                  onChange={e => setNequiNumber(e.target.value)}
                                  className="w-full pl-9 pr-4 py-2.5 border-2 border-neutral-200 rounded-xl text-sm font-medium focus:outline-none focus:border-neutral-900 transition-colors"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-4">
                              <Smartphone className="text-purple-600 flex-shrink-0" size={22} />
                              <div>
                                <p className="text-sm font-bold text-purple-900">El cliente transfiere {fmt(getPartGrandTotal(activePart))}</p>
                                <p className="text-xs text-purple-600 mt-0.5">Confirma cuando veas el dinero en tu app</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Next part hint */}
                      {activePart < numParts - 1 && (
                        <button onClick={() => setActivePart(activePart + 1)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-neutral-200 text-neutral-400 rounded-xl text-sm hover:border-neutral-400 hover:text-neutral-600 transition-colors">
                          Ir a Parte {activePart + 2} <ChevronRight size={15} />
                        </button>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Pay footer */}
                <div className="px-6 py-4 border-t border-neutral-200 flex-shrink-0">
                  <div className="flex justify-between items-center mb-4 text-sm">
                    <span className="text-neutral-500">{numParts} partes · Total{Array.from({ length: numParts }, (_, i) => getPartTip(i)).some(t => t > 0) ? ' (con propinas)' : ''}</span>
                    <span className="font-bold text-neutral-900">
                      {fmt(Array.from({ length: numParts }, (_, i) => getPartGrandTotal(i)).reduce((a, b) => a + b, 0))}
                    </span>
                  </div>
                  {!cashPartsReady && (
                    <p className="text-xs text-amber-600 mb-3 text-center">
                      Ingresa el monto recibido en las partes que pagan en efectivo
                    </p>
                  )}
                  <button
                    onClick={handleConfirm}
                    disabled={!cashPartsReady}
                    className={clsx(
                      'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-colors',
                      cashPartsReady
                        ? 'bg-neutral-900 text-white hover:bg-neutral-700'
                        : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                    )}
                  >
                    <CreditCard size={18} />
                    Confirmar y Cobrar {numParts} Partes
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// ─── RatingModal ──────────────────────────────────────────────────────────────

function RatingModal({ onSkip, onSubmit }: { onSkip: () => void; onSubmit: (stars: number, comment: string) => void }) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment, setComment] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-neutral-900 px-6 py-5 text-center">
          <div className="flex justify-center mb-2">
            <CheckCircle2 size={32} className="text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white">¡Pago confirmado!</h2>
          <p className="text-neutral-400 text-sm mt-1">¿Cómo califica el servicio?</p>
        </div>

        {/* Stars */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex justify-center gap-2 mb-5">
            {[1, 2, 3, 4, 5].map(star => {
              const filled = star <= (hovered || selected);
              return (
                <button
                  key={star}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setSelected(star)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                  aria-label={`${star} estrellas`}
                >
                  <Star
                    size={40}
                    className={clsx('transition-colors', filled ? 'text-amber-400' : 'text-neutral-200')}
                    fill={filled ? 'currentColor' : 'none'}
                  />
                </button>
              );
            })}
          </div>

          {selected > 0 && (
            <p className="text-center text-sm font-semibold text-neutral-700 mb-4">
              {['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][selected]}
            </p>
          )}

          {/* Optional comment */}
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Comentario opcional..."
            rows={2}
            className="w-full text-sm px-3 py-2 border-2 border-neutral-200 rounded-xl resize-none focus:outline-none focus:border-neutral-400 placeholder-neutral-300"
          />
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            disabled={selected === 0}
            onClick={() => onSubmit(selected, comment)}
            className={clsx(
              'w-full py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2',
              selected > 0
                ? 'bg-neutral-900 text-white hover:bg-neutral-700'
                : 'bg-neutral-100 text-neutral-300 cursor-not-allowed'
            )}
          >
            <Star size={16} fill={selected > 0 ? 'currentColor' : 'none'} />
            Enviar calificación
          </button>
          <button
            onClick={onSkip}
            className="w-full py-2.5 rounded-xl font-medium text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-colors text-sm"
          >
            Omitir
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

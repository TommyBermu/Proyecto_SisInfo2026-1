import React, { useState } from 'react';
import { CreditCard, DollarSign, Receipt, Calculator, TrendingUp, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useRestaurant } from '../context/RestaurantContext';

export default function CashierView() {
  const { orders, tables, dishes } = useRestaurant();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');

  // Filtrar órdenes pendientes de pago
  const pendingPaymentOrders = orders.filter(o => o.status === 'ready' || o.status === 'completed');

  // Calcular totales del día
  const totalSales = orders.reduce((acc, order) => acc + order.total, 0);
  const completedOrders = orders.filter(o => o.status === 'completed').length;

  const getTableNumber = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    return table ? table.number : 'N/A';
  };

  const getDishName = (dishId: string) => {
    const dish = dishes.find(d => d.id === dishId);
    return dish ? dish.name : 'Desconocido';
  };

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden bg-neutral-50 p-6">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Caja</h1>
          <p className="text-neutral-600">Gestión de pagos y cierre de cuentas</p>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-6 overflow-hidden">
          {/* Panel izquierdo: Resumen del día */}
          <div className="col-span-1 space-y-6 overflow-y-auto">
            {/* Tarjetas de resumen */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign size={24} />
                <span className="text-sm font-medium opacity-90">Total Ventas Hoy</span>
              </div>
              <p className="text-4xl font-bold">S/ {totalSales.toFixed(2)}</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="text-blue-600" size={24} />
                <span className="font-semibold text-neutral-900">Estadísticas del Día</span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Órdenes Completadas</span>
                  <span className="font-bold text-neutral-900">{completedOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Órdenes Totales</span>
                  <span className="font-bold text-neutral-900">{orders.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Ticket Promedio</span>
                  <span className="font-bold text-neutral-900">
                    S/ {orders.length > 0 ? (totalSales / orders.length).toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>
            </div>

            {/* Métodos de pago */}
            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <Calculator className="text-purple-600" size={24} />
                <span className="font-semibold text-neutral-900">Método de Pago</span>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedPaymentMethod('cash')}
                  className={`w-full p-3 rounded-lg border-2 transition-all ${
                    selectedPaymentMethod === 'cash'
                      ? 'border-neutral-900 bg-neutral-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <DollarSign size={20} />
                    <span className="font-medium">Efectivo</span>
                  </div>
                </button>
                <button
                  onClick={() => setSelectedPaymentMethod('card')}
                  className={`w-full p-3 rounded-lg border-2 transition-all ${
                    selectedPaymentMethod === 'card'
                      ? 'border-neutral-900 bg-neutral-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard size={20} />
                    <span className="font-medium">Tarjeta</span>
                  </div>
                </button>
                <button
                  onClick={() => setSelectedPaymentMethod('transfer')}
                  className={`w-full p-3 rounded-lg border-2 transition-all ${
                    selectedPaymentMethod === 'transfer'
                      ? 'border-neutral-900 bg-neutral-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Receipt size={20} />
                    <span className="font-medium">Transferencia</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Panel derecho: Órdenes pendientes de pago */}
          <div className="col-span-2 bg-white rounded-xl shadow-md overflow-hidden flex flex-col">
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
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            order.status === 'ready' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {order.status === 'ready' ? 'Lista' : 'Servida'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-neutral-600">
                          <Clock size={14} />
                          <span>{new Date(order.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-neutral-900">S/ {order.total.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-neutral-700">
                            {item.quantity}x {getDishName(item.dishId)}
                          </span>
                          <span className="font-medium text-neutral-900">
                            S/ {((dishes.find(d => d.id === item.dishId)?.price || 0) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button className="w-full bg-neutral-900 text-white py-3 rounded-lg font-medium hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2">
                      <CreditCard size={20} />
                      <span>Procesar Pago ({selectedPaymentMethod === 'cash' ? 'Efectivo' : selectedPaymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'})</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

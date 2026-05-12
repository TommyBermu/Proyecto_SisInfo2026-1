import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router';
import { RestaurantProvider } from './context/RestaurantContext';
import PublicLayout from './components/PublicLayout';
import EmployeeLayout from './components/EmployeeLayout';
import ClientView from './pages/ClientView';
import LoginView from './pages/LoginView';
import WaiterView from './pages/WaiterView';
import KitchenView from './pages/KitchenView';
import AdminView from './pages/AdminView';
import CashierView from './pages/CashierView';

const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <ClientView /> }
    ]
  },
  {
    path: "/login",
    element: <LoginView />
  },
  {
    path: "/empleado",
    element: <EmployeeLayout />,
    children: [
      { path: "mesero", element: <WaiterView /> },
      { path: "cocina", element: <KitchenView /> },
      { path: "administrador", element: <AdminView /> },
      { path: "cajero", element: <CashierView /> },
      { path: "*", element: <Navigate to="/login" replace /> }
    ]
  },
  { path: "*", element: <Navigate to="/" replace /> }
]);

export default function App() {
  return (
    <RestaurantProvider>
      <RouterProvider router={router} />
    </RestaurantProvider>
  );
}

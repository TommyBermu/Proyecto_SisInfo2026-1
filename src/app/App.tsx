import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router';
import { RestaurantProvider } from './context/RestaurantContext';
import { AuthProvider } from './context/AuthContext';
import PublicLayout from './components/PublicLayout';
import EmployeeLayout from './components/EmployeeLayout';
import RoleGate from './components/RoleGate';
import ClientView from './pages/ClientView';
import LoginView from './pages/LoginView';
import SetPasswordView from './pages/SetPasswordView';
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
    path: "/set-password",
    element: <SetPasswordView />
  },
  {
    path: "/empleado",
    element: <EmployeeLayout />,
    children: [
      {
        path: "mesero",
        element: (
          <RoleGate allow={["waiter"]}>
            <WaiterView />
          </RoleGate>
        )
      },
      {
        path: "cocina",
        element: (
          <RoleGate allow={["kitchen"]}>
            <KitchenView />
          </RoleGate>
        )
      },
      {
        path: "administrador",
        element: (
          <RoleGate allow={["admin"]}>
            <AdminView />
          </RoleGate>
        )
      },
      {
        path: "cajero",
        element: (
          <RoleGate allow={["cashier"]}>
            <CashierView />
          </RoleGate>
        )
      },
      { path: "*", element: <Navigate to="/login" replace /> }
    ]
  },
  { path: "*", element: <Navigate to="/" replace /> }
]);

export default function App() {
  return (
    <AuthProvider>
      <RestaurantProvider>
        <RouterProvider router={router} />
      </RestaurantProvider>
    </AuthProvider>
  );
}

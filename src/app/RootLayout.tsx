import { Outlet, Link, useLocation } from "react-router";
import { LayoutDashboard, UtensilsCrossed, ChefHat, Users } from "lucide-react";
import clsx from "clsx";

export default function RootLayout() {
  const location = useLocation();
  const isPublic = !location.pathname.startsWith('/waiter') && 
                   !location.pathname.startsWith('/kitchen') && 
                   !location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      {/* Simulation Bar - Just for demo purposes to switch views easily */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-neutral-900 text-white text-xs py-1 px-4 flex justify-between items-center">
        <span className="opacity-50">Sistema Gestión Restaurante (Demo)</span>
        <div className="flex gap-4">
          <Link to="/" className={clsx("hover:text-emerald-400", location.pathname === "/" && "text-emerald-400")}>Vista Cliente</Link>
          <Link to="/waiter" className={clsx("hover:text-emerald-400", location.pathname.startsWith("/waiter") && "text-emerald-400")}>Vista Mesero</Link>
          <Link to="/kitchen" className={clsx("hover:text-emerald-400", location.pathname.startsWith("/kitchen") && "text-emerald-400")}>Vista Cocina</Link>
          <Link to="/admin" className={clsx("hover:text-emerald-400", location.pathname.startsWith("/admin") && "text-emerald-400")}>Vista Admin</Link>
        </div>
      </div>
      
      <div className="pt-8 h-full">
        <Outlet />
      </div>
    </div>
  );
}

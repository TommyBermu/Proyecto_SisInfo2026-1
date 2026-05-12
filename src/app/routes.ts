import { createBrowserRouter } from "react-router";
import RootLayout from "./RootLayout";
import ClientView from "./views/ClientView";
import ClientMenuView from "./views/ClientMenuView";
import ClientReservationsView from "./views/ClientReservationsView";
import WaiterView from "./views/WaiterView";
import KitchenView from "./views/KitchenView";
import AdminView from "./views/AdminView";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: ClientView },
      { path: "menu", Component: ClientMenuView },
      { path: "reservas", Component: ClientReservationsView },
      { path: "waiter", Component: WaiterView },
      { path: "kitchen", Component: KitchenView },
      { path: "admin", Component: AdminView },
    ],
  },
]);

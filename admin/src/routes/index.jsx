import AdminLayout from "../layouts/AdminLayout";
import AuthLayout from "../layouts/AuthLayout";
import RequireAdmin from "../components/RequireAdmin";
import GuestOnly from "../components/GuestOnly";

import Dashboard from "../pages/Dashboard";
import Products from "../pages/Products";
import Categories from "../pages/Categories";
import Orders from "../pages/Orders";
import Users from "../pages/Users";
import Comments from "../pages/Comments";
import Login from "../pages/Login";
import NotFound from "../pages/NotFound";

/**
 * Poora routing yahan ek jagah — App.jsx sirf isay `useRoutes()` ko de deta hai.
 *
 *   AuthLayout + GuestOnly -> /login (logged-in admin ko dashboard bhej dete hain)
 *   RequireAdmin + AdminLayout -> baqi sab, sirf role === "admin" ke liye
 */
export const routes = [
  {
    element: <GuestOnly />,
    children: [
      {
        element: <AuthLayout />,
        children: [{ path: "login", element: <Login /> }],
      },
    ],
  },
  {
    element: <RequireAdmin />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: "products", element: <Products /> },
          { path: "categories", element: <Categories /> },
          { path: "orders", element: <Orders /> },
          { path: "users", element: <Users /> },
          { path: "comments", element: <Comments /> },
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
];

export default routes;

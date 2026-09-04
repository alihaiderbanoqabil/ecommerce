import { useRoutes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import routes from "./routes";
import RealtimeListener from "./components/RealtimeListener";

// App ka kaam sirf itna: routes/index.jsx wali list ko render karna
export default function App() {
  const element = useRoutes(routes);

  return (
    <>
      {/* Socket.IO listener — koi UI nahi, sirf events sunta hai */}
      <RealtimeListener />
      {element}
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
    </>
  );
}

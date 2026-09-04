import { useRoutes } from "react-router-dom";
import routes from "./routes";
import RealtimeListener from "./components/RealtimeListener";

// App ka kaam sirf itna: routes/index.jsx wali list ko render karna,
// aur socket listener ko ek jagah mount rakhna
export default function App() {
  const element = useRoutes(routes);

  return (
    <>
      <RealtimeListener />
      {element}
    </>
  );
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { App as AntApp, ConfigProvider, unstableSetRender } from "antd";
import { store } from "./store";
import App from "./App";
import "./index.css";

/**
 * antd v5 apne portals (wave effect, message holder) ko legacy ReactDOM.render
 * se mount karta hai, jo React 19 mein maujood nahi — is liye wo console par
 * compatibility warning deta hai. Yahan usay React 19 ka createRoot de dete
 * hain (yehi kaam official @ant-design/v5-patch-for-react-19 karta hai).
 */
unstableSetRender((node, container) => {
  container._reactRoot ||= createRoot(container);
  const root = container._reactRoot;
  root.render(node);

  return async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    root.unmount();
  };
});

// AntApp (antd ka <App>) wrapper zaroori hai — uske bagair App.useApp() se
// message/modal nahi milte aur static antd.message React 19 par kaam nahi karta.
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ConfigProvider theme={{ token: { colorPrimary: "#4f46e5", borderRadius: 8 } }}>
          <AntApp>
            <App />
          </AntApp>
        </ConfigProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>
);

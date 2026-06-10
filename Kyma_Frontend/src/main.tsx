import ReactDOM from "react-dom/client";
import App from "./App";
import "./presentation/stores/themeStore"; // triggers applyTheme on load
import { logger } from "./services/logger";
import ErrorBoundary from "./presentation/components/ErrorBoundary";
import { useFontStore } from "./presentation/stores/fontStore";

// Initialize logger on app start
logger.logInfo("App initializing", { version: "0.1.0" });

// Initialize font store and load from backend
const initFont = async () => {
  const fontStore = useFontStore.getState();
  await fontStore.loadFromBackend();
  fontStore.applyFont();
  logger.logInfo("Font initialized", { font: fontStore.selectedFont });
};

initFont();

// Log unhandled errors that happen before React mounts
window.addEventListener("error", (event) => {
  logger.logError("Window error before mount", {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  logger.logError("Unhandled promise rejection before mount", {
    reason: event.reason,
  });
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  logger.logError("Root element not found", {});
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

logger.logInfo("App rendered successfully");

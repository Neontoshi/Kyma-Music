// Kyma_Frontend/src/presentation/components/ErrorBoundary.tsx
import React from "react";
import { logger } from "../../services/logger";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Component crashed:", error, errorInfo);
    logger.logError("React component error", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center",
            gap: 16,
            background: "var(--bg)",
            color: "var(--text)",
          }}
        >
          <div style={{ fontSize: 48 }}>💥</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>
            Something went wrong
          </div>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 12,
              color: "var(--text3)",
              maxWidth: 500,
            }}
          >
            {this.state.error?.message || "An unexpected error occurred"}
          </div>
          <button
            onClick={() => {
              logger.logInfo("Manual reload triggered after error");
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: "10px 24px",
              borderRadius: 99,
              background:
                "linear-gradient(135deg, var(--accent), var(--accent2))",
              border: "none",
              color: "#fff",
              fontFamily: "'Syne', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

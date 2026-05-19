import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", color: "red", backgroundColor: "white", minHeight: "100vh" }}>
          <h1>Something went wrong.</h1>
          <p>Please provide this error message to the AI:</p>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f8d7da", padding: "10px", border: "1px solid #f5c6cb", borderRadius: "5px" }}>
            {this.state.error?.message}
          </pre>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f8d7da", padding: "10px", marginTop: "10px", fontSize: "12px", border: "1px solid #f5c6cb", borderRadius: "5px"  }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

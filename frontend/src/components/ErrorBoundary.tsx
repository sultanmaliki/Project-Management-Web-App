import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./ui/button";

interface State {
  failed: boolean;
}

/** Last line of defence: a render error shows a recovery screen instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center" role="alert">
        <h1 className="text-2xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="text-slate-600 max-w-md">An unexpected error occurred. Reloading the page usually fixes it.</p>
        <Button onClick={() => window.location.reload()}>Reload page</Button>
      </div>
    );
  }
}

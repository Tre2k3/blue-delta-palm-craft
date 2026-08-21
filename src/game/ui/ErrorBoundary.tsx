import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { err: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error) {
    return { err };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    if (typeof console !== "undefined") console.error("[sack]", err, info.componentStack);
  }

  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="flex h-full w-full items-center justify-center bg-bg px-6 text-fg">
        <div className="max-w-md rounded-2xl border border-border bg-surface p-6 text-center shadow-2xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-gold">$ackReligious · Memphis</p>
          <h1 className="font-display mt-2 text-4xl text-fg">We couldn't load Memphis</h1>
          <p className="mt-3 text-sm text-muted">
            The Drop Day world failed to start. Retry to boot again. Your save stays on this device.
          </p>
          <button
            type="button"
            className="mt-6 min-h-12 w-full rounded-xl bg-primary font-display text-2xl text-primary-fg"
            onClick={() => {
              this.setState({ err: null });
              window.location.reload();
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
}

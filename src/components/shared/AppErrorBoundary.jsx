import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.error("[AppErrorBoundary]", error);
  }

  render() {
    const err = this.state.error;
    if (!err) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-2xl w-full rounded-2xl border border-border bg-card p-6 space-y-3">
          <h1 className="text-lg font-semibold text-foreground">
            Erro ao carregar a página
          </h1>
          <p className="text-sm text-muted-foreground">
            Um erro JavaScript impediu a interface de renderizar.
          </p>
          <pre className="text-xs whitespace-pre-wrap rounded-xl bg-muted/40 p-3 border border-border overflow-auto max-h-[40vh]">
            {String(err?.message || err)}
          </pre>
          <button
            type="button"
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-primary text-primary-foreground font-semibold"
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }
}


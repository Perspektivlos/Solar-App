import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6 text-rose-200 shadow-xl backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-rose-500/20 p-3 text-rose-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="text-lg font-bold text-rose-300">
                {this.props.fallbackTitle || 'Fehler beim Laden dieser Ansicht'}
              </h3>
              <p className="text-sm text-rose-200/80">
                Die Komponente konnte nicht gerendert werden. Möglicherweise fehlen Telemetriedaten oder ein Messwert ist ungültig.
              </p>
              {this.state.error?.message && (
                <pre className="rounded bg-black/40 p-3 text-xs text-rose-400 font-mono overflow-x-auto">
                  {this.state.error.message}
                </pre>
              )}
              <div className="pt-2">
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-600/30 px-4 py-2 text-xs font-semibold text-rose-200 border border-rose-500/40 hover:bg-rose-600/40 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Erneut versuchen
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

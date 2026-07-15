import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Terminal } from 'lucide-react';
import { Button } from '@/src/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SafeSide ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
          <div className="max-w-2xl w-full space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight">System Malfunction</h1>
                <p className="text-xs text-zinc-500 font-mono">SafeSide Terminal Error</p>
              </div>
            </div>
            <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="w-4 h-4 text-zinc-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Error Log</span>
              </div>
              <pre className="text-xs font-mono text-red-400 overflow-auto max-h-60 whitespace-pre-wrap">
                {this.state.error?.message || 'Unknown error'}
              </pre>
            </div>
            <Button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="bg-white text-black hover:bg-zinc-200 font-black uppercase tracking-wider"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reinitialize System
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

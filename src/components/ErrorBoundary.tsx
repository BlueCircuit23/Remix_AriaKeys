import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'Error inesperado en el motor de estudio',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Atelier ErrorBoundary caught an error:', error, errorInfo);
  }

  public componentDidMount() {
    // Prevent unhandled promise rejections or external audio/midi permission errors from crashing the UI
    window.addEventListener('unhandledrejection', (event) => {
      // Prevent browser default logging if harmless or already handled
      if (
        event.reason?.name === 'SecurityError' ||
        event.reason?.message?.includes?.('AudioContext') ||
        event.reason?.message?.includes?.('midi')
      ) {
        event.preventDefault();
      }
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#111319] text-[#e1e2ea] flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#191c21] border border-[#232e42] shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#ea9f00]/15 border border-[#ea9f00]/30 flex items-center justify-center text-[#ffbd58]">
              <span className="material-symbols-outlined text-3xl">piano</span>
            </div>
            <h2 className="font-headline text-lg font-bold text-white">
              Recuperación del Estudio AriaKeys
            </h2>
            <p className="font-telemetry text-xs text-[#bbc9cf] leading-relaxed">
              El motor de audio se ha protegido automáticamente contra un conflicto del navegador. Haz clic para restablecer la sesión.
            </p>
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#00d2ff] to-[#0095ff] text-[#003544] font-headline text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              Reiniciar Estudio de Piano
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

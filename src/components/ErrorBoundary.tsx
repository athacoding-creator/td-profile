import React from "react";
import { Button } from "./ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 rounded-full bg-destructive/10 p-3">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="mb-2 text-xl font-bold">Terjadi Kesalahan</h2>
          <p className="mb-6 text-muted-foreground">
            Maaf, aplikasi mengalami kendala teknis saat memuat halaman ini.
          </p>
          <div className="flex gap-3">
            <Button 
              onClick={() => window.location.reload()}
              variant="default"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Muat Ulang
            </Button>
            <Button 
              onClick={() => this.setState({ hasError: false })}
              variant="outline"
            >
              Coba Lagi
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-8 max-w-full overflow-auto rounded bg-muted p-4 text-left text-xs text-destructive">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

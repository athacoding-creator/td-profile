import React from "react";
import { Button } from "./ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  resetKey?: string;
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
    // Chunk load failures happen after deploys when old JS references stale chunks.
    // Auto-reload once to fetch the latest bundle instead of showing a scary screen.
    const msg = String(error?.message || "");
    const name = String((error as any)?.name || "");
    if (
      /Loading chunk [\d]+ failed/i.test(msg) ||
      /Loading CSS chunk/i.test(msg) ||
      /Failed to fetch dynamically imported module/i.test(msg) ||
      /Importing a module script failed/i.test(msg) ||
      name === "ChunkLoadError"
    ) {
      try {
        const key = "__td_chunk_reload__";
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          window.location.reload();
        }
      } catch {
        window.location.reload();
      }
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: undefined });
    }
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

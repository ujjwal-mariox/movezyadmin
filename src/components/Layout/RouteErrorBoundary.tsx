import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";

/**
 * Catches anything a page throws while rendering.
 *
 * Without this, a single render error unmounts the whole React tree and the
 * admin becomes a blank white screen with no way back except a manual reload —
 * which reads to an operator as "the page won't open". The two ways that
 * happened here:
 *
 *  1. A page threw while rendering (bad shape in an API response, etc.).
 *  2. A lazy route chunk 404'd. After a redeploy the browser can still be
 *     holding the previous index.html, whose chunk filenames no longer exist,
 *     so the dynamic import rejects and Suspense never resolves. Every route
 *     the user had not yet visited breaks until a hard refresh.
 *
 * Case 2 is detected and offered a reload, since reloading genuinely fixes it.
 */

const isChunkLoadError = (error: Error | null): boolean => {
  if (!error) return false;
  const text = `${error.name} ${error.message}`.toLowerCase();
  return (
    text.includes("dynamically imported module") ||
    text.includes("importing a module script failed") ||
    text.includes("chunkloaderror") ||
    text.includes("failed to fetch dynamically")
  );
};

interface Props {
  children: React.ReactNode;
  onGoHome: () => void;
}

interface State {
  error: Error | null;
}

class ErrorBoundaryInner extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Always logged, in every build: when an admin reports a broken page this
    // is the one line that says what actually broke.
    console.error("[Admin] Page crashed:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const staleBuild = isChunkLoadError(error);

    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="w-full max-w-lg p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 text-amber-600 rounded-lg shrink-0 bg-amber-100">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900">
                {staleBuild ? "This page needs a refresh" : "This page hit an error"}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {staleBuild
                  ? "The admin panel was updated while your tab was open, so part of it could no longer be downloaded. Reloading picks up the new version."
                  : "Nothing was saved or changed. You can retry, or go back to the dashboard."}
              </p>
              {!staleBuild && (
                <p className="p-2 mt-3 font-mono text-xs text-gray-500 break-words rounded bg-gray-50">
                  {error.message || String(error)}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white rounded-lg bg-movezy-600 hover:bg-movezy-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload
                </button>
                <button
                  onClick={() => {
                    this.setState({ error: null });
                    this.props.onGoHome();
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Back to dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Keyed on the location so navigating away from a broken page clears the error
 * instead of pinning the boundary open for the rest of the session.
 */
const RouteErrorBoundary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <ErrorBoundaryInner
      key={location.pathname}
      onGoHome={() => navigate("/admin/dashboard")}
    >
      {children}
    </ErrorBoundaryInner>
  );
};

export default RouteErrorBoundary;

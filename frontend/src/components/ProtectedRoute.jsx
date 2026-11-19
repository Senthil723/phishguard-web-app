
import { useEffect, useState } from "react";
import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { getCurrentUser } from "../services/api.js";

function ProtectedRoute() {
  const [authStatus, setAuthStatus] = useState("checking");
  const location = useLocation();

  useEffect(() => {
    const controller = new AbortController();

    async function verifySession() {
      setAuthStatus("checking");

      try {
        await getCurrentUser({
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setAuthStatus("authenticated");
        }
      } catch {
        if (!controller.signal.aborted) {
          setAuthStatus("unauthenticated");
        }
      }
    }

    verifySession();

    return () => {
      controller.abort();
    };
  }, []);

  // Do not display private pages during verification.
  if (authStatus === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

          <p className="text-sm font-medium text-slate-600">
            Verifying your PhishGuard session...
          </p>
        </div>
      </div>
    );
  }

  // No valid session: return to Login.
  if (authStatus === "unauthenticated") {
    return (
      <Navigate
        to="/"
        replace
        state={{ from: location }}
      />
    );
  }

  // Valid session: allow access to nested routes.
  return <Outlet />;
}

export default ProtectedRoute;

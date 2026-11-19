
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./Login.jsx";
import Signup from "./pages/Signup.jsx";

import AppLayout from "./components/AppLayout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import URLScanner from "./pages/URLScanner.jsx";
import ScanResults from "./pages/ScanResults.jsx";
import ScanHistory from "./pages/ScanHistory.jsx";
import ReportsAnalytics from "./pages/ReportsAnalytics.jsx";
import Settings from "./pages/Settings.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Login page */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* All private pages require authentication */}
        <Route element={<ProtectedRoute />}>

          {/* Existing PhishGuard layout */}
          <Route element={<AppLayout />}>

            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/scanner"
              element={<URLScanner />}
            />

            <Route
              path="/results"
              element={<ScanResults />}
            />

            <Route
              path="/results/:scanId"
              element={<ScanResults />}
            />

            <Route
              path="/history"
              element={<ScanHistory />}
            />

            <Route
              path="/reports"
              element={<ReportsAnalytics />}
            />

            <Route
              path="/settings"
              element={<Settings />}
            />

          </Route>
        </Route>

        {/* Unknown routes redirect to Dashboard.
            ProtectedRoute checks authentication. */}
        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login.jsx";
import AppLayout from "./components/AppLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import URLScanner from "./pages/URLScanner.jsx";
import ScanResults from "./pages/ScanResults.jsx";
import ScanHistory from "./pages/ScanHistory.jsx";
import ReportsAnalytics from "./pages/ReportsAnalytics.jsx";
import SecurityInsights from "./pages/SecurityInsights.jsx";
import Settings from "./pages/Settings.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/scanner" element={<URLScanner />} />
          <Route path="/results" element={<ScanResults />} />
          <Route path="/results/:scanId" element={<ScanResults />} />
          <Route path="/history" element={<ScanHistory />} />
          <Route path="/reports" element={<ReportsAnalytics />} />
          <Route path="/insights" element={<SecurityInsights />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

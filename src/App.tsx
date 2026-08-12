import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import VoiceWorkbench from "@/pages/VoiceWorkbench";
import MarketRadar from "@/pages/MarketRadar";
import MeetingLibrary from "@/pages/MeetingLibrary";
import ProposalPage from "@/pages/ProposalPage";
import CustomerManager from "@/pages/CustomerManager";
import PerformanceReview from "@/pages/PerformanceReview";
import ReportPage from "@/pages/ReportPage";
import ProjectManagerPage from "@/pages/ProjectManagerPage";
import PlaceholderPage from "@/pages/PlaceholderPage";
import LoginPage from "@/pages/LoginPage";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/voice-workbench" replace />} />
        <Route 
          path="/voice-workbench" 
          element={
            <ProtectedRoute>
              <VoiceWorkbench />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/market-radar" 
          element={
            <ProtectedRoute>
              <MarketRadar />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/meeting-library" 
          element={
            <ProtectedRoute>
              <MeetingLibrary />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/proposal" 
          element={
            <ProtectedRoute>
              <ProposalPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/customer-manager" 
          element={
            <ProtectedRoute>
              <CustomerManager />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/performance-review" 
          element={
            <ProtectedRoute>
              <PerformanceReview />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute>
              <ReportPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/project-manager" 
          element={
            <ProtectedRoute>
              <ProjectManagerPage />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

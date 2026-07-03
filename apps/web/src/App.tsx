import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { PartnershipDetailPage } from './pages/PartnershipDetailPage';
import { PartnershipsPage } from './pages/PartnershipsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ScenarioPage } from './pages/ScenarioPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<PartnershipsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/partnerships/:id" element={<PartnershipDetailPage />} />
        <Route path="/partnerships/:partnershipId/sessions/:sessionId" element={<ScenarioPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

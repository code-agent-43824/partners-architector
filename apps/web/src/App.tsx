import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { AgreementPage } from './pages/AgreementPage';
import { LoginPage } from './pages/LoginPage';
import { AboutStep } from './pages/partnership/AboutStep';
import { PartnershipLayout } from './pages/partnership/PartnershipLayout';
import { PartnersStep } from './pages/partnership/PartnersStep';
import { SessionsStep } from './pages/partnership/SessionsStep';
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
        <Route path="/partnerships/:id" element={<PartnershipLayout />}>
          <Route index element={<AboutStep />} />
          <Route path="partners" element={<PartnersStep />} />
          <Route path="sessions" element={<SessionsStep />} />
        </Route>
        <Route path="/partnerships/:partnershipId/sessions/:sessionId" element={<ScenarioPage />} />
        <Route
          path="/partnerships/:partnershipId/sessions/:sessionId/agreement"
          element={<AgreementPage />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

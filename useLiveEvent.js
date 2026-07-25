import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';

import PublicRanking from './pages/PublicRanking';
import PublicInsights from './pages/PublicInsights';

import StaffLogin from './pages/StaffLogin';
import StaffPanel from './pages/StaffPanel';
import StaffRanking from './pages/StaffRanking';

import AthleteRegister from './pages/AthleteRegister';
import AthleteQueue from './pages/AthleteQueue';
import AthleteTimer from './pages/AthleteTimer';

export default function App() {
  return (
    <Routes>
      {/* PÚBLICO — sem login */}
      <Route path="/" element={<PublicRanking />} />
      <Route path="/insights" element={<PublicInsights />} />

      {/* STAFF — arbitragem (pontuação) */}
      <Route path="/staff/login" element={<StaffLogin role="staff" />} />
      <Route
        path="/staff/panel"
        element={
          <ProtectedRoute role="staff" redirectTo="/staff/login">
            <StaffPanel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/staff/ranking"
        element={
          <ProtectedRoute role="staff" redirectTo="/staff/login">
            <StaffRanking />
          </ProtectedRoute>
        }
      />

      {/* CONTROLE DE ATLETAS — cadastro, fila, cronômetro */}
      <Route
        path="/athlete-control/login"
        element={
          <StaffLogin
            role="athlete_control"
            title="CONTROLE — Atletas"
            redirectTo="/athlete-control/queue"
          />
        }
      />
      <Route
        path="/athlete-control/register"
        element={
          <ProtectedRoute role="athlete_control" redirectTo="/athlete-control/login">
            <AthleteRegister />
          </ProtectedRoute>
        }
      />
      <Route
        path="/athlete-control/queue"
        element={
          <ProtectedRoute role="athlete_control" redirectTo="/athlete-control/login">
            <AthleteQueue />
          </ProtectedRoute>
        }
      />
      <Route
        path="/athlete-control/timer"
        element={
          <ProtectedRoute role="athlete_control" redirectTo="/athlete-control/login">
            <AthleteTimer />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';

import Home from './pages/Home';
import PublicRanking from './pages/PublicRanking';
import PublicInsights from './pages/PublicInsights';

import StaffLogin from './pages/StaffLogin';
import StaffPanel from './pages/StaffPanel';
import StaffRanking from './pages/StaffRanking';

import AthleteRegister from './pages/AthleteRegister';
import AthleteQueue from './pages/AthleteQueue';
import AthleteTimer from './pages/AthleteTimer';
import RoundsAdmin from './pages/RoundsAdmin';

export default function App() {
  return (
    <Routes>
      {/* HOME — convite para conhecer o app Meu Beta */}
      <Route path="/" element={<Home />} />

      {/* MEU BETA COMP — PÚBLICO — sem login */}
      <Route path="/comp" element={<PublicRanking />} />
      {/* Endereco proprio por modalidade: cada telao aponta para o seu. */}
      <Route path="/comp/boulder" element={<PublicRanking categoryName="Boulder" />} />
      <Route path="/comp/lead" element={<PublicRanking categoryName="Lead" />} />
      <Route path="/comp/insights" element={<PublicInsights />} />

      {/* STAFF — arbitragem (pontuação) */}
      <Route
        path="/comp/staff/login"
        element={<StaffLogin role="staff" redirectTo="/comp/staff/panel" />}
      />
      <Route
        path="/comp/staff/panel"
        element={
          <ProtectedRoute role="staff" redirectTo="/comp/staff/login">
            <StaffPanel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/comp/staff/ranking"
        element={
          <ProtectedRoute role="staff" redirectTo="/comp/staff/login">
            <StaffRanking />
          </ProtectedRoute>
        }
      />

      {/* CONTROLE DE ATLETAS — cadastro, fases, fila, cronômetro */}
      <Route
        path="/comp/athlete-control/login"
        element={
          <StaffLogin
            role="athlete_control"
            title="CONTROLE — Atletas"
            redirectTo="/comp/athlete-control/queue"
          />
        }
      />
      <Route
        path="/comp/athlete-control/register"
        element={
          <ProtectedRoute role="athlete_control" redirectTo="/comp/athlete-control/login">
            <AthleteRegister />
          </ProtectedRoute>
        }
      />
      <Route
        path="/comp/athlete-control/rounds"
        element={
          <ProtectedRoute role="athlete_control" redirectTo="/comp/athlete-control/login">
            <RoundsAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/comp/athlete-control/queue"
        element={
          <ProtectedRoute role="athlete_control" redirectTo="/comp/athlete-control/login">
            <AthleteQueue />
          </ProtectedRoute>
        }
      />
      <Route
        path="/comp/athlete-control/timer"
        element={
          <ProtectedRoute role="athlete_control" redirectTo="/comp/athlete-control/login">
            <AthleteTimer />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

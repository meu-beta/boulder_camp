import { Navigate, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';

import Home from './pages/Home';
import CompHub from './pages/CompHub';
import ModalityPicker from './pages/ModalityPicker';
import ModalidadeGuard from './components/ModalidadeGuard';
import PublicRanking from './pages/PublicRanking';
import PublicInsights from './pages/PublicInsights';

import StaffLogin from './pages/StaffLogin';
import StaffPanel from './pages/StaffPanel';
import StaffPanelLead from './pages/StaffPanelLead';
import StaffRanking from './pages/StaffRanking';

import AthleteRegister from './pages/AthleteRegister';
import AthleteQueue from './pages/AthleteQueue';
import AthleteTimer from './pages/AthleteTimer';
import RoundsAdmin from './pages/RoundsAdmin';

import { useModalidade } from './lib/modalidade';

// ============================================================
// Duas competições, duas árvores
// ============================================================
//
//   /comp                          hub — o único lugar que vê as duas
//   /comp/boulder                  ranking (telão)
//   /comp/boulder/staff            painel de pontuação
//   /comp/boulder/controle/...     cadastro · fases · fila · cronômetro
//   /comp/guiada                   ranking (telão)
//   /comp/guiada/staff             painel de pontuação
//   /comp/guiada/controle/...      cadastro · fases · cronômetro
//
// Dentro de uma árvore não existe link para a outra. Trocar de competição
// passa obrigatoriamente pela tela de escolha, que é um gesto deliberado —
// e não um clique distraído no meio da arbitragem.

/** O painel do árbitro é a única tela cujo miolo muda com a modalidade. */
function PainelDoArbitro() {
  const mod = useModalidade();
  return mod.slug === 'guiada' ? <StaffPanelLead /> : <StaffPanel />;
}

/** A fila é o rodízio entre blocos; na Guiada não existe. */
function FilaDaModalidade() {
  const mod = useModalidade();
  if (!mod.temFila) return <Navigate to={`/comp/${mod.slug}/controle/fases`} replace />;
  return <AthleteQueue />;
}

const staff = (element) => (
  <ProtectedRoute role="staff" redirectTo="/comp/staff/login">
    {element}
  </ProtectedRoute>
);

const controle = (element) => (
  <ProtectedRoute role="athlete_control" redirectTo="/comp/controle/login">
    {element}
  </ProtectedRoute>
);

export default function App() {
  return (
    <Routes>
      {/* HOME — convite para conhecer o app Meu Beta */}
      <Route path="/" element={<Home />} />

      {/* ---------- Geral, fora das modalidades ---------- */}
      <Route path="/comp" element={<CompHub />} />
      <Route path="/comp/insights" element={<PublicInsights />} />
      <Route path="/comp/escolher/:area" element={<ModalityPicker />} />

      {/* Um login por área, servindo as duas competições. A escolha da
          modalidade vem logo depois, na tela de escolha. */}
      <Route
        path="/comp/staff/login"
        element={<StaffLogin role="staff" redirectTo="/comp/escolher/staff" />}
      />
      <Route
        path="/comp/controle/login"
        element={
          <StaffLogin
            role="athlete_control"
            title="CONTROLE — Atletas"
            redirectTo="/comp/escolher/controle"
          />
        }
      />

      {/* ---------- Árvore de cada modalidade ---------- */}
      <Route path="/comp/:modalidade" element={<ModalidadeGuard />}>
        <Route index element={<PublicRanking />} />

        <Route path="staff" element={staff(<PainelDoArbitro />)} />
        <Route path="staff/ranking" element={staff(<StaffRanking />)} />

        <Route path="controle" element={<Navigate to="fases" replace />} />
        <Route path="controle/cadastro" element={controle(<AthleteRegister />)} />
        <Route path="controle/fases" element={controle(<RoundsAdmin />)} />
        <Route path="controle/fila" element={controle(<FilaDaModalidade />)} />
        <Route path="controle/cronometro" element={controle(<AthleteTimer />)} />
      </Route>

      {/* ---------- Endereços antigos ----------
          O telão pode estar apontado para um deles e árbitros têm links
          salvos no celular. Nada pode quebrar no meio de um evento, então
          todos continuam funcionando como redirecionamento. */}
      <Route path="/comp/lead" element={<Navigate to="/comp/guiada" replace />} />
      <Route path="/comp/staff/panel" element={<Navigate to="/comp/boulder/staff" replace />} />
      <Route path="/comp/staff/lead" element={<Navigate to="/comp/guiada/staff" replace />} />
      <Route
        path="/comp/staff/ranking"
        element={<Navigate to="/comp/boulder/staff/ranking" replace />}
      />
      <Route
        path="/comp/athlete-control/login"
        element={<Navigate to="/comp/controle/login" replace />}
      />
      <Route
        path="/comp/athlete-control/register"
        element={<Navigate to="/comp/boulder/controle/cadastro" replace />}
      />
      <Route
        path="/comp/athlete-control/register/lead"
        element={<Navigate to="/comp/guiada/controle/cadastro" replace />}
      />
      <Route
        path="/comp/athlete-control/rounds"
        element={<Navigate to="/comp/boulder/controle/fases" replace />}
      />
      <Route
        path="/comp/athlete-control/rounds/lead"
        element={<Navigate to="/comp/guiada/controle/fases" replace />}
      />
      <Route
        path="/comp/athlete-control/queue"
        element={<Navigate to="/comp/boulder/controle/fila" replace />}
      />
      <Route
        path="/comp/athlete-control/timer"
        element={<Navigate to="/comp/boulder/controle/cronometro" replace />}
      />
    </Routes>
  );
}

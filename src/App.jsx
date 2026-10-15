import { Navigate, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';

import Home from './pages/Home';
import EventList from './pages/EventList';
import EventPicker from './pages/EventPicker';
import EventoGuard from './components/EventoGuard';
import PublicRanking from './pages/PublicRanking';
import PublicInsights from './pages/PublicInsights';

import AdminEvents from './pages/AdminEvents';
import AdminEventForm from './pages/AdminEventForm';

import StaffLogin from './pages/StaffLogin';
import StaffPanel from './pages/StaffPanel';
import StaffPanelLead from './pages/StaffPanelLead';
import StaffRanking from './pages/StaffRanking';

import AthleteRegister from './pages/AthleteRegister';
import AthleteQueue from './pages/AthleteQueue';
import AthleteTimer from './pages/AthleteTimer';
import RoundsAdmin from './pages/RoundsAdmin';

import { useEventoAtual } from './lib/evento';

// ============================================================
// Uma árvore por evento
// ============================================================
//
// Antes havia duas árvores fixas, /comp/boulder e /comp/guiada, porque só
// existia uma competição de cada tipo. Agora o endereço carrega o EVENTO, e a
// modalidade é propriedade dele:
//
//   /comp                       a lista do que está acontecendo
//   /comp/e/:evento             um evento — ranking, arbitragem, controle
//   /comp/admin                 criar, editar, publicar, arquivar
//
// O EventoGuard, no topo da árvore de evento, traduz o slug no registro e o
// entrega por contexto. Nenhuma tela lá dentro precisa saber de onde ele veio.

/** O painel do árbitro é a única tela cujo miolo muda com a modalidade. */
function PainelDoArbitro() {
  const ev = useEventoAtual();
  return ev.modality === 'guiada' ? <StaffPanelLead /> : <StaffPanel />;
}

/**
 * A fila é a rotação entre blocos — faz sentido no boulder, não na guiada,
 * onde a ordem de largada é outra coisa. Em vez de esconder o link e deixar o
 * endereço quebrado, mandamos para as fases.
 */
function FilaDoEvento() {
  const ev = useEventoAtual();
  if (!ev.temFila) return <Navigate to="../fases" replace />;
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

const admin = (element) => (
  <ProtectedRoute role="admin" redirectTo="/comp/admin/login">
    {element}
  </ProtectedRoute>
);

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      {/* ---------- Geral ---------- */}
      <Route path="/comp" element={<EventList />} />
      <Route path="/comp/anteriores" element={<EventList anteriores />} />
      {/* Insights passou a ser de um evento: fora dele não há o que resumir. */}
      <Route path="/comp/insights" element={<Navigate to="/comp" replace />} />
      <Route path="/comp/escolher/:area" element={<EventPicker />} />

      {/* ---------- Portas de entrada ----------
          O login só diz QUEM você é. Em qual evento você vai trabalhar vem
          logo depois, na tela de escolha. */}
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
      <Route
        path="/comp/admin/login"
        element={<StaffLogin role="admin" title="ADMINISTRAÇÃO" redirectTo="/comp/admin" />}
      />

      {/* ---------- Administração ----------
          'novo' antes de ':evento' não é obrigatório no React Router (rota
          estática ganha da dinâmica), mas deixa a intenção visível. */}
      <Route path="/comp/admin" element={admin(<AdminEvents />)} />
      <Route path="/comp/admin/novo" element={admin(<AdminEventForm />)} />
      <Route path="/comp/admin/:evento" element={admin(<AdminEventForm />)} />

      {/* ---------- Árvore de um evento ---------- */}
      <Route path="/comp/e/:evento" element={<EventoGuard />}>
        <Route index element={<PublicRanking />} />
        <Route path="insights" element={<PublicInsights />} />

        <Route path="staff" element={staff(<PainelDoArbitro />)} />
        <Route path="staff/ranking" element={staff(<StaffRanking />)} />

        <Route path="controle" element={<Navigate to="fases" replace />} />
        <Route path="controle/cadastro" element={controle(<AthleteRegister />)} />
        <Route path="controle/fases" element={controle(<RoundsAdmin />)} />
        <Route path="controle/fila" element={controle(<FilaDoEvento />)} />
        <Route path="controle/cronometro" element={controle(<AthleteTimer />)} />
      </Route>

      {/* ---------- Endereços antigos ----------
          Antes da ideia de evento, a modalidade estava no endereço e havia uma
          competição só de cada tipo. Não há como adivinhar para QUAL evento um
          link desses apontava, então levamos para a lista — ou para a porta de
          entrada certa, quando o endereço já dizia de qual área se tratava.

          IMPORTANTE: o link do telão mudou. Quem projeta o ranking precisa
          apontar para /comp/e/<evento>. */}
      <Route path="/comp/boulder/*" element={<Navigate to="/comp" replace />} />
      <Route path="/comp/guiada/*" element={<Navigate to="/comp" replace />} />
      <Route path="/comp/lead" element={<Navigate to="/comp" replace />} />
      <Route path="/comp/staff/panel" element={<Navigate to="/comp/escolher/staff" replace />} />
      <Route path="/comp/staff/lead" element={<Navigate to="/comp/escolher/staff" replace />} />
      <Route path="/comp/staff/ranking" element={<Navigate to="/comp/escolher/staff" replace />} />
      <Route
        path="/comp/athlete-control/login"
        element={<Navigate to="/comp/controle/login" replace />}
      />
      <Route
        path="/comp/athlete-control/*"
        element={<Navigate to="/comp/escolher/controle" replace />}
      />

      <Route path="*" element={<Navigate to="/comp" replace />} />
    </Routes>
  );
}

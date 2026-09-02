import { Navigate, Outlet, useParams } from 'react-router-dom';
import { GERAL, MODALIDADES } from '../lib/modalidade';

// Porteiro da árvore de uma modalidade.
//
// `/comp/qualquercoisa` não pode virar silenciosamente o ranking do Boulder:
// alguém erraria o endereço e ficaria olhando a competição errada sem saber.
// Slug desconhecido volta para o hub, onde a escolha é explícita.
export default function ModalidadeGuard() {
  const { modalidade } = useParams();
  if (!MODALIDADES[modalidade]) return <Navigate to={GERAL.hub} replace />;
  return <Outlet />;
}

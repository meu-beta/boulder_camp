import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';

// Wrap a route element with this to require a signed-in user whose
// `profiles.role` matches `role`. Redirects to `redirectTo` otherwise.
export default function ProtectedRoute({ role, redirectTo, children }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-center text-white/70">Carregando...</div>;
  }

  if (!session || !profile || profile.role !== role) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

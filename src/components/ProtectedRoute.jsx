import { Navigate, Outlet, useLocation } from 'react-router-dom';
import LoadingState from './LoadingState';
import { useSession } from '../context/SessionContext';

export default function ProtectedRoute() {
  const location = useLocation();
  const { ready, isAuthenticated } = useSession();

  if (!ready) {
    return <LoadingState label="Restoring session…" />;
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  return <Outlet />;
}

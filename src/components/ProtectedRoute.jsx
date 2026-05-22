import { Navigate, Outlet, useLocation } from 'react-router-dom';
import LoadingState from './LoadingState';
import { useSession } from '../context/SessionContext';

export default function ProtectedRoute({ roles = [], blockedRoles = [] }) {
  const location = useLocation();
  const { ready, isAuthenticated, user } = useSession();

  if (!ready) {
    return <LoadingState label="Restoring session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate replace to="/" />;
  }

  if (blockedRoles.includes(user?.role)) {
    return <Navigate replace to={user?.role === 'ADMIN' ? '/admin' : '/'} />;
  }

  return <Outlet />;
}

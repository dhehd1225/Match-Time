import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  children: React.ReactNode;
  requireTeam?: boolean;
}

export default function ProtectedRoute({ children, requireTeam = false }: Props) {
  const { user, teams, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireTeam && teams.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

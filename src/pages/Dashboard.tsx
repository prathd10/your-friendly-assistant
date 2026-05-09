import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import OrganizerDashboard from './OrganizerDashboard';
import SponsorDashboard from './SponsorDashboard';
import ProviderDashboard from './ProviderDashboard';

const Dashboard = () => {
  const { profile, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // If we have a user but no profile yet (e.g. initial load or slow trigger), show a loading state
  if (user && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-sm text-muted-foreground animate-pulse font-medium tracking-tight">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (profile?.role === 'sponsor') return <SponsorDashboard />;
  if (profile?.role === 'performer' || profile?.role === 'vendor') return <ProviderDashboard />;
  if (profile?.role === 'creator') return <Navigate to="/creator-dashboard" replace />;
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;

  return <OrganizerDashboard />;
};

export default Dashboard;

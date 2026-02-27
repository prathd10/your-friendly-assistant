import { useAuth } from '@/contexts/AuthContext';
import OrganizerDashboard from './OrganizerDashboard';
import SponsorDashboard from './SponsorDashboard';

const Dashboard = () => {
  const { profile } = useAuth();
  if (profile?.role === 'sponsor') return <SponsorDashboard />;
  return <OrganizerDashboard />;
};

export default Dashboard;

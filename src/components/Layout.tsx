import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AIAssistant from '@/components/AIAssistant';

const Layout = () => {
  const { profile } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background overflow-x-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 max-w-full">
          <header className="h-14 flex items-center border-b border-border/50 px-4 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1 flex items-center">
              <img src="/logo%20without%20bg.png" alt="Logo" className="h-6 w-auto block md:hidden" />
            </div>
            {profile && (
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end mr-2 hidden lg:flex">
                   <span className="text-xs font-bold leading-none">{profile.full_name}</span>
                   <span className="text-[10px] text-muted-foreground capitalize leading-tight">{profile.role}</span>
                </div>
                {profile.profile_photo ? (
                  <img 
                    src={profile.profile_photo} 
                    alt={profile.full_name} 
                    className="h-8 w-8 rounded-full object-cover border border-border shrink-0"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                    {profile.full_name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>
            )}
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Outlet />
          </main>
          {profile?.role === 'organizer' && (
            <div className="fixed bottom-4 right-4 z-[100] md:bottom-8 md:right-8">
              <AIAssistant />
            </div>
          )}
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;

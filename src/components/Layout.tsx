import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Layout = () => {
  const { profile } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border/50 px-4 backdrop-blur-sm bg-background/80 sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1" />
            {profile && (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                  {profile.full_name?.charAt(0)?.toUpperCase()}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{profile.full_name}</span>
              </div>
            )}
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;

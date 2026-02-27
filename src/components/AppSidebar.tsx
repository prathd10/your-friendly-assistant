import {
  LayoutDashboard, CalendarPlus, Calendar, Users, MessageSquare, Search, LogOut, Sparkles, UserCircle, Link2
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const organizerItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Create Event', url: '/create-event', icon: CalendarPlus },
  { title: 'My Events', url: '/my-events', icon: Calendar },
  { title: 'Browse Sponsors', url: '/browse-sponsors', icon: Search },
  { title: 'Requests', url: '/requests', icon: Link2 },
  { title: 'Matches', url: '/matches', icon: Sparkles },
  { title: 'Messages', url: '/messages', icon: MessageSquare },
];

const sponsorItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Browse Events', url: '/browse-events', icon: Search },
  { title: 'Requests', url: '/requests', icon: Link2 },
  { title: 'Matches', url: '/matches', icon: Sparkles },
  { title: 'Messages', url: '/messages', icon: MessageSquare },
  { title: 'Edit Profile', url: '/edit-profile', icon: UserCircle },
];

export function AppSidebar() {
  const { profile, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const items = profile?.role === 'organizer' ? organizerItems : sponsorItems;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar text-sidebar-foreground">
        <div className="p-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-accent-foreground" />
          </div>
          {!collapsed && <span className="font-bold text-lg tracking-tight">EventSphere</span>}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent/50 transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-sidebar p-3">
        {!collapsed && profile && (
          <div className="mb-2 px-2">
            <p className="text-xs text-sidebar-foreground/60 truncate">{profile.organization_name}</p>
            <p className="text-xs text-sidebar-foreground/40 capitalize">{profile.role}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          onClick={signOut}
          className="w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

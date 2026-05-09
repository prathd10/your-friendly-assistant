import {
  LayoutDashboard, CalendarPlus, Calendar, Users, MessageSquare, Search, LogOut, Sparkles, UserCircle, Link2, Shield, Music, Briefcase
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
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
  { title: 'Browse Creators', url: '/browse-creators', icon: Search },
  { title: 'Find Performers', url: '/browse-performers', icon: Music },
  { title: 'Find Providers', url: '/browse-vendors', icon: Briefcase },
  { title: 'Requests', url: '/requests', icon: Link2 },
  { title: 'Matches', url: '/matches', icon: Sparkles },
  { title: 'Messages', url: '/messages', icon: MessageSquare },
];

const sponsorItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Browse Events', url: '/browse-events', icon: Search },
  { title: 'Browse Creators', url: '/browse-creators', icon: Search },
  { title: 'Requests', url: '/requests', icon: Link2 },
  { title: 'Matches', url: '/matches', icon: Sparkles },
  { title: 'Messages', url: '/messages', icon: MessageSquare },
  { title: 'Edit Profile', url: '/edit-profile', icon: UserCircle },
];

const creatorItems = [
  { title: 'Dashboard', url: '/creator-dashboard', icon: LayoutDashboard },
  { title: 'Browse Gigs', url: '/browse-gigs', icon: Search },
  { title: 'Campaigns', url: '/requests', icon: Link2 },
  { title: 'Messages', url: '/messages', icon: MessageSquare },
  { title: 'Edit Profile', url: '/edit-creator-profile', icon: UserCircle },
];

const performerItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Bookings', url: '/requests', icon: Link2 },
  { title: 'Messages', url: '/messages', icon: MessageSquare },
  { title: 'Edit Profile', url: '/edit-profile', icon: UserCircle },
];

const vendorItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Inquiries', url: '/requests', icon: Link2 },
  { title: 'Messages', url: '/messages', icon: MessageSquare },
  { title: 'Edit Profile', url: '/edit-profile', icon: UserCircle },
];

const adminItems = [
  { title: 'Verification Queue', url: '/admin', icon: Shield },
];

// Which nav url maps to which notification key
const NOTIF_KEYS: Record<string, 'messages' | 'requests' | 'matches'> = {
  '/messages': 'messages',
  '/requests': 'requests',
  '/matches':  'matches',
};

export function AppSidebar() {
  const { profile, signOut } = useAuth();
  const { counts, clearCount } = useNotifications();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const items = profile?.role === 'organizer'
    ? organizerItems
    : profile?.role === 'sponsor'
      ? sponsorItems
      : profile?.role === 'creator'
        ? creatorItems
        : profile?.role === 'performer'
          ? performerItems
          : profile?.role === 'vendor'
            ? vendorItems
            : profile?.role === 'admin'
              ? adminItems
              : [];

  const handleNav = (url: string) => {
    const key = NOTIF_KEYS[url];
    if (key) clearCount(key);
  };

  const getBadge = (url: string): number => {
    const key = NOTIF_KEYS[url];
    return key ? counts[key] : 0;
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar text-sidebar-foreground">
        <div className="p-4 flex items-center justify-center min-h-[4rem]">
          <img src="/logo%20without%20bg.png" alt="EventSphere Logo" className={`transition-all object-contain ${collapsed ? 'w-8 h-8' : 'w-full max-h-12'}`} />
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const badge = getBadge(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className="hover:bg-sidebar-accent/50 transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        onClick={() => handleNav(item.url)}
                      >
                        <div className="relative mr-2 shrink-0">
                          <item.icon className="h-4 w-4" />
                          {badge > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                              {badge > 99 ? '99+' : badge}
                            </span>
                          )}
                        </div>
                        {!collapsed && (
                          <span className="flex-1 flex items-center justify-between">
                            {item.title}
                            {badge > 0 && (
                              <span className="ml-auto h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                                {badge > 99 ? '99+' : badge}
                              </span>
                            )}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-sidebar p-3">
        {!collapsed && profile && (
          <div className="mb-2 px-2 flex items-center gap-2">
            {profile.profile_photo ? (
              <img src={profile.profile_photo} alt="" className="h-8 w-8 rounded-full object-cover border border-sidebar-accent" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-[10px] font-bold text-sidebar-accent-foreground shrink-0">
                {profile.full_name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-sidebar-foreground/60 truncate font-medium">{profile.organization_name}</p>
              <p className="text-[10px] text-sidebar-foreground/40 capitalize">{profile.role}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          onClick={signOut}
          className="w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

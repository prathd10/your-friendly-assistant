import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface NotificationCounts {
  messages: number;
  requests: number;
  matches: number;
}

interface NotificationsContextValue {
  counts: NotificationCounts;
  clearCount: (key: keyof NotificationCounts) => void;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  counts: { messages: 0, requests: 0, matches: 0 },
  clearCount: () => {},
});

export const useNotifications = () => useContext(NotificationsContext);

export const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, profile } = useAuth();
  const [counts, setCounts] = useState<NotificationCounts>({ messages: 0, requests: 0, matches: 0 });
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  const lsKey = (type: string) => `eventsphere_last_seen_${type}_${user?.id}`;

  const bump = (key: keyof NotificationCounts) =>
    setCounts(c => ({ ...c, [key]: c[key] + 1 }));

  const clearCount = useCallback((key: keyof NotificationCounts) => {
    setCounts(c => ({ ...c, [key]: 0 }));
    localStorage.setItem(lsKey(key), new Date().toISOString());
  }, [user?.id]);

  // ── Initial fetch ──────────────────────────────────────────────

  const fetchInitialCounts = useCallback(async () => {
    if (!user || !profile) return;

    // ── Messages: count received since last visit ──────────────
    const lastSeenMessages = localStorage.getItem(lsKey('messages')) || '1970-01-01';
    const { count: msgCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .gt('created_at', lastSeenMessages);

    // ── Requests: all pending where I am receiver ──────────────
    const lastSeenRequests = localStorage.getItem(lsKey('requests')) || '1970-01-01';
    const { count: reqCount } = await supabase
      .from('connection_requests')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .gt('created_at', lastSeenRequests);

    // ── Matches: new matches since last visit ──────────────────
    const lastSeenMatches = localStorage.getItem(lsKey('matches')) || '1970-01-01';
    let matchCount = 0;

    if (profile.role === 'organizer') {
      const { data: events } = await supabase
        .from('events')
        .select('id')
        .eq('organizer_id', user.id);
      const eventIds = events?.map(e => e.id) || [];
      if (eventIds.length > 0) {
        const { count } = await supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .in('event_id', eventIds)
          .gt('created_at', lastSeenMatches);
        matchCount = count || 0;
      }
    } else if (profile.role === 'sponsor') {
      const { count } = await supabase
        .from('matches')
        .select('id', { count: 'exact', head: true })
        .eq('sponsor_id', user.id)
        .gt('created_at', lastSeenMatches);
      matchCount = count || 0;
    }

    setCounts({
      messages: msgCount || 0,
      requests: reqCount || 0,
      matches: matchCount,
    });
  }, [user?.id, profile?.role]);

  // ── Real-time subscriptions ────────────────────────────────────

  const subscribeRealtime = useCallback(() => {
    if (!user) return;

    // Unsubscribe previous channels
    channelsRef.current.forEach(c => supabase.removeChannel(c));
    channelsRef.current = [];

    // New messages
    const msgChannel = supabase
      .channel(`notif-messages-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, () => bump('messages'))
      .subscribe();

    // New connection requests
    const reqChannel = supabase
      .channel(`notif-requests-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'connection_requests',
        filter: `receiver_id=eq.${user.id}`,
      }, () => bump('requests'))
      .subscribe();

    // New matches (organizer: listen on matches table broadly; sponsor: filter by sponsor_id)
    const matchFilter = profile?.role === 'sponsor'
      ? `sponsor_id=eq.${user.id}`
      : undefined;

    const matchChannel = supabase
      .channel(`notif-matches-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'matches',
        ...(matchFilter ? { filter: matchFilter } : {}),
      }, () => bump('matches'))
      .subscribe();

    channelsRef.current = [msgChannel, reqChannel, matchChannel];
  }, [user?.id, profile?.role]);

  useEffect(() => {
    if (!user || !profile) {
      setCounts({ messages: 0, requests: 0, matches: 0 });
      return;
    }
    fetchInitialCounts();
    subscribeRealtime();

    return () => {
      channelsRef.current.forEach(c => supabase.removeChannel(c));
      channelsRef.current = [];
    };
  }, [user?.id, profile?.role]);

  return (
    <NotificationsContext.Provider value={{ counts, clearCount }}>
      {children}
    </NotificationsContext.Provider>
  );
};

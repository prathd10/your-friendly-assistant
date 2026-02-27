import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Event } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, IndianRupee } from 'lucide-react';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-primary/20 text-primary',
  closed: 'bg-destructive/20 text-destructive',
};

const MyEvents = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('events')
      .select('*')
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setEvents(data || []);
        setLoading(false);
      });
  }, [user]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Events</h1>
      {events.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">No events yet. Create your first event!</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <Card key={event.id} className="glass-card border-border/30 hover:shadow-lg transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-lg">{event.name}</h3>
                  <Badge className={statusColors[event.status]}>{event.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.city}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(event.event_date).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{event.audience_size}</span>
                  <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />{event.budget_required.toLocaleString()}</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs">{event.category}</Badge>
                  {event.tags?.slice(0, 3).map((t) => (
                    <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyEvents;

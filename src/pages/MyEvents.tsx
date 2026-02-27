import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Event } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, IndianRupee, Trash2, XCircle } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-primary/20 text-primary',
  closed: 'bg-destructive/20 text-destructive',
  cancelled: 'bg-destructive/10 text-destructive',
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

  const handleCancel = async (eventId: string) => {
    const { error } = await supabase
      .from('events')
      .update({ status: 'closed' })
      .eq('id', eventId);
    if (error) {
      toast.error('Failed to cancel event: ' + error.message);
    } else {
      setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, status: 'closed' as const } : e));
      toast.success('Event cancelled');
    }
  };

  const handleDelete = async (eventId: string) => {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);
    if (error) {
      toast.error('Failed to delete event: ' + error.message);
    } else {
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      toast.success('Event deleted permanently');
    }
  };

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

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-border/30">
                  {event.status === 'active' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-xs gap-1">
                          <XCircle className="h-3 w-3" /> Cancel Event
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel this event?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will mark "{event.name}" as closed. Sponsors will no longer see it as active. This action can't be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Active</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleCancel(event.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Yes, Cancel Event
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-xs gap-1 text-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this event permanently?</AlertDialogTitle>
                        <AlertDialogDescription>
                          "{event.name}" and all its matches, conversations, and messages will be permanently deleted. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Event</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(event.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Yes, Delete Forever
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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

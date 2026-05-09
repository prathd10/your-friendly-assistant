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
import { Link } from 'react-router-dom';
import { LayoutDashboard, Edit } from 'lucide-react';

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
        <div className="grid gap-3 sm:gap-6 grid-cols-2">
          {events.map((event) => (
            <Card key={event.id} className="glass-card border-border/30 hover:shadow-lg transition-all h-full flex flex-col">
              <CardContent className="p-3 sm:p-5 flex-1 flex flex-col space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm sm:text-lg leading-tight line-clamp-1">{event.name}</h3>
                  <Badge className={`text-[8px] sm:text-xs shrink-0 ${statusColors[event.status]}`}>{event.status}</Badge>
                </div>
                <p className="text-[10px] sm:text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                <div className="flex flex-col gap-1 text-[9px] sm:text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 truncate"><MapPin className="h-3 w-3 text-primary" />{event.city}</span>
                  <span className="flex items-center gap-1.5 truncate"><Calendar className="h-3 w-3 text-primary" />{new Date(event.event_date).toLocaleDateString()}</span>
                </div>
                
                <div className="mt-auto pt-3 border-t border-border/30">
                  <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2">
                    <Button asChild variant="default" className="h-8 px-2 text-[10px] sm:text-xs gap-1 w-full sm:w-auto">
                      <Link to={`/event/${event.id}/dashboard`}>
                        <LayoutDashboard className="h-3 w-3" /> Dashboard
                      </Link>
                    </Button>
                    
                    <Button asChild variant="outline" className="h-8 px-2 text-[10px] sm:text-xs gap-1 w-full sm:w-auto">
                      <Link to={`/event/${event.id}/edit`}>
                        <Edit className="h-3 w-3" /> Edit
                      </Link>
                    </Button>

                    <div className="flex gap-2 w-full sm:w-auto mt-1 sm:mt-0">
                      {event.status === 'active' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" className="h-8 p-1 text-[10px] text-muted-foreground hover:text-destructive">
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel event?</AlertDialogTitle>
                              <AlertDialogDescription>Mark "{event.name}" as closed?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Active</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleCancel(event.id)} className="bg-destructive">Yes, Cancel</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" className="h-8 p-1 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                            <AlertDialogDescription>This will delete "{event.name}" forever.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Go Back</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(event.id)} className="bg-destructive">Delete Forever</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
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

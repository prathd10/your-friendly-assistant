import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Calendar, MapPin, Users, Loader2, Sparkles, Gift, CheckCircle2, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface PublicEvent {
  id: string;
  name: string;
  description: string;
  event_date: string;
  city: string;
  category: string;
  expected_footfall: number;
  perks?: any[];
}

const EventsNearMe = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<PublicEvent | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpData, setRsvpData] = useState({
    full_name: '',
    email: '',
    phone: '',
  });
  const [perks, setPerks] = useState<any[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPerkPreview, setShowPerkPreview] = useState<{name: string, perks: any[]} | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'active')
      .eq('is_public', true)
      .order('event_date', { ascending: true })
      .limit(6);

    if (error) {
      console.error('Error fetching events:', error);
    } else if (data) {
      // Fetch perks for these events
      const eventIds = data.map(e => e.id);
      const { data: perksData } = await supabase
        .from('event_perks')
        .select('*')
        .in('event_id', eventIds)
        .eq('is_active', true);

      const eventsWithPerks = data.map(event => ({
        ...event,
        perks: perksData?.filter(p => p.event_id === event.id) || []
      }));
      setEvents(eventsWithPerks);
    }
    setLoading(false);
  };

  const handleRSVP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    if (!rsvpData.full_name || !rsvpData.email) {
      toast.error('Please fill in your name and email.');
      return;
    }

    setRsvpLoading(true);
    const { error } = await supabase
      .from('rsvps')
      .insert({
        event_id: selectedEvent.id,
        full_name: rsvpData.full_name,
        email: rsvpData.email,
        phone: rsvpData.phone,
      });

    if (error) {
      toast.error('Failed to RSVP: ' + error.message);
    } else {
      // Fetch perks for this event
      const { data: eventPerks } = await supabase
        .from('event_perks')
        .select('*')
        .eq('event_id', selectedEvent.id)
        .eq('is_active', true);
      
      setPerks(eventPerks || []);
      setShowSuccess(true);
      toast.success('Successfully RSVPed!');
    }
    setRsvpLoading(false);
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    setSelectedEvent(null);
    setRsvpData({ full_name: '', email: '', phone: '' });
    setPerks([]);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <section className="py-24 bg-background border-t">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="space-y-4">
            <Badge variant="outline" className="text-primary border-primary/20">Live Opportunities</Badge>
            <h2 className="text-3xl font-bold md:text-5xl tracking-tight">Events Near You</h2>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Discover high-impact events happening in your area. RSVP now to attend or partner.
            </p>
          </div>
          <Button 
            variant="ghost" 
            className="hidden md:flex items-center gap-2 group"
            onClick={() => navigate('/explore-events')}
          >
            View All Events <Sparkles className="h-4 w-4 group-hover:text-primary transition-colors" />
          </Button>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-2xl bg-muted/20">
            <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold">No active events yet</h3>
            <p className="text-muted-foreground mt-2">Check back later or publish your own event to see it here!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card key={event.id} className="glass-card flex flex-col border-border/30 hover:shadow-xl transition-all duration-300 group">
                <CardHeader className="space-y-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                      {event.category}
                    </Badge>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                      <Users className="h-3 w-3" /> {event.expected_footfall.toLocaleString()} +
                    </span>
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">{event.name}</CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[40px]">
                    {event.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 mt-auto">
                  <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      {new Date(event.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {event.city}
                    </div>
                  </div>
                  
                  {event.perks && event.perks.length > 0 && (
                    <div 
                      className="flex items-center gap-2 p-2 rounded-lg bg-secondary/5 border border-secondary/20 animate-pulse cursor-help hover:bg-secondary/10 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPerkPreview({ name: event.name, perks: event.perks || [] });
                      }}
                    >
                      <Gift className="h-4 w-4 text-secondary" />
                      <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                        {event.perks.length} {event.perks.length === 1 ? 'Sponsor Perk' : 'Sponsor Perks'} Included
                      </span>
                    </div>
                  )}

                  <Button 
                    onClick={() => setSelectedEvent(event)}
                    className="w-full bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border-primary/20 transition-all font-semibold"
                  >
                    RSVP for Event
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* RSVP Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md border-border/30 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
               <Sparkles className="h-5 w-5 text-primary" /> RSVP for {selectedEvent?.name}
            </DialogTitle>
            <DialogDescription>
              We'll send you a confirmation and event details once the organizer approves your request.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRSVP} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input 
                id="name" 
                placeholder="John Doe" 
                value={rsvpData.full_name}
                onChange={(e) => setRsvpData(prev => ({ ...prev, full_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="john@example.com" 
                value={rsvpData.email}
                onChange={(e) => setRsvpData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input 
                id="phone" 
                placeholder="+91 98765 43210" 
                value={rsvpData.phone}
                onChange={(e) => setRsvpData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button 
                type="submit" 
                disabled={rsvpLoading} 
                className="w-full h-12 text-base shadow-lg shadow-primary/20"
              >
                {rsvpLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : 'Confirm RSVP'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Success & Perks Modal */}
      <Dialog open={showSuccess} onOpenChange={(open) => !open && handleCloseSuccess()}>
        <DialogContent className="sm:max-w-md border-none bg-gradient-to-br from-primary/5 to-secondary/5 shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />
          <DialogHeader className="text-center pt-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-500">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <DialogTitle className="text-3xl font-black italic tracking-tight">You're In!</DialogTitle>
            <DialogDescription className="text-base">
              Thanks for RSVPing for <span className="font-bold text-foreground">{selectedEvent?.name}</span>.
            </DialogDescription>
          </DialogHeader>

          {perks.length > 0 && (
            <div className="py-6 space-y-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary w-fit mx-auto text-xs font-bold uppercase tracking-widest">
                <Gift className="h-3.5 w-3.5" /> Your Sponsor Perks
              </div>
              <div className="space-y-3">
                {perks.map((perk) => (
                  <div key={perk.id} className="p-4 rounded-2xl border border-primary/20 bg-background/50 backdrop-blur-sm shadow-sm relative overflow-hidden group hover:border-primary/40 transition-all">
                    <div className="absolute -right-2 -top-2 h-12 w-12 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10" />
                    <p className="font-bold text-primary">{perk.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{perk.description}</p>
                    {perk.code && (
                      <div className="mt-3 flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/30">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Promo Code</span>
                        <code className="text-sm font-mono font-black tracking-widest">{perk.code}</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-center text-muted-foreground italic">
                Save these codes or take a screenshot. We'll also send them to your email.
              </p>
            </div>
          )}

          <DialogFooter className="sm:justify-center pb-6">
            <Button onClick={handleCloseSuccess} className="w-full h-12 text-lg font-bold">
              Awesome, thanks!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Perk Preview Modal */}
      <Dialog open={!!showPerkPreview} onOpenChange={(open) => !open && setShowPerkPreview(null)}>
        <DialogContent className="sm:max-w-md border-none shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-secondary" />
          <DialogHeader className="pt-4">
            <div className="flex items-center gap-2 text-secondary mb-2">
              <Gift className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Sponsor Rewards</span>
            </div>
            <DialogTitle className="text-2xl font-black italic tracking-tight uppercase">What's Inside?</DialogTitle>
            <DialogDescription>
              RSVP for <span className="font-bold text-foreground">{showPerkPreview?.name}</span> to unlock these exclusive offers:
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            {showPerkPreview?.perks.map((perk, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-border bg-muted/30 relative group">
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-40 transition-opacity">
                  <Lock className="h-8 w-8" />
                </div>
                <p className="font-bold pr-10">{perk.title}</p>
                <p className="text-sm text-muted-foreground mt-1 pr-10">{perk.description}</p>
              </div>
            ))}
          </div>

          <DialogFooter className="pb-4">
            <Button 
              className="w-full h-12 bg-primary text-primary-foreground font-bold"
              onClick={() => {
                const event = events.find(e => e.name === showPerkPreview?.name);
                if (event) setSelectedEvent(event);
                setShowPerkPreview(null);
              }}
            >
              RSVP Now to Unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default EventsNearMe;

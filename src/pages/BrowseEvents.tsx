import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Event, EVENT_CATEGORIES } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, Users, IndianRupee, Search, Globe, FileText, TrendingUp, Target, Tag, MessageCircle, Building, Star, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const BrowseEvents = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [filtered, setFiltered] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [maxBudget, setMaxBudget] = useState([1000000]);
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    supabase
      .from('events')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setEvents(data || []);
        setFiltered(data || []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let result = events;
    if (category !== 'all') result = result.filter((e) => e.category === category);
    if (maxBudget[0] < 1000000) result = result.filter((e) => e.budget_required <= maxBudget[0]);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) =>
        e.name.toLowerCase().includes(q) || e.city.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [events, category, maxBudget, search]);

  const handleConnect = async (event: Event) => {
    if (!user || !profile) return;
    setConnecting(true);

    try {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('event_id', event.id)
        .eq('sponsor_id', user.id)
        .maybeSingle();

      if (existing) {
        toast.info('You are already connected for this event.');
        navigate(`/messages?conv=${existing.id}`);
        setSelectedEvent(null);
        setConnecting(false);
        return;
      }

      // Create conversation
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({
          event_id: event.id,
          organizer_id: event.organizer_id,
          sponsor_id: user.id,
        })
        .select('id')
        .single();

      if (convError) throw convError;

      // Send automated intro message
      const message = `Hi! I'm ${profile.full_name} from ${profile.organization_name}. I'm interested in sponsoring your "${event.name}" event. I'd love to discuss potential sponsorship opportunities. Let's connect!`;

      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conv.id,
          sender_id: user.id,
          receiver_id: event.organizer_id,
          content: message,
        });

      if (msgError) throw msgError;

      toast.success('Connection request sent! Redirecting to messages...');
      setSelectedEvent(null);
      navigate(`/messages?conv=${conv.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Browse Events</h1>

      <Card className="glass-card border-border/30">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="w-[180px]">
            <label className="text-xs text-muted-foreground mb-1 block">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {EVENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">Max Budget: ₹{maxBudget[0].toLocaleString()}</label>
            <Slider value={maxBudget} onValueChange={setMaxBudget} min={50000} max={1000000} step={50000} />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">No events found matching your criteria.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((event) => (
            <Card
              key={event.id}
              className="glass-card border-border/30 hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer"
              onClick={() => setSelectedEvent(event)}
            >
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold text-lg">{event.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.city}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(event.event_date).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{event.audience_size}</span>
                  <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />₹{event.budget_required.toLocaleString()}</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="secondary">{event.category}</Badge>
                  {event.tags?.slice(0, 3).map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedEvent.name}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 pt-1">
                  <Badge variant="secondary">{selectedEvent.category}</Badge>
                  <span className="text-muted-foreground">•</span>
                  <span>{selectedEvent.city}, {selectedEvent.state}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                {/* Description */}
                <p className="text-sm text-foreground leading-relaxed">{selectedEvent.description}</p>

                <Separator />

                {/* Key Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <DetailItem icon={<Calendar className="h-4 w-4" />} label="Event Date" value={new Date(selectedEvent.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
                  {selectedEvent.event_end_date && (
                    <DetailItem icon={<Calendar className="h-4 w-4" />} label="End Date" value={new Date(selectedEvent.event_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
                  )}
                  <DetailItem icon={<MapPin className="h-4 w-4" />} label="Venue" value={selectedEvent.venue_name} />
                  <DetailItem icon={<Building className="h-4 w-4" />} label="Full Address" value={selectedEvent.full_address} />
                  <DetailItem icon={<IndianRupee className="h-4 w-4" />} label="Sponsorship Budget" value={`₹${selectedEvent.budget_required.toLocaleString()}`} />
                  <DetailItem icon={<Users className="h-4 w-4" />} label="Audience Size" value={selectedEvent.audience_size.toLocaleString()} />
                </div>

                <Separator />

                {/* Footfall & Demographics */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Footfall & Demographics</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <DetailItem icon={<Users className="h-4 w-4" />} label="Expected Footfall" value={selectedEvent.expected_footfall.toLocaleString()} />
                    {selectedEvent.previous_year_footfall && (
                      <DetailItem icon={<Users className="h-4 w-4" />} label="Previous Year Footfall" value={selectedEvent.previous_year_footfall.toLocaleString()} />
                    )}
                    <DetailItem icon={<Target className="h-4 w-4" />} label="Target Demographics" value={selectedEvent.target_demographics} />
                    {selectedEvent.social_media_reach && (
                      <DetailItem icon={<Megaphone className="h-4 w-4" />} label="Social Media Reach" value={selectedEvent.social_media_reach.toLocaleString()} />
                    )}
                  </div>
                </div>

                {/* Event Lineup */}
                {selectedEvent.event_lineup && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2"><Star className="h-4 w-4 text-primary" /> Event Lineup</h4>
                      <p className="text-sm text-muted-foreground">{selectedEvent.event_lineup}</p>
                    </div>
                  </>
                )}

                {/* Sponsorship Details */}
                {(selectedEvent.sponsorship_tiers || selectedEvent.sponsor_deliverables || selectedEvent.usp) && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2"><IndianRupee className="h-4 w-4 text-primary" /> Sponsorship Details</h4>
                      {selectedEvent.sponsorship_tiers && (
                        <div><span className="text-xs font-medium text-muted-foreground">Tiers:</span><p className="text-sm mt-0.5">{selectedEvent.sponsorship_tiers}</p></div>
                      )}
                      {selectedEvent.sponsor_deliverables && (
                        <div><span className="text-xs font-medium text-muted-foreground">Deliverables:</span><p className="text-sm mt-0.5">{selectedEvent.sponsor_deliverables}</p></div>
                      )}
                      {selectedEvent.usp && (
                        <div><span className="text-xs font-medium text-muted-foreground">USP:</span><p className="text-sm mt-0.5">{selectedEvent.usp}</p></div>
                      )}
                    </div>
                  </>
                )}

                {/* Past Sponsors & Media */}
                {(selectedEvent.past_sponsors || selectedEvent.media_coverage) && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      {selectedEvent.past_sponsors && (
                        <div><span className="text-xs font-medium text-muted-foreground">Past Sponsors:</span><p className="text-sm mt-0.5">{selectedEvent.past_sponsors}</p></div>
                      )}
                      {selectedEvent.media_coverage && (
                        <div><span className="text-xs font-medium text-muted-foreground">Media Coverage:</span><p className="text-sm mt-0.5">{selectedEvent.media_coverage}</p></div>
                      )}
                    </div>
                  </>
                )}

                {/* Tags */}
                {selectedEvent.tags?.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2"><Tag className="h-4 w-4 text-primary" /> Tags</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedEvent.tags.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                      </div>
                    </div>
                  </>
                )}

                {/* Links */}
                {(selectedEvent.pitch_deck_url || selectedEvent.website_url) && (
                  <>
                    <Separator />
                    <div className="flex flex-wrap gap-3">
                      {selectedEvent.pitch_deck_url && (
                        <a href={selectedEvent.pitch_deck_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                          <FileText className="h-4 w-4" /> View Pitch Deck
                        </a>
                      )}
                      {selectedEvent.website_url && (
                        <a href={selectedEvent.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                          <Globe className="h-4 w-4" /> Event Website
                        </a>
                      )}
                    </div>
                  </>
                )}

                <Separator />

                {/* Connect Button */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => handleConnect(selectedEvent)}
                  disabled={connecting}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {connecting ? 'Connecting...' : 'Connect with Organizer'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-2">
    <span className="text-primary mt-0.5">{icon}</span>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  </div>
);

export default BrowseEvents;

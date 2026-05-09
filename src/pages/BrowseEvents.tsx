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
import { Calendar, MapPin, Users, IndianRupee, Search, Globe, FileText, TrendingUp, Target, Tag, MessageCircle, Building, Star, Megaphone, Send, Sparkles, Film } from 'lucide-react';
import AIPitchDeck from '@/components/AIPitchDeck';
import AIVideoGenerator from '@/components/AIVideoGenerator';
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
  const [sendingRequest, setSendingRequest] = useState(false);
  const [showPitchDeck, setShowPitchDeck] = useState(false);
  const [showVideoScript, setShowVideoScript] = useState(false);

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

  const handleSendRequest = async (event: Event) => {
    if (!user || !profile) return;
    setSendingRequest(true);

    try {
      // Check existing request
      const { data: existing } = await supabase
        .from('connection_requests')
        .select('id, status')
        .eq('sender_id', user.id)
        .eq('receiver_id', event.organizer_id)
        .eq('event_id', event.id)
        .maybeSingle();

      if (existing) {
        toast.info(`You already sent a request (${existing.status}) for this event.`);
        setSendingRequest(false);
        return;
      }

      const message = `Hi! I'm ${profile.full_name} from ${profile.organization_name}. I'm interested in sponsoring your "${event.name}" event. I'd love to discuss potential sponsorship opportunities!`;

      const { error } = await supabase.from('connection_requests').insert({
        sender_id: user.id,
        receiver_id: event.organizer_id,
        event_id: event.id,
        request_type: 'sponsor_to_organizer',
        message,
      });

      if (error) throw error;
      toast.success('Connection request sent! The organizer will review it.');
      setSelectedEvent(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send request.');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleDirectMessage = async (event: Event) => {
    if (!user || !profile) return;
    setSendingRequest(true);

    try {
      // Check if conversation already exists (from accepted request)
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('event_id', event.id)
        .eq('sponsor_id', user.id)
        .maybeSingle();

      if (existingConv) {
        navigate(`/messages?conv=${existingConv.id}`);
        setSelectedEvent(null);
        return;
      }

      toast.info('You need to send a connection request first. The organizer must accept before messaging.');
    } catch (err: any) {
      toast.error(err.message || 'Error checking conversation.');
    } finally {
      setSendingRequest(false);
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
        <div className="grid gap-3 sm:gap-6 grid-cols-2 lg:grid-cols-3">
          {filtered.map((event) => (
            <Card
              key={event.id}
              className="glass-card border-border/30 hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer"
              onClick={() => setSelectedEvent(event)}
            >
              <CardContent className="p-3 sm:p-5 space-y-2 sm:space-y-3">
                <h3 className="font-bold text-xs sm:text-lg leading-tight line-clamp-1">{event.name}</h3>
                <p className="text-[10px] sm:text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                <div className="flex flex-col gap-1 text-[9px] sm:text-xs text-muted-foreground pt-1 sm:pt-0">
                  <span className="flex items-center gap-1.5 truncate"><MapPin className="h-3 w-3 text-primary" />{event.city}</span>
                  <span className="flex items-center gap-1.5 truncate"><Calendar className="h-3 w-3 text-primary" />{new Date(event.event_date).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1.5 truncate"><IndianRupee className="h-3 w-3 text-primary" />₹{event.budget_required.toLocaleString()}</span>
                </div>
                <div className="flex gap-1 flex-wrap pt-1 sm:pt-0">
                  <Badge variant="secondary" className="text-[8px] sm:text-xs px-1 py-0">{event.category}</Badge>
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
                <p className="text-sm text-foreground leading-relaxed">{selectedEvent.description}</p>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <DetailItem icon={<Calendar className="h-4 w-4" />} label="Event Date" value={new Date(selectedEvent.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
                  {selectedEvent.event_end_date && <DetailItem icon={<Calendar className="h-4 w-4" />} label="End Date" value={new Date(selectedEvent.event_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />}
                  <DetailItem icon={<MapPin className="h-4 w-4" />} label="Venue" value={selectedEvent.venue_name} />
                  <DetailItem icon={<Building className="h-4 w-4" />} label="Full Address" value={selectedEvent.full_address} />
                  <DetailItem icon={<IndianRupee className="h-4 w-4" />} label="Sponsorship Budget" value={`₹${selectedEvent.budget_required.toLocaleString()}`} />
                  <DetailItem icon={<Users className="h-4 w-4" />} label="Audience Size" value={selectedEvent.audience_size.toLocaleString()} />
                </div>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Footfall & Demographics</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <DetailItem icon={<Users className="h-4 w-4" />} label="Expected Footfall" value={selectedEvent.expected_footfall.toLocaleString()} />
                    {selectedEvent.previous_year_footfall && <DetailItem icon={<Users className="h-4 w-4" />} label="Previous Year Footfall" value={selectedEvent.previous_year_footfall.toLocaleString()} />}
                    <DetailItem 
                      icon={<Target className="h-4 w-4" />} 
                      label="Target Demographics" 
                      value={typeof selectedEvent.target_demographics === 'string' ? selectedEvent.target_demographics : 'Mixed (See Profile)'} 
                    />
                    {selectedEvent.social_media_reach && <DetailItem icon={<Megaphone className="h-4 w-4" />} label="Social Media Reach" value={selectedEvent.social_media_reach.toLocaleString()} />}
                  </div>
                </div>
                {selectedEvent.event_lineup && (<><Separator /><div className="space-y-2"><h4 className="font-semibold text-sm flex items-center gap-2"><Star className="h-4 w-4 text-primary" /> Event Lineup</h4><p className="text-sm text-muted-foreground">{selectedEvent.event_lineup}</p></div></>)}
                {(selectedEvent.sponsorship_tiers || selectedEvent.sponsor_deliverables || selectedEvent.usp) && (<><Separator /><div className="space-y-3"><h4 className="font-semibold text-sm flex items-center gap-2"><IndianRupee className="h-4 w-4 text-primary" /> Sponsorship Details</h4>{selectedEvent.sponsorship_tiers && <div><span className="text-xs font-medium text-muted-foreground">Tiers:</span><p className="text-sm mt-0.5">{selectedEvent.sponsorship_tiers}</p></div>}{selectedEvent.sponsor_deliverables && <div><span className="text-xs font-medium text-muted-foreground">Deliverables:</span><p className="text-sm mt-0.5">{selectedEvent.sponsor_deliverables}</p></div>}{selectedEvent.usp && <div><span className="text-xs font-medium text-muted-foreground">USP:</span><p className="text-sm mt-0.5">{selectedEvent.usp}</p></div>}</div></>)}
                {(selectedEvent.past_sponsors || selectedEvent.media_coverage) && (<><Separator /><div className="space-y-3">{selectedEvent.past_sponsors && <div><span className="text-xs font-medium text-muted-foreground">Past Sponsors:</span><p className="text-sm mt-0.5">{selectedEvent.past_sponsors}</p></div>}{selectedEvent.media_coverage && <div><span className="text-xs font-medium text-muted-foreground">Media Coverage:</span><p className="text-sm mt-0.5">{selectedEvent.media_coverage}</p></div>}</div></>)}
                {selectedEvent.tags?.length > 0 && (<><Separator /><div className="space-y-2"><h4 className="font-semibold text-sm flex items-center gap-2"><Tag className="h-4 w-4 text-primary" /> Tags</h4><div className="flex flex-wrap gap-1.5">{selectedEvent.tags.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}</div></div></>)}
                {(selectedEvent.ai_pitch_deck || selectedEvent.pitch_deck_url || selectedEvent.website_url) && (
                  <>
                    <Separator />
                    <div className="flex flex-wrap gap-3 items-center">
                      {selectedEvent.ai_pitch_deck && (
                        <Button size="sm" variant="outline" className="gap-1.5 text-primary border-primary/30 hover:bg-primary/5" onClick={() => setShowPitchDeck(true)}>
                          <Sparkles className="h-4 w-4" /> View Pitch Deck
                        </Button>
                      )}
                      {selectedEvent.ai_video_script && (
                        <Button size="sm" variant="outline" className="gap-1.5 text-primary border-primary/30 hover:bg-primary/5" onClick={() => setShowVideoScript(true)}>
                          <Film className="h-4 w-4" /> Watch Video Pitch
                        </Button>
                      )}
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

                {/* Two action buttons */}
                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => handleSendRequest(selectedEvent)}
                    disabled={sendingRequest}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sendingRequest ? 'Sending...' : 'Send Connection Request'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDirectMessage(selectedEvent)}
                    disabled={sendingRequest}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message Organizer
                  </Button>
                </div>
                
                <div className="flex justify-center mt-2">
                  <Button 
                    variant="ghost" 
                    className="text-primary hover:text-primary/80 hover:bg-primary/10 w-full"
                    onClick={() => {
                      if (selectedEvent) {
                        navigate(`/organizer/${selectedEvent.organizer_id}`);
                      }
                    }}
                  >
                    <Building className="h-4 w-4 mr-2" />
                    View Organizer Profile & Past Events
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center mt-3">
                  Connection request must be accepted before you can message the organizer.
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Video Pitch Viewer */}
      <Dialog open={showVideoScript} onOpenChange={setShowVideoScript}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Film className="h-4 w-4 text-primary" />
              {selectedEvent?.name} — Video Pitch
            </DialogTitle>
          </DialogHeader>
          {selectedEvent?.ai_video_script && (
            <AIVideoGenerator
              eventData={selectedEvent}
              media={selectedEvent.past_event_media || []}
              script={selectedEvent.ai_video_script as any}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* AI Pitch Deck Viewer */}
      <Dialog open={showPitchDeck} onOpenChange={setShowPitchDeck}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {selectedEvent?.name} — Sponsor Pitch Deck
            </DialogTitle>
          </DialogHeader>
          {selectedEvent?.ai_pitch_deck && (
            <AIPitchDeck data={selectedEvent.ai_pitch_deck} />
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

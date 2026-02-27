import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile, Event, SponsorPreferences } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Search, Building, MapPin, IndianRupee, Target, Tag, Send, FileText, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';

const BrowseSponsors = () => {
  const { user, profile } = useAuth();
  const [sponsors, setSponsors] = useState<UserProfile[]>([]);
  const [filtered, setFiltered] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSponsor, setSelectedSponsor] = useState<UserProfile | null>(null);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'sponsor')
        .order('created_at', { ascending: false });
      setSponsors(data || []);
      setFiltered(data || []);
      setLoading(false);
    };
    load();
  }, []);

  // Load organizer's events for proposal
  useEffect(() => {
    if (!user) return;
    supabase
      .from('events')
      .select('*')
      .eq('organizer_id', user.id)
      .eq('status', 'active')
      .then(({ data }) => setMyEvents(data || []));
  }, [user]);

  useEffect(() => {
    let result = sponsors;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((s) =>
        s.organization_name.toLowerCase().includes(q) ||
        s.full_name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.business_description?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [sponsors, search]);

  const handleSendProposal = async () => {
    if (!user || !profile || !selectedSponsor || !selectedEventId) {
      toast.error('Please select an event to propose');
      return;
    }
    setSending(true);

    try {
      // Check existing request
      const { data: existing } = await supabase
        .from('connection_requests')
        .select('id, status')
        .eq('sender_id', user.id)
        .eq('receiver_id', selectedSponsor.id)
        .eq('event_id', selectedEventId)
        .maybeSingle();

      if (existing) {
        toast.info(`Request already ${existing.status} for this event.`);
        setSending(false);
        return;
      }

      const event = myEvents.find((e) => e.id === selectedEventId);
      const message = `Hi ${selectedSponsor.full_name}! I'm ${profile.full_name} from ${profile.organization_name}. I'd like to invite you to sponsor our event "${event?.name}". Check out the event details and let me know if you're interested!`;

      const { error } = await supabase.from('connection_requests').insert({
        sender_id: user.id,
        receiver_id: selectedSponsor.id,
        event_id: selectedEventId,
        request_type: 'organizer_to_sponsor',
        message,
      });

      if (error) throw error;
      toast.success('Proposal sent successfully!');
      setSelectedSponsor(null);
      setSelectedEventId('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send proposal');
    } finally {
      setSending(false);
    }
  };

  const prefs = (s: UserProfile): SponsorPreferences | null => {
    if (!s.preferences) return null;
    return s.preferences as SponsorPreferences;
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Browse Sponsors</h1>

      <Card className="glass-card border-border/30">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search sponsors by name, company, city..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">No sponsors found.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((sponsor) => {
            const sp = prefs(sponsor);
            return (
              <Card
                key={sponsor.id}
                className="glass-card border-border/30 hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer"
                onClick={() => { setSelectedSponsor(sponsor); setSelectedEventId(''); }}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{sponsor.organization_name}</h3>
                      <p className="text-xs text-muted-foreground">{sponsor.full_name}</p>
                    </div>
                  </div>
                  {sponsor.business_description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{sponsor.business_description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {sponsor.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{sponsor.city}</span>}
                    {sp?.max_budget && <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />Up to ₹{sp.max_budget.toLocaleString()}</span>}
                  </div>
                  {sp?.categories && sp.categories.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {sp.categories.slice(0, 4).map((c) => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sponsor Detail Dialog */}
      <Dialog open={!!selectedSponsor} onOpenChange={(open) => !open && setSelectedSponsor(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedSponsor && (() => {
            const sp = prefs(selectedSponsor);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Building className="h-5 w-5 text-primary" />
                    </div>
                    {selectedSponsor.organization_name}
                  </DialogTitle>
                  <DialogDescription>{selectedSponsor.full_name} • {selectedSponsor.city}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  {selectedSponsor.business_description && (
                    <>
                      <div>
                        <h4 className="text-sm font-semibold mb-1">About</h4>
                        <p className="text-sm text-muted-foreground">{selectedSponsor.business_description}</p>
                      </div>
                      <Separator />
                    </>
                  )}

                  {sp && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {sp.max_budget > 0 && (
                        <div className="flex items-start gap-2">
                          <IndianRupee className="h-4 w-4 text-primary mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground">Max Budget</p>
                            <p className="font-medium">₹{sp.max_budget.toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                      {sp.min_audience > 0 && (
                        <div className="flex items-start gap-2">
                          <Users className="h-4 w-4 text-primary mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground">Min Audience</p>
                            <p className="font-medium">{sp.min_audience.toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {sp?.categories && sp.categories.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><Target className="h-4 w-4 text-primary" /> Interested Categories</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {sp.categories.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
                        </div>
                      </div>
                    </>
                  )}

                  {sp?.cities && sp.cities.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><MapPin className="h-4 w-4 text-primary" /> Preferred Cities</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {sp.cities.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Send Proposal */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-1"><Send className="h-4 w-4 text-primary" /> Send Event Proposal</h4>
                    <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                      <SelectTrigger><SelectValue placeholder="Select an event to propose" /></SelectTrigger>
                      <SelectContent>
                        {myEvents.map((ev) => (
                          <SelectItem key={ev.id} value={ev.id}>
                            <div className="flex items-center gap-2">
                              <span>{ev.name}</span>
                              {ev.pitch_deck_url && <FileText className="h-3 w-3 text-muted-foreground" />}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedEventId && (() => {
                      const ev = myEvents.find((e) => e.id === selectedEventId);
                      if (!ev) return null;
                      return (
                        <Card className="border-border/30 bg-muted/30">
                          <CardContent className="p-3 space-y-2 text-sm">
                            <p className="font-semibold">{ev.name}</p>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(ev.event_date).toLocaleDateString()}</span>
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.city}</span>
                              <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />₹{ev.budget_required.toLocaleString()}</span>
                              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{ev.expected_footfall}</span>
                            </div>
                            {ev.pitch_deck_url && (
                              <a href={ev.pitch_deck_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                <FileText className="h-3 w-3" /> Pitch Deck Attached
                              </a>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })()}

                    <Button
                      className="w-full"
                      onClick={handleSendProposal}
                      disabled={!selectedEventId || sending}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sending ? 'Sending...' : 'Send Proposal'}
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrowseSponsors;

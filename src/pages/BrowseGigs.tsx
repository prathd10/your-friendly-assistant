import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile, Event } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Search, Calendar, MapPin, IndianRupee, Users, Building, CheckCircle,
  Shield, Send, Heart, Sparkles, Eye
} from 'lucide-react';
import { toast } from 'sonner';

// ── Helpers ────────────────────────────────────────────────────────────────
function calcTrust(p: UserProfile): number {
  let s = 0;
  if (p.niche && p.platform && p.audience_demographics) s += 20;
  if (p.media_kit_url) s += 20;
  if (p.verification_status === 'verified') s += 20;
  else if (p.verification_proof_urls && p.verification_proof_urls.length > 0) s += 10;
  if (p.portfolio_urls && p.portfolio_urls.length > 0) s += 20;
  const er = p.engagement_rate || 0;
  if (er > 0 && er <= 15) s += 20;
  else if (er > 15 && er <= 25) s += 5;
  return Math.min(s, 100);
}
function trustColor(s: number) {
  if (s >= 80) return 'text-green-500';
  if (s >= 60) return 'text-yellow-500';
  return 'text-red-500';
}

// ── Types for the pitch modal ──────────────────────────────────────────────
type GigTarget = { type: 'event'; event: Event } | { type: 'sponsor'; sponsor: UserProfile };

const BrowseGigs = () => {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [sponsors, setSponsors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Pitch state
  const [target, setTarget] = useState<GigTarget | null>(null);
  const [deliverables, setDeliverables] = useState('');
  const [budget, setBudget] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [evRes, spRes] = await Promise.all([
        supabase.from('events').select('*').eq('status', 'active').order('created_at', { ascending: false }),
        supabase.from('users').select('*').eq('role', 'sponsor').order('created_at', { ascending: false }),
      ]);
      setEvents(evRes.data || []);
      setSponsors(spRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  const filteredEvents = events.filter(e =>
    !search.trim() ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase()) ||
    e.city.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSponsors = sponsors.filter(s =>
    !search.trim() ||
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.organization_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.city?.toLowerCase().includes(search.toLowerCase())
  );

  const openPitch = (g: GigTarget) => {
    setTarget(g);
    setDeliverables('');
    setBudget('');
    setMessage('');
  };

  const handleSendPitch = async () => {
    if (!user || !profile || !target) return;
    if (!deliverables || !message) {
      toast.error('Please fill in your deliverables and message.');
      return;
    }

    setSending(true);
    try {
      const receiverId = target.type === 'event'
        ? target.event.organizer_id
        : target.sponsor.id;

      const requestType = target.type === 'event' ? 'creator_to_organizer' : 'creator_to_sponsor';
      const eventId = target.type === 'event' ? target.event.id : undefined;

      // Check for duplicate
      const qb = supabase.from('connection_requests')
        .select('id, status')
        .eq('sender_id', user.id)
        .eq('receiver_id', receiverId)
        .in('status', ['pending', 'accepted']);
      if (eventId) qb.eq('event_id', eventId);
      
      const { data: existing } = await qb.maybeSingle();
      if (existing) {
        toast.info(`You already have a ${existing.status} pitch for this gig.`);
        setSending(false);
        return;
      }

      const { error } = await supabase.from('connection_requests').insert({
        sender_id: user.id,
        receiver_id: receiverId,
        event_id: eventId || null,
        request_type: requestType,
        message,
        campaign_details: {
          campaignType: 'Creator Pitch',
          budget: budget ? Number(budget) : undefined,
          deliverables,
        },
      });

      if (error) throw error;
      toast.success('Pitch sent! They will reach out if interested.');
      setTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send pitch.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Browse Gigs</h1>
        <p className="text-muted-foreground">Discover events and brands you can collaborate with.</p>
      </div>

      <Card className="glass-card border-border/30">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, category, city..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events">🎪 Events ({filteredEvents.length})</TabsTrigger>
          <TabsTrigger value="sponsors">🏢 Sponsors ({filteredSponsors.length})</TabsTrigger>
        </TabsList>

        {/* ── EVENTS TAB ── */}
        <TabsContent value="events" className="mt-4">
          {filteredEvents.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No active events found.</p>
          ) : (
            <div className="grid gap-3 sm:gap-6 grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map(ev => (
                <Card key={ev.id} className="glass-card border-border/30 hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col">
                  <CardContent className="p-3 sm:p-5 space-y-2 flex-1 flex flex-col">
                    <div>
                      <h3 className="font-bold text-xs sm:text-base leading-tight line-clamp-1">{ev.name}</h3>
                      <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 mt-1">{ev.description}</p>
                    </div>
                    <div className="flex flex-col gap-1 text-[9px] sm:text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 truncate"><Calendar className="h-3 w-3 text-primary shrink-0" />{new Date(ev.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 text-primary shrink-0" />{ev.city}</span>
                      <span className="flex items-center gap-1 truncate"><IndianRupee className="h-3 w-3 text-primary shrink-0" />₹{ev.budget_required?.toLocaleString()}</span>
                    </div>
                    <Badge variant="secondary" className="text-[8px] sm:text-xs px-1 py-0 w-fit">{ev.category}</Badge>
                    <Button className="w-full mt-auto" size="sm" onClick={() => openPitch({ type: 'event', event: ev })}>
                      <Send className="h-3 w-3 mr-1" /> Pitch
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── SPONSORS TAB ── */}
        <TabsContent value="sponsors" className="mt-4">
          {filteredSponsors.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No sponsors found.</p>
          ) : (
            <div className="grid gap-3 sm:gap-6 grid-cols-2 lg:grid-cols-3">
              {filteredSponsors.map(sp => (
                <Card key={sp.id} className="glass-card border-border/30 hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col">
                  <CardContent className="p-3 sm:p-5 space-y-2 flex-1 flex flex-col">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Building className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-xs sm:text-base truncate">{sp.organization_name}</h3>
                        <p className="text-[10px] text-muted-foreground truncate">{sp.full_name}</p>
                      </div>
                    </div>
                    {sp.business_description && <p className="text-[10px] sm:text-sm text-muted-foreground line-clamp-2">{sp.business_description}</p>}
                    {sp.city && <span className="flex items-center gap-1 text-[9px] sm:text-xs text-muted-foreground"><MapPin className="h-3 w-3 text-primary" />{sp.city}</span>}
                    <Button className="w-full mt-auto" size="sm" onClick={() => openPitch({ type: 'sponsor', sponsor: sp })}>
                      <Send className="h-3 w-3 mr-1" /> Pitch
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── PITCH MODAL ── */}
      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {target && profile && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {target.type === 'event'
                    ? `Pitch for: ${target.event.name}`
                    : `Pitch to: ${target.sponsor.organization_name}`}
                </DialogTitle>
                <DialogDescription>
                  {target.type === 'event'
                    ? `${target.event.city} · ${new Date(target.event.event_date).toLocaleDateString()}`
                    : target.sponsor.city}
                </DialogDescription>
              </DialogHeader>

              {/* ── Your Creator Card Preview ── */}
              <div className="space-y-5 mt-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Creator Card</p>
                  <div className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-base">{profile.full_name}</h3>
                        <p className="text-xs text-muted-foreground">{profile.platform} · {profile.niche}</p>
                      </div>
                      {profile.verification_status === 'verified' ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-500/30 text-xs">
                          <Shield className="h-3 w-3 mr-1" /> Self-Reported
                        </Badge>
                      )}
                    </div>

                    {/* Key Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center bg-background/50 rounded-lg border border-border/50 p-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Followers</p>
                        <p className="font-bold text-sm">{profile.followers_count?.toLocaleString() || 'N/A'}</p>
                      </div>
                      <div className="border-x border-border/50">
                        <p className="text-xs text-muted-foreground">Engagement</p>
                        <p className="font-bold text-sm flex items-center justify-center gap-0.5">
                          <Heart className="h-3 w-3 text-red-400" />{profile.engagement_rate || 0}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Avg Views</p>
                        <p className="font-bold text-sm">{profile.average_views?.toLocaleString() || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Trust Score Line */}
                    {(() => { const ts = calcTrust(profile); return (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3" /> Trust Score</span>
                        <span className={`font-bold ${trustColor(ts)}`}>{ts} / 100</span>
                      </div>
                    ); })()}

                    {profile.audience_demographics && (
                      <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                        <span className="font-medium text-foreground">Audience: </span>{profile.audience_demographics}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* ── Pitch Details ── */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Pitch Details</p>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">What will you deliver?</p>
                    <Textarea
                      placeholder="e.g. 1 Instagram Reel + 3 Stories + 1 YouTube Short about the event..."
                      className="h-24"
                      value={deliverables}
                      onChange={e => setDeliverables(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Your Commercials for this Gig (₹) <span className="text-xs text-muted-foreground">(optional)</span></p>
                    <Input
                      type="number"
                      placeholder={`e.g. ${profile.pricing_per_post?.toLocaleString() || '15000'}`}
                      value={budget}
                      onChange={e => setBudget(e.target.value)}
                    />
                    {profile.pricing_per_post && !budget && (
                      <p className="text-xs text-muted-foreground">Your default commercials: ₹{profile.pricing_per_post.toLocaleString()}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Message</p>
                    <Textarea
                      placeholder="Introduce yourself and explain why you're a great fit for this event/brand..."
                      className="h-28"
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                    />
                  </div>
                </div>

                <Button className="w-full" onClick={handleSendPitch} disabled={sending}>
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? 'Sending pitch...' : 'Send Pitch'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrowseGigs;

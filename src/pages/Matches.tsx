import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, MessageSquare, Send, Users, Building2, CheckCircle2, Clock, Loader2, Star, MapPin, Music, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface SponsorMatch {
  id: string;
  match_score: number;
  reason: string;
  event_id: string;
  sponsor_id: string;
  event_name: string;
  event_category: string;
  event_city: string;
  counterpart_name: string;
  counterpart_org: string;
}

interface CreatorMatch {
  creator_id: string;
  match_score: number;
  match_reasons: string[];
  full_name: string;
  platform: string;
  niche: string;
  followers_count: number;
  engagement_rate: number;
  pricing_per_post: number;
  verification_status: string;
  city: string;
  organization_name?: string;
}

interface MyEvent {
  id: string;
  name: string;
  status: string;
}

const Matches = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [sponsorMatches, setSponsorMatches] = useState<SponsorMatch[]>([]);
  const [creatorMatches, setCreatorMatches] = useState<CreatorMatch[]>([]);
  const [performerMatches, setPerformerMatches] = useState<CreatorMatch[]>([]);
  const [vendorMatches, setVendorMatches] = useState<CreatorMatch[]>([]);
  const [myEvents, setMyEvents] = useState<MyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Track which requests have already been sent (event_id+receiver_id)
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  // Campaign request dialog
  const [campaignTarget, setCampaignTarget] = useState<CreatorMatch | null>(null);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [campaignMessage, setCampaignMessage] = useState('');
  const [sendingCampaign, setSendingCampaign] = useState(false);

  // Sponsor request sending state
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !profile) { setLoading(false); return; }
    loadMatches();
  }, [user, profile]);

  const loadMatches = async () => {
    setLoading(true);
    try {
      if (profile!.role === 'organizer') {
        await loadOrganizerData();
      } else if (profile!.role === 'sponsor') {
        await loadSponsorData();
      } else if (profile!.role === 'creator') {
        await loadCreatorData();
      }
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizerData = async () => {
    // Fetch organizer's events
    const { data: events } = await supabase
      .from('events')
      .select('id, name, category, city, status')
      .eq('organizer_id', user!.id);

    setMyEvents((events || []).map(e => ({ id: e.id, name: e.name, status: e.status })));
    const eventIds = events?.map(e => e.id) || [];
    const eventMap = Object.fromEntries(events?.map(e => [e.id, e]) || []);

    // Fetch sponsor matches
    if (eventIds.length > 0) {
      const { data: matchData } = await supabase
        .from('matches')
        .select('*, users!matches_sponsor_id_fkey(full_name, organization_name)')
        .in('event_id', eventIds)
        .order('match_score', { ascending: false });

      setSponsorMatches((matchData || []).map((m: any) => ({
        id: m.id, match_score: m.match_score, reason: m.reason,
        event_id: m.event_id, sponsor_id: m.sponsor_id,
        event_name: eventMap[m.event_id]?.name || '',
        event_category: eventMap[m.event_id]?.category || '',
        event_city: eventMap[m.event_id]?.city || '',
        counterpart_name: m.users?.full_name || '',
        counterpart_org: m.users?.organization_name || '',
      })));
    }

    // 2. Fetch matches for different target roles using RPC
    const targetRoles: Array<{ role: string, setter: any }> = [
      { role: 'creator', setter: setCreatorMatches },
      { role: 'performer', setter: setPerformerMatches },
      { role: 'vendor', setter: setVendorMatches }
    ];

    for (const { role, setter } of targetRoles) {
      const { data: matchData, error: rpcError } = await supabase
        .rpc('calculate_user_matches', { 
          p_user_id: user!.id, 
          p_role: 'organizer',
          p_target_role: role
        });

      if (!rpcError && matchData?.length > 0) {
        const targetIds = matchData.map((m: any) => m.target_id);
        const { data: profiles } = await supabase
          .from('users')
          .select('id, full_name, organization_name, platform, niche, followers_count, engagement_rate, pricing_per_post, verification_status, city')
          .in('id', targetIds);

        const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
        setter(matchData.map((m: any) => ({
          creator_id: m.target_id, // Reuse creator_id property for shared UI
          match_score: m.match_score,
          match_reasons: m.match_reasons || [],
          ...profileMap[m.target_id],
        })).filter((m: any) => m.full_name).sort((a: any, b: any) => b.match_score - a.match_score));
      } else {
        setter([]);
      }
    }

    // Load already-sent requests to track state
    if (eventIds.length > 0) {
      const { data: reqs } = await supabase
        .from('connection_requests')
        .select('event_id, receiver_id, status')
        .eq('sender_id', user!.id)
        .in('event_id', eventIds);
      const keys = new Set((reqs || []).map((r: any) => `${r.event_id}_${r.receiver_id}`));
      setSentRequests(keys);
    }
  };

  const loadSponsorData = async () => {
    const { data: matchData } = await supabase
      .from('matches')
      .select('*, events(name, category, city, organizer_id, organizer:users!events_organizer_id_fkey(full_name, organization_name))')
      .eq('sponsor_id', user!.id)
      .order('match_score', { ascending: false });

    setSponsorMatches((matchData || []).map((m: any) => ({
      id: m.id, match_score: m.match_score, reason: m.reason,
      event_id: m.event_id, sponsor_id: m.sponsor_id,
      event_name: m.events?.name || '',
      event_category: m.events?.category || '',
      event_city: m.events?.city || '',
      counterpart_name: m.events?.organizer?.full_name || '',
      counterpart_org: m.events?.organizer?.organization_name || '',
    })));

    // Creators matched to sponsor
    const { data: creatorMatchData, error: rpcError } = await supabase
      .rpc('calculate_creator_matches', { p_user_id: user!.id, p_role: 'sponsor' });

    if (!rpcError && creatorMatchData?.length > 0) {
      const creatorIds = creatorMatchData.map((m: any) => m.creator_id);
      const { data: creatorProfiles } = await supabase
        .from('users')
        .select('id, full_name, organization_name, platform, niche, followers_count, engagement_rate, pricing_per_post, verification_status, city')
        .in('id', creatorIds);

      const profileMap = Object.fromEntries((creatorProfiles || []).map(p => [p.id, p]));
      setCreatorMatches(creatorMatchData.map((m: any) => ({
        creator_id: m.creator_id,
        match_score: Math.min(m.match_score, 100),
        match_reasons: m.match_reasons || [],
        ...profileMap[m.creator_id],
      })).filter((m: any) => m.full_name).sort((a: any, b: any) => b.match_score - a.match_score));
    }
  };

  const loadCreatorData = async () => {
    // Creators see requests sent to them
    const { data: reqs } = await supabase
      .from('connection_requests')
      .select('*, events(name, category, city), sender:users!connection_requests_sender_id_fkey(full_name, organization_name, role)')
      .eq('receiver_id', user!.id)
      .order('created_at', { ascending: false });

    // Repurpose sponsorMatches state to show inbound requests for creators
    setSponsorMatches((reqs || []).map((r: any) => ({
      id: r.id,
      match_score: 0,
      reason: r.message || '',
      event_id: r.event_id || '',
      sponsor_id: r.sender_id,
      event_name: r.events?.name || 'Campaign Request',
      event_category: r.events?.category || '',
      event_city: r.events?.city || '',
      counterpart_name: r.sender?.full_name || '',
      counterpart_org: r.sender?.organization_name || '',
    })));
  };

  // ── Send sponsor connection request ────────────────────────────

  const sendSponsorRequest = async (match: SponsorMatch) => {
    if (!user || !profile) return;
    const key = `${match.event_id}_${match.sponsor_id}`;
    if (sentRequests.has(key)) { toast.info('Request already sent for this event.'); return; }

    setSendingRequest(match.id);
    try {
      const message = `Hi! I'm ${profile.full_name}. I'd love for ${match.counterpart_org || match.counterpart_name} to sponsor "${match.event_name}". Let's connect!`;
      const { error } = await supabase.from('connection_requests').insert({
        sender_id: user.id,
        receiver_id: match.sponsor_id,
        event_id: match.event_id,
        request_type: 'organizer_to_sponsor',
        message,
      });
      if (error) throw error;
      setSentRequests(prev => new Set(prev).add(key));
      toast.success('Request sent to sponsor!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send request');
    } finally {
      setSendingRequest(null);
    }
  };

  // ── Send campaign request to creator ─────────────────────────

  const openCampaignDialog = (creator: CreatorMatch) => {
    setCampaignTarget(creator);
    setSelectedEventId('');
    setCampaignMessage('');
  };

  const sendCampaignRequest = async () => {
    if (!user || !campaignTarget || !selectedEventId) {
      toast.error('Please select an event');
      return;
    }

    const key = `${selectedEventId}_${campaignTarget.creator_id}`;
    if (sentRequests.has(key)) {
      toast.info('You already sent a campaign request for this event to this creator.');
      return;
    }

    setSendingCampaign(true);
    try {
      const event = myEvents.find(e => e.id === selectedEventId);
      const message = campaignMessage.trim() ||
        `Hi ${campaignTarget.full_name}! I'd love to collaborate with you on "${event?.name}". Your ${campaignTarget.niche} content aligns perfectly with our event. Let's discuss!`;

      const { error } = await supabase.from('connection_requests').insert({
        sender_id: user.id,
        receiver_id: campaignTarget.creator_id,
        event_id: selectedEventId,
        request_type: 'organizer_to_creator',
        message,
        campaign_details: {
          campaignType: 'event_promotion',
          deliverables: `Promote ${event?.name} across ${campaignTarget.platform}`,
        },
      });

      if (error) throw error;
      setSentRequests(prev => new Set(prev).add(key));
      toast.success(`Campaign request sent to ${campaignTarget.full_name}!`);
      setCampaignTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send campaign request');
    } finally {
      setSendingCampaign(false);
    }
  };

  // ── Message conversation ──────────────────────────────────────

  const startConversation = async (match: SponsorMatch) => {
    if (!user || !profile) return;
    const sponsorId = profile.role === 'sponsor' ? user.id : match.sponsor_id;

    const { data: existing } = await supabase
      .from('conversations').select('id')
      .eq('event_id', match.event_id).eq('sponsor_id', sponsorId).maybeSingle();

    if (existing) { navigate(`/messages?conv=${existing.id}`); return; }

    let orgId = profile.role === 'organizer' ? user.id : undefined;
    if (!orgId) {
      const { data: event } = await supabase.from('events').select('organizer_id').eq('id', match.event_id).single();
      orgId = event?.organizer_id;
    }

    const { data, error } = await supabase.from('conversations').insert({
      event_id: match.event_id, organizer_id: orgId!, sponsor_id: sponsorId!,
    }).select('id').single();

    if (error) { toast.error('Failed to start conversation'); return; }
    navigate(`/messages?conv=${data.id}`);
  };

  // ── Score color ───────────────────────────────────────────────

  const scoreColor = (score: number) =>
    score >= 80 ? 'text-green-400' : score >= 60 ? 'text-primary' : 'text-yellow-400';

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="animate-spin h-8 w-8 text-primary" />
    </div>
  );

  // ── Creator view (inbound requests) ──────────────────────────

  if (profile?.role === 'creator') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Campaign Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">Organizers and sponsors who want to work with you</p>
        </div>
        {sponsorMatches.length === 0 ? (
          <p className="text-muted-foreground text-center py-16">No campaign requests yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sponsorMatches.map(m => (
              <Card key={m.id} className="glass-card border-border/30">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{m.counterpart_org || m.counterpart_name}</p>
                      <p className="text-xs text-muted-foreground">{m.counterpart_name}</p>
                    </div>
                    <Badge variant="secondary">{m.event_category}</Badge>
                  </div>
                  {m.event_name !== 'Campaign Request' && (
                    <p className="text-sm font-medium text-primary">📍 {m.event_name}</p>
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-3">{m.reason}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Sponsor view ──────────────────────────────────────────────

  if (profile?.role === 'sponsor') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Your Matches</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-matched events and creators based on your profile</p>
        </div>
        <Tabs defaultValue="events">
          <TabsList className="mb-4">
            <TabsTrigger value="events" className="gap-2">
              <Building2 className="h-4 w-4" /> Matched Events ({sponsorMatches.length})
            </TabsTrigger>
            <TabsTrigger value="creators" className="gap-2">
              <Users className="h-4 w-4" /> Matched Creators ({creatorMatches.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            {sponsorMatches.length === 0 ? (
              <p className="text-muted-foreground text-center py-16">No event matches yet.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {sponsorMatches.map(m => (
                  <Card key={m.id} className="glass-card border-border/30">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{m.event_name}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />{m.event_city}
                          </p>
                        </div>
                        <div className={`flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg`}>
                          <Sparkles className="h-3 w-3 text-primary" />
                          <span className={`text-sm font-bold ${scoreColor(m.match_score)}`}>{m.match_score}%</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary">{m.event_category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{m.reason}</p>
                      <Button size="sm" variant="outline" onClick={() => startConversation(m)} className="w-full gap-2">
                        <MessageSquare className="h-4 w-4" /> Message Organizer
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="creators">
            <CreatorGrid creators={creatorMatches} sentRequests={sentRequests} onRequest={openCampaignDialog} scoreColor={scoreColor} showRequestBtn={false} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // ── Organizer view ────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Your Matches</h1>
        <p className="text-sm text-muted-foreground mt-1">AI-matched sponsors and creators for your events</p>
      </div>

      <Tabs defaultValue="sponsors">
        <TabsList className="mb-4 grid w-full grid-cols-2 lg:grid-cols-4 h-auto lg:h-10">
          <TabsTrigger value="sponsors" className="gap-2">
            <Building2 className="h-4 w-4" /> Sponsors ({sponsorMatches.length})
          </TabsTrigger>
          <TabsTrigger value="creators" className="gap-2">
            <Users className="h-4 w-4" /> Creators ({creatorMatches.length})
          </TabsTrigger>
          <TabsTrigger value="artists" className="gap-2">
            <Music className="h-4 w-4" /> Artists ({performerMatches.length})
          </TabsTrigger>
          <TabsTrigger value="vendors" className="gap-2">
            <Truck className="h-4 w-4" /> Vendors ({vendorMatches.length})
          </TabsTrigger>
        </TabsList>

        {/* Sponsors Tab */}
        <TabsContent value="sponsors">
          {sponsorMatches.length === 0 ? (
            <p className="text-muted-foreground text-center py-16">No sponsor matches yet. Publish an event to get matched.</p>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {sponsorMatches.map(m => {
                const key = `${m.event_id}_${m.sponsor_id}`;
                const alreadySent = sentRequests.has(key);
                return (
                  <Card key={m.id} className="glass-card border-border/30">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{m.counterpart_org || m.counterpart_name}</p>
                          <p className="text-xs text-muted-foreground">{m.counterpart_name}</p>
                          <p className="text-xs text-primary mt-0.5">For: {m.event_name}</p>
                        </div>
                        <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg">
                          <Sparkles className="h-3 w-3 text-primary" />
                          <span className={`text-sm font-bold ${scoreColor(m.match_score)}`}>{m.match_score}%</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="secondary">{m.event_category}</Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <MapPin className="h-2.5 w-2.5" />{m.event_city}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{m.reason}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 gap-2"
                          disabled={alreadySent || sendingRequest === m.id}
                          onClick={() => sendSponsorRequest(m)}
                          variant={alreadySent ? 'outline' : 'default'}
                        >
                          {sendingRequest === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> :
                            alreadySent ? <><CheckCircle2 className="h-3 w-3" /> Sent</> :
                            <><Send className="h-3 w-3" /> Send Request</>}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startConversation(m)} className="gap-2">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Creators Tab */}
        <TabsContent value="creators">
          <CreatorGrid
            creators={creatorMatches}
            sentRequests={sentRequests}
            onRequest={openCampaignDialog}
            scoreColor={scoreColor}
            showRequestBtn
            roleLabel="Creator"
          />
        </TabsContent>

        {/* Artists Tab */}
        <TabsContent value="artists">
          <CreatorGrid
            creators={performerMatches}
            sentRequests={sentRequests}
            onRequest={openCampaignDialog}
            scoreColor={scoreColor}
            showRequestBtn
            roleLabel="Artist"
          />
        </TabsContent>

        {/* Vendors Tab */}
        <TabsContent value="vendors">
          <CreatorGrid
            creators={vendorMatches}
            sentRequests={sentRequests}
            onRequest={openCampaignDialog}
            scoreColor={scoreColor}
            showRequestBtn
            roleLabel="Vendor"
          />
        </TabsContent>
      </Tabs>

      {/* Campaign Request Dialog */}
      <Dialog open={!!campaignTarget} onOpenChange={open => !open && setCampaignTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Campaign Request</DialogTitle>
            <DialogDescription>
              Send a collaboration request to <span className="font-medium text-foreground">{campaignTarget?.full_name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {campaignTarget && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/30">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm">
                  {campaignTarget.full_name?.[0]}
                </div>
                <div>
                  <p className="font-medium text-sm">{campaignTarget.full_name}</p>
                  <p className="text-xs text-muted-foreground">{campaignTarget.platform} · {campaignTarget.niche}</p>
                  <p className="text-xs text-muted-foreground">{campaignTarget.followers_count?.toLocaleString()} followers</p>
                </div>
                <div className="ml-auto text-right">
                  <span className={`text-lg font-black ${scoreColor(campaignTarget.match_score)}`}>{campaignTarget.match_score}%</span>
                  <p className="text-[10px] text-muted-foreground">match</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Event *</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose which event to pitch..." />
                </SelectTrigger>
                <SelectContent>
                  {myEvents.length === 0 ? (
                    <SelectItem value="none" disabled>No events found</SelectItem>
                  ) : (
                    myEvents.map(e => {
                      const key = `${e.id}_${campaignTarget?.creator_id}`;
                      const alreadySent = sentRequests.has(key);
                      return (
                        <SelectItem key={e.id} value={e.id} disabled={alreadySent}>
                          {e.name} {alreadySent ? '(request already sent)' : ''}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Message (optional)</Label>
              <Textarea
                placeholder={`Hi ${campaignTarget?.full_name}! I'd love to collaborate on our upcoming event...`}
                value={campaignMessage}
                onChange={e => setCampaignMessage(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{campaignMessage.length}/500</p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setCampaignTarget(null)}>Cancel</Button>
              <Button
                className="flex-1 gap-2"
                onClick={sendCampaignRequest}
                disabled={sendingCampaign || !selectedEventId}
              >
                {sendingCampaign ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Creator Grid Component ────────────────────────────────────

const CreatorGrid = ({
  creators, sentRequests, onRequest, scoreColor, showRequestBtn, roleLabel = 'Creator'
}: {
  creators: CreatorMatch[];
  sentRequests: Set<string>;
  onRequest: (c: CreatorMatch) => void;
  scoreColor: (s: number) => string;
  showRequestBtn: boolean;
  roleLabel?: string;
}) => {
  if (creators.length === 0) {
    return <p className="text-muted-foreground text-center py-16">No {roleLabel.toLowerCase()} matches yet.</p>;
  }

  const getIcon = () => {
    if (roleLabel === 'Artist') return <Music className="h-2.5 w-2.5 text-primary" />;
    if (roleLabel === 'Vendor') return <Truck className="h-2.5 w-2.5 text-primary" />;
    return <Sparkles className="h-2.5 w-2.5 text-primary" />;
  };

  const getMainIcon = () => {
    if (roleLabel === 'Artist') return <Music className="h-5 w-5 text-primary" />;
    if (roleLabel === 'Vendor') return <Truck className="h-5 w-5 text-primary" />;
    return <Users className="h-5 w-5 text-primary" />;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {creators.map(c => {
        const hasAnySentRequest = [...sentRequests].some(k => k.endsWith(`_${c.creator_id}`));
        return (
          <Card key={c.creator_id} className="glass-card border-border/30">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                    {getMainIcon()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-tight">{c.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[120px]">{c.platform || c.organization_name || roleLabel}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-lg">
                    {getIcon()}
                    <span className={`text-sm font-bold ${scoreColor(c.match_score)}`}>{c.match_score}%</span>
                  </div>
                  {c.verification_status === 'verified' && (
                    <Badge className="text-[9px] px-1.5 py-0 bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Verified
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {c.niche && <Badge variant="secondary" className="text-xs">{c.niche}</Badge>}
                {c.city && <Badge variant="outline" className="text-xs flex items-center gap-1"><MapPin className="h-2.5 w-2.5" />{c.city}</Badge>}
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md bg-muted/40 p-2">
                  <p className="text-sm font-bold">{c.followers_count ? (c.followers_count >= 1000 ? `${(c.followers_count / 1000).toFixed(1)}K` : c.followers_count) : 'Expert'}</p>
                  <p className="text-[10px] text-muted-foreground">{roleLabel === 'Vendor' ? 'Level' : 'Followers'}</p>
                </div>
                <div className="rounded-md bg-muted/40 p-2">
                  <p className="text-sm font-bold">{c.engagement_rate ? `${c.engagement_rate.toFixed(1)}%` : 'Direct'}</p>
                  <p className="text-[10px] text-muted-foreground">{roleLabel === 'Vendor' ? 'Booking' : 'Engagement'}</p>
                </div>
              </div>

              {c.match_reasons?.length > 0 && (
                <ul className="space-y-0.5">
                  {c.match_reasons.slice(0, 2).map((r, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <Star className="h-2.5 w-2.5 text-primary/60 shrink-0" />{r}
                    </li>
                  ))}
                </ul>
              )}

              {showRequestBtn && (
                <Button
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => onRequest(c)}
                  variant={hasAnySentRequest ? 'outline' : 'default'}
                >
                  {hasAnySentRequest
                    ? <><Clock className="h-3 w-3" /> Request Sent</>
                    : <><Send className="h-3 w-3" /> Send Campaign Request</>
                  }
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default Matches;

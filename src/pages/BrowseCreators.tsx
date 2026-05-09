import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, IndianRupee, Heart, Users, Target, Send, ExternalLink, Sparkles, CheckCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';

// --- Shared Trust Score calculation (0-100) ---
function calcTrust(c: UserProfile): number {
  let s = 0;
  if (c.niche && c.platform && c.audience_demographics) s += 20;
  if (c.media_kit_url) s += 20;
  if (c.verification_status === 'verified') s += 20;
  else if (c.verification_proof_urls && c.verification_proof_urls.length > 0) s += 10;
  if (c.portfolio_urls && c.portfolio_urls.length > 0) s += 20;
  const er = c.engagement_rate || 0;
  if (er > 0 && er <= 15) s += 20;
  else if (er > 15 && er <= 25) s += 5;
  return Math.min(s, 100);
}
function trustColor(score: number) {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
}

const BrowseCreators = () => {
  const { user, profile } = useAuth();
  const [creators, setCreators] = useState<UserProfile[]>([]);
  const [filtered, setFiltered] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCreator, setSelectedCreator] = useState<UserProfile | null>(null);

  // Campaign Request State
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [campaignType, setCampaignType] = useState('Event Promotion');
  const [budget, setBudget] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;

    const load = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'creator')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[BrowseCreators] fetch error:', error);
        setLoading(false);
        return;
      }

      const list = data || [];

      // Only call matching RPC for roles the function supports
      if (profile.role === 'organizer' || profile.role === 'sponsor') {
        try {
          const { data: matches, error: rpcErr } = await supabase.rpc('calculate_creator_matches', {
            p_user_id: user.id,
            p_role: profile.role,
          });

          if (rpcErr) {
            console.warn('[BrowseCreators] RPC warning:', rpcErr.message);
          } else if (matches && matches.length > 0) {
            list.forEach(creator => {
              const m = matches.find((x: any) => x.creator_id === creator.id);
              if (m) { creator.match_score = m.match_score; creator.match_reasons = m.match_reasons; }
            });
            list.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
          }
        } catch (e) {
          console.warn('[BrowseCreators] RPC exception:', e);
        }
      }

      setCreators(list);
      setFiltered(list);
      setLoading(false);
    };

    load();
  }, [user, profile]);

  useEffect(() => {
    let result = creators;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.niche?.toLowerCase().includes(q) ||
        c.platform?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [creators, search]);

  const handleSendRequest = async () => {
    if (!user || !profile || !selectedCreator) return;
    if (!budget || !deliverables || !message) {
      toast.error('Please fill in all campaign details');
      return;
    }

    setSending(true);
    try {
      // Check for existing pending request
      const { data: existing } = await supabase
        .from('connection_requests')
        .select('id, status')
        .eq('sender_id', user.id)
        .eq('receiver_id', selectedCreator.id)
        .in('status', ['pending', 'accepted'])
        .maybeSingle();

      if (existing) {
        toast.info(`You already have a ${existing.status} request with this creator.`);
        setSending(false);
        return;
      }

      const requestType = profile.role === 'organizer' ? 'organizer_to_creator' : 'sponsor_to_creator';

      const { error } = await supabase.from('connection_requests').insert({
        sender_id: user.id,
        receiver_id: selectedCreator.id,
        request_type: requestType,
        message,
        campaign_details: {
          campaignType,
          budget: Number(budget),
          deliverables
        }
      });

      if (error) throw error;
      
      toast.success('Campaign request sent successfully!');
      setShowRequestForm(false);
      setSelectedCreator(null);
      // Reset form
      setBudget('');
      setDeliverables('');
      setMessage('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send campaign request');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Browse Creators</h1>

      <Card className="glass-card border-border/30">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search creators by name, niche, platform..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">No creators found.</p>
      ) : (
        <div className="grid gap-3 sm:gap-6 grid-cols-2 lg:grid-cols-3">
          {filtered.map((creator) => (
            <Card
              key={creator.id}
              className="glass-card border-border/30 hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer"
              onClick={() => setSelectedCreator(creator)}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-1 sm:gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs sm:text-base flex items-center gap-1 truncate">
                        {creator.full_name}
                        {creator.verification_status === 'verified' && (
                          <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                        )}
                      </h3>
                      <p className="text-[10px] text-muted-foreground truncate">{creator.platform || 'Platform varies'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {creator.niche && <Badge variant="outline" className="text-[8px] sm:text-xs px-1 py-0">{creator.niche}</Badge>}
                    {/* Trust score mini indicator */}
                    {(() => { const ts = calcTrust(creator); return (
                      <span className={`text-[8px] sm:text-xs font-bold ${trustColor(ts)}`}>T {ts}</span>
                    ); })()}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground pt-2">
                  <span className="flex items-center gap-1 font-medium"><Users className="h-3 w-3" />{creator.followers_count?.toLocaleString() || 0} Followers</span>
                  {creator.engagement_rate && <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-red-400" />{creator.engagement_rate}% ER</span>}
                  {creator.pricing_per_post ? <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />From ₹{creator.pricing_per_post.toLocaleString()}</span> : null}
                  {creator.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{creator.city}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Creator Detail Dialog */}
      <Dialog open={!!selectedCreator} onOpenChange={(open) => !open && setSelectedCreator(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedCreator && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-wrap gap-2">
                    {selectedCreator.verification_status === 'verified' ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        <CheckCircle className="h-3 w-3 mr-1" /> Platform Verified Metrics
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-500/30">
                        <Shield className="h-3 w-3 mr-1" /> Self-Reported Metrics
                      </Badge>
                    )}
                    {selectedCreator.match_score && selectedCreator.match_score > 60 && (
                      <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20">
                        <Sparkles className="h-3 w-3 mr-1" /> Highly Recommended
                      </Badge>
                    )}
                  </div>
                  {selectedCreator.niche && <Badge variant="outline">{selectedCreator.niche}</Badge>}
                </div>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  {selectedCreator.full_name}
                  {selectedCreator.verification_status === 'verified' && <CheckCircle className="h-5 w-5 text-green-500" />}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" /> {selectedCreator.city || 'India'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Trust Score */}
                {(() => { const ts = calcTrust(selectedCreator); return (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                    <span className="text-sm font-medium">Trust Score</span>
                    <span className={`text-2xl font-bold ${trustColor(ts)}`}>{ts} <span className="text-xs font-normal text-muted-foreground">/ 100</span></span>
                  </div>
                ); })()}
                
                {/* Match Reasons */}
                {selectedCreator.match_reasons && selectedCreator.match_reasons.length > 0 && (
                  <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-lg space-y-2">
                    <p className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                      <Sparkles className="h-4 w-4" /> Why they're recommended for your campaigns
                    </p>
                    <ul className="text-sm space-y-1">
                      {selectedCreator.match_reasons.map((r, i) => (
                        <li key={i} className="flex items-center gap-2 text-muted-foreground">
                          <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" /> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg border border-border/50 text-center">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Followers</p>
                    <p className="font-bold text-lg">{selectedCreator.followers_count?.toLocaleString() || 'N/A'}</p>
                  </div>
                  <div className="border-x border-border/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Engagement</p>
                    <p className="font-bold text-lg flex items-center justify-center gap-1">
                      {selectedCreator.engagement_rate ? `${selectedCreator.engagement_rate}%` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Avg Views</p>
                    <p className="font-bold text-lg">{selectedCreator.average_views?.toLocaleString() || 'N/A'}</p>
                  </div>
                </div>

                {/* Demographics & About */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-1 flex items-center gap-1"><Target className="h-4 w-4 text-primary" /> Audience Demographics</h4>
                    <p className="text-sm text-muted-foreground bg-muted/20 p-3 rounded border border-border/20">
                      {selectedCreator.audience_demographics || "Audience demographic details haven't been shared yet."}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-1 flex items-center gap-1"><IndianRupee className="h-4 w-4 text-primary" /> Collaboration Rates</h4>
                    <p className="text-sm">
                      Starting at <span className="font-semibold text-primary">₹{selectedCreator.pricing_per_post?.toLocaleString() || 0}</span> 
                      <span className="text-muted-foreground text-xs ml-1">per post / appearance</span>
                    </p>
                  </div>

                  {selectedCreator.media_kit_url && (
                    <Button variant="outline" className="w-full" onClick={() => window.open(selectedCreator.media_kit_url!, '_blank')}>
                      <ExternalLink className="h-4 w-4 mr-2" /> View Full Media Kit
                    </Button>
                  )}
                </div>

                {/* Send Campaign Request Toggle */}
                {!showRequestForm ? (
                  <div className="pt-4 border-t border-border/30">
                    <Button className="w-full" onClick={() => setShowRequestForm(true)}>
                      <Send className="h-4 w-4 mr-2" /> Send Campaign Request
                    </Button>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-border/30 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                    <h4 className="font-semibold text-sm">Campaign Details</h4>
                    
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Campaign Type</p>
                      <Select value={campaignType} onValueChange={setCampaignType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Event Promotion">Event Promotion</SelectItem>
                          <SelectItem value="Product Placement">Product Placement</SelectItem>
                          <SelectItem value="Brand Ambassador">Brand Ambassador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Proposed Budget (₹)</p>
                      <Input type="number" placeholder="e.g. 15000" value={budget} onChange={(e) => setBudget(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Required Deliverables</p>
                      <Textarea placeholder="e.g. 1 Instagram Reel and 2 Stories" className="h-20" value={deliverables} onChange={(e) => setDeliverables(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Message</p>
                      <Textarea placeholder="Introduce your brand/event and why this is a good fit..." className="h-24" value={message} onChange={(e) => setMessage(e.target.value)} />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" className="flex-1" onClick={() => setShowRequestForm(false)}>Cancel</Button>
                      <Button className="flex-1" onClick={handleSendRequest} disabled={sending}>
                        {sending ? 'Sending...' : 'Send Request'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrowseCreators;

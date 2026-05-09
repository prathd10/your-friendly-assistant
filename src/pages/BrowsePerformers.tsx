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
import { Search, MapPin, IndianRupee, Heart, Music, Mic2, Star, Send, ExternalLink, Sparkles, CheckCircle, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';

// --- Shared Trust Score calculation (0-100) ---
function calcTrust(c: UserProfile): number {
  let s = 0;
  if (c.niche && c.city) s += 20;
  if (c.media_kit_url) s += 20;
  if (c.verification_status === 'verified') s += 20;
  else if (c.verification_proof_urls && c.verification_proof_urls.length > 0) s += 10;
  if (c.portfolio_urls && c.portfolio_urls.length > 0) s += 20;
  s += 20; // Default base trust for performers
  return Math.min(s, 100);
}

function trustColor(score: number) {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
}

const BrowsePerformers = () => {
  const { user, profile } = useAuth();
  const [performers, setPerformers] = useState<UserProfile[]>([]);
  const [filtered, setFiltered] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPerformer, setSelectedPerformer] = useState<UserProfile | null>(null);

  // Booking Request State
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [bookingType, setBookingType] = useState('Full Performance');
  const [budget, setBudget] = useState('');
  const [requirements, setRequirements] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;

    const load = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'performer')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[BrowsePerformers] fetch error:', error);
        setLoading(false);
        return;
      }

      setPerformers(data || []);
      setFiltered(data || []);
      setLoading(false);
    };

    load();
  }, [user, profile]);

  useEffect(() => {
    let result = performers;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.niche?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [performers, search]);

  const handleSendRequest = async () => {
    if (!user || !profile || !selectedPerformer) return;
    if (!budget || !requirements || !message) {
      toast.error('Please fill in all booking details');
      return;
    }

    setSending(false);
    setSending(true);
    try {
      const { data: existing } = await supabase
        .from('connection_requests')
        .select('id, status')
        .eq('sender_id', user.id)
        .eq('receiver_id', selectedPerformer.id)
        .in('status', ['pending', 'accepted'])
        .maybeSingle();

      if (existing) {
        toast.info(`You already have a ${existing.status} request with this performer.`);
        setSending(false);
        return;
      }

      const { error } = await supabase.from('connection_requests').insert({
        sender_id: user.id,
        receiver_id: selectedPerformer.id,
        request_type: 'organizer_to_performer',
        message,
        campaign_details: {
          bookingType,
          budget: Number(budget),
          requirements
        }
      });

      if (error) throw error;
      
      toast.success('Booking request sent successfully!');
      setShowRequestForm(false);
      setSelectedPerformer(null);
      setBudget('');
      setRequirements('');
      setMessage('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send booking request');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Find Artists & Performers</h1>
        <p className="text-muted-foreground">Discover singers, dancers, musicians and more for your event.</p>
      </div>

      <Card className="glass-card border-border/30">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, talent (e.g. Singer), location..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">No performers found yet.</p>
      ) : (
        <div className="grid gap-3 sm:gap-6 grid-cols-2 lg:grid-cols-3">
          {filtered.map((performer) => (
            <Card
              key={performer.id}
              className="glass-card border-border/30 hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer"
              onClick={() => setSelectedPerformer(performer)}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-1 sm:gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Mic2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs sm:text-base flex items-center gap-1 truncate">
                        {performer.full_name}
                        {performer.verification_status === 'verified' && (
                          <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                        )}
                      </h3>
                      <p className="text-[10px] text-muted-foreground truncate">{performer.city || 'Location varies'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {performer.niche && <Badge variant="outline" className="text-[8px] sm:text-xs px-1 py-0">{performer.niche}</Badge>}
                    {(() => { const ts = calcTrust(performer); return (
                      <span className={`text-[8px] sm:text-xs font-bold ${trustColor(ts)}`}>T {ts}</span>
                    ); })()}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground pt-2">
                  <span className="flex items-center gap-1 font-medium"><Star className="h-3 w-3 text-amber-500" /> Professional</span>
                  {performer.pricing_per_post ? <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />From ₹{performer.pricing_per_post.toLocaleString()}</span> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Performer Detail Dialog */}
      <Dialog open={!!selectedPerformer} onOpenChange={(open) => !open && setSelectedPerformer(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedPerformer && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-wrap gap-2">
                    {selectedPerformer.verification_status === 'verified' ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        <CheckCircle className="h-3 w-3 mr-1" /> Verified Talent
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-500/30">
                        <Shield className="h-3 w-3 mr-1" /> Pending Verification
                      </Badge>
                    )}
                  </div>
                  {selectedPerformer.niche && <Badge variant="outline">{selectedPerformer.niche}</Badge>}
                </div>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  {selectedPerformer.full_name}
                  <Music className="h-5 w-5 text-primary" />
                </DialogTitle>
                <DialogDescription className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" /> {selectedPerformer.city || 'India'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-sm font-medium">Talent Trust Score</span>
                  {(() => { const ts = calcTrust(selectedPerformer); return (
                    <span className={`text-2xl font-bold ${trustColor(ts)}`}>{ts} <span className="text-xs font-normal text-muted-foreground">/ 100</span></span>
                  ); })()}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-1 flex items-center gap-1"><Star className="h-4 w-4 text-primary" /> About the Artist</h4>
                    <p className="text-sm text-muted-foreground bg-muted/20 p-3 rounded border border-border/20">
                      {selectedPerformer.business_description || "A professional performer dedicated to delivering exceptional experiences at events."}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-1 flex items-center gap-1"><IndianRupee className="h-4 w-4 text-primary" /> Performance Rates</h4>
                    <p className="text-sm">
                      Starting at <span className="font-semibold text-primary">₹{selectedPerformer.pricing_per_post?.toLocaleString() || 0}</span> 
                      <span className="text-muted-foreground text-xs ml-1">per event / performance</span>
                    </p>
                  </div>

                  {selectedPerformer.portfolio_urls && selectedPerformer.portfolio_urls.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                       {selectedPerformer.portfolio_urls.map((url, i) => (
                         <Button key={i} variant="outline" size="sm" onClick={() => window.open(url, '_blank')} className="truncate">
                           <ExternalLink className="h-3 w-3 mr-2" /> Portfolio {i+1}
                         </Button>
                       ))}
                    </div>
                  )}
                </div>

                {!showRequestForm ? (
                  <div className="pt-4 border-t border-border/30">
                    <Button className="w-full" onClick={() => setShowRequestForm(true)}>
                      <Send className="h-4 w-4 mr-2" /> Request Booking
                    </Button>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-border/30 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                    <h4 className="font-semibold text-sm">Booking Details</h4>
                    
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Performance Type</p>
                      <Select value={bookingType} onValueChange={setBookingType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Full Performance">Full Performance</SelectItem>
                          <SelectItem value="Guest Appearance">Guest Appearance</SelectItem>
                          <SelectItem value="Collaborative Set">Collaborative Set</SelectItem>
                          <SelectItem value="Opening/Closing Act">Opening/Closing Act</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Proposed Budget (₹)</p>
                      <Input type="number" placeholder="e.g. 50000" value={budget} onChange={(e) => setBudget(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Performance Requirements</p>
                      <Textarea placeholder="e.g. Sound system required, Stage dimensions, Duration..." className="h-20" value={requirements} onChange={(e) => setRequirements(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Message</p>
                      <Textarea placeholder="Details about your event and why you'd like to book them..." className="h-24" value={message} onChange={(e) => setMessage(e.target.value)} />
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

export default BrowsePerformers;

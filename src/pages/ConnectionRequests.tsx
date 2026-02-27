import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ConnectionRequest } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, X, Clock, Building, Calendar, MapPin, IndianRupee, Users, FileText, Send, Eye, Globe, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const ConnectionRequests = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [incoming, setIncoming] = useState<ConnectionRequest[]>([]);
  const [outgoing, setOutgoing] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedReq, setSelectedReq] = useState<ConnectionRequest | null>(null);
  const [selectedIsIncoming, setSelectedIsIncoming] = useState(false);

  const loadRequests = async () => {
    if (!user) { setLoading(false); return; }

    const { data: inc, error: incErr } = await supabase
      .from('connection_requests')
      .select('*, sender:users!connection_requests_sender_id_fkey(*), receiver:users!connection_requests_receiver_id_fkey(*), event:events(*)')
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false });
    if (incErr) console.error('[Requests] incoming error:', incErr);

    const { data: out, error: outErr } = await supabase
      .from('connection_requests')
      .select('*, sender:users!connection_requests_sender_id_fkey(*), receiver:users!connection_requests_receiver_id_fkey(*), event:events(*)')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false });
    if (outErr) console.error('[Requests] outgoing error:', outErr);

    setIncoming(inc || []);
    setOutgoing(out || []);
    setLoading(false);
  };

  useEffect(() => { loadRequests(); }, [user]);

  const handleAccept = async (req: ConnectionRequest) => {
    if (!user || !req.event) return;
    setProcessing(req.id);
    try {
      const { error: updateErr } = await supabase.from('connection_requests').update({ status: 'accepted' }).eq('id', req.id);
      if (updateErr) throw updateErr;

      const organizerId = req.request_type === 'sponsor_to_organizer' ? req.receiver_id : req.sender_id;
      const sponsorId = req.request_type === 'sponsor_to_organizer' ? req.sender_id : req.receiver_id;

      const { data: existingConv } = await supabase
        .from('conversations').select('id')
        .eq('event_id', req.event.id).eq('organizer_id', organizerId).eq('sponsor_id', sponsorId)
        .maybeSingle();

      if (!existingConv) {
        const { error: convErr } = await supabase.from('conversations').insert({ event_id: req.event.id, organizer_id: organizerId, sponsor_id: sponsorId });
        if (convErr) throw convErr;
      }

      toast.success('Request accepted! A conversation has been created.');
      setSelectedReq(null);
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept');
    } finally { setProcessing(null); }
  };

  const handleReject = async (reqId: string) => {
    setProcessing(reqId);
    try {
      const { error } = await supabase.from('connection_requests').update({ status: 'rejected' }).eq('id', reqId);
      if (error) throw error;
      toast.success('Request rejected.');
      setSelectedReq(null);
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject');
    } finally { setProcessing(null); }
  };

  const statusBadge = (status: string) => {
    if (status === 'pending') return <Badge variant="outline" className="text-yellow-500 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    if (status === 'accepted') return <Badge variant="outline" className="text-green-500 border-green-500/30"><Check className="h-3 w-3 mr-1" />Accepted</Badge>;
    return <Badge variant="outline" className="text-red-400 border-red-400/30"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
  };

  const renderRequestCard = (req: ConnectionRequest, isIncoming: boolean) => {
    const otherUser = isIncoming ? req.sender : req.receiver;
    const isProposal = req.request_type === 'organizer_to_sponsor';

    return (
      <Card
        key={req.id}
        className="glass-card border-border/30 cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
        onClick={() => { setSelectedReq(req); setSelectedIsIncoming(isIncoming); }}
      >
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                {isProposal ? <Send className="h-5 w-5 text-primary" /> : <Building className="h-5 w-5 text-primary" />}
              </div>
              <div>
                <h3 className="font-semibold">{otherUser?.organization_name || otherUser?.full_name}</h3>
                <p className="text-xs text-muted-foreground">
                  {isProposal ? 'Event Proposal' : 'Connection Request'} • {new Date(req.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            {statusBadge(req.status)}
          </div>

          {req.event && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span className="font-medium">{req.event.name}</span>
              <span>•</span>
              <span>{req.event.city}</span>
            </div>
          )}

          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Eye className="h-3 w-3" /> Click to view full details
          </p>
        </CardContent>
      </Card>
    );
  };

  const DetailRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number | undefined | null }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-2">
        <div className="text-muted-foreground mt-0.5">{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium">{String(value)}</p>
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  const pendingIncoming = incoming.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Connection Requests</h1>

      <Tabs defaultValue="incoming">
        <TabsList>
          <TabsTrigger value="incoming">
            Incoming {pendingIncoming > 0 && <Badge className="ml-1.5 h-5 min-w-[20px] text-xs">{pendingIncoming}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="outgoing">Sent</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="mt-4">
          {incoming.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No incoming requests yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">{incoming.map((r) => renderRequestCard(r, true))}</div>
          )}
        </TabsContent>

        <TabsContent value="outgoing" className="mt-4">
          {outgoing.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No sent requests yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">{outgoing.map((r) => renderRequestCard(r, false))}</div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedReq} onOpenChange={(open) => !open && setSelectedReq(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-auto">
          {selectedReq && (() => {
            const otherUser = selectedIsIncoming ? selectedReq.sender : selectedReq.receiver;
            const isProposal = selectedReq.request_type === 'organizer_to_sponsor';
            const evt = selectedReq.event;

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle>{isProposal ? 'Event Proposal' : 'Connection Request'}</DialogTitle>
                    {statusBadge(selectedReq.status)}
                  </div>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Sender info */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {isProposal ? <Send className="h-5 w-5 text-primary" /> : <Building className="h-5 w-5 text-primary" />}
                    </div>
                    <div>
                      <p className="font-semibold">{otherUser?.organization_name || otherUser?.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedIsIncoming ? 'Sent to you' : 'Sent by you'} on {new Date(selectedReq.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {selectedReq.message && (
                    <div className="bg-muted/20 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1 font-medium">Message</p>
                      <p className="text-sm">{selectedReq.message}</p>
                    </div>
                  )}

                  {/* Full Event Details */}
                  {evt && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-bold text-base mb-1">{evt.name}</h3>
                        <p className="text-sm text-muted-foreground">{evt.description}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4">
                        <DetailRow icon={<Calendar className="h-4 w-4" />} label="Date" value={new Date(evt.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
                        <DetailRow icon={<MapPin className="h-4 w-4" />} label="Location" value={`${(evt as any).venue || ''} ${evt.city}`.trim()} />
                        <DetailRow icon={<IndianRupee className="h-4 w-4" />} label="Budget Required" value={`₹${evt.budget_required?.toLocaleString()}`} />
                        <DetailRow icon={<Users className="h-4 w-4" />} label="Expected Footfall" value={evt.expected_footfall?.toLocaleString()} />
                        <DetailRow icon={<TrendingUp className="h-4 w-4" />} label="Past Footfall" value={(evt as any).past_footfall?.toLocaleString()} />
                        <DetailRow icon={<Globe className="h-4 w-4" />} label="Category" value={evt.category} />
                      </div>

                      {evt.sponsorship_tiers && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Sponsorship Tiers</p>
                          <p className="text-sm bg-muted/20 p-2 rounded">{evt.sponsorship_tiers}</p>
                        </div>
                      )}

                      {evt.sponsor_deliverables && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Sponsor Deliverables</p>
                          <p className="text-sm bg-muted/20 p-2 rounded">{evt.sponsor_deliverables}</p>
                        </div>
                      )}

                      {(evt as any).media_coverage && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Media Coverage</p>
                          <p className="text-sm bg-muted/20 p-2 rounded">{(evt as any).media_coverage}</p>
                        </div>
                      )}

                      {(evt as any).usp && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">USP</p>
                          <p className="text-sm bg-muted/20 p-2 rounded">{(evt as any).usp}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{evt.category}</Badge>
                        {evt.pitch_deck_url && (
                          <a href={evt.pitch_deck_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <FileText className="h-3 w-3" /> View Pitch Deck
                          </a>
                        )}
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Actions */}
                  {selectedIsIncoming && selectedReq.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button onClick={() => handleAccept(selectedReq)} disabled={processing === selectedReq.id} className="flex-1">
                        <Check className="h-4 w-4 mr-1" /> Accept
                      </Button>
                      <Button variant="outline" onClick={() => handleReject(selectedReq.id)} disabled={processing === selectedReq.id} className="flex-1">
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  )}

                  {selectedReq.status === 'accepted' && (
                    <Button variant="outline" className="w-full" onClick={() => { setSelectedReq(null); navigate('/messages'); }}>
                      Go to Messages
                    </Button>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConnectionRequests;
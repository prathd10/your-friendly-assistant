import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ConnectionRequest } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Check, X, Clock, Building, Calendar, MapPin, IndianRupee, Users, FileText, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const ConnectionRequests = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [incoming, setIncoming] = useState<ConnectionRequest[]>([]);
  const [outgoing, setOutgoing] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadRequests = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
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
      // Update request status
      const { error: updateErr } = await supabase
        .from('connection_requests')
        .update({ status: 'accepted' })
        .eq('id', req.id);
      if (updateErr) throw updateErr;

      // Create conversation
      const organizerId = req.request_type === 'sponsor_to_organizer' ? req.receiver_id : req.sender_id;
      const sponsorId = req.request_type === 'sponsor_to_organizer' ? req.sender_id : req.receiver_id;

      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('event_id', req.event.id)
        .eq('organizer_id', organizerId)
        .eq('sponsor_id', sponsorId)
        .maybeSingle();

      if (!existingConv) {
        const { error: convErr } = await supabase
          .from('conversations')
          .insert({
            event_id: req.event.id,
            organizer_id: organizerId,
            sponsor_id: sponsorId,
          });
        if (convErr) throw convErr;
      }

      toast.success('Request accepted! A conversation has been created.');
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (reqId: string) => {
    setProcessing(reqId);
    try {
      const { error } = await supabase
        .from('connection_requests')
        .update({ status: 'rejected' })
        .eq('id', reqId);
      if (error) throw error;
      toast.success('Request rejected.');
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject');
    } finally {
      setProcessing(null);
    }
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
      <Card key={req.id} className="glass-card border-border/30">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                {isProposal ? <Send className="h-5 w-5 text-primary" /> : <Building className="h-5 w-5 text-primary" />}
              </div>
              <div>
                <h3 className="font-semibold">{otherUser?.organization_name || otherUser?.full_name}</h3>
                <p className="text-xs text-muted-foreground">
                  {isProposal ? 'Event Proposal' : 'Connection Request'} •{' '}
                  {new Date(req.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            {statusBadge(req.status)}
          </div>

          {req.message && (
            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">{req.message}</p>
          )}

          {/* Event card preview */}
          {req.event && (
            <>
              <Separator />
              <div className="bg-muted/20 rounded-lg p-3 space-y-2">
                <p className="font-semibold text-sm">{req.event.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{req.event.description}</p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(req.event.event_date).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{req.event.city}</span>
                  <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />₹{req.event.budget_required.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{req.event.expected_footfall}</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-xs">{req.event.category}</Badge>
                  {req.event.pitch_deck_url && (
                    <a href={req.event.pitch_deck_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <FileText className="h-3 w-3" /> Pitch Deck
                    </a>
                  )}
                </div>
                {req.event.sponsorship_tiers && (
                  <div className="text-xs">
                    <span className="text-muted-foreground font-medium">Tiers: </span>
                    <span className="text-muted-foreground">{req.event.sponsorship_tiers}</span>
                  </div>
                )}
                {req.event.sponsor_deliverables && (
                  <div className="text-xs">
                    <span className="text-muted-foreground font-medium">Deliverables: </span>
                    <span className="text-muted-foreground">{req.event.sponsor_deliverables}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Accept / Reject for incoming pending requests */}
          {isIncoming && req.status === 'pending' && (
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => handleAccept(req)}
                disabled={processing === req.id}
              >
                <Check className="h-4 w-4 mr-1" /> Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReject(req.id)}
                disabled={processing === req.id}
              >
                <X className="h-4 w-4 mr-1" /> Reject
              </Button>
            </div>
          )}

          {/* Go to messages for accepted */}
          {req.status === 'accepted' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/messages')}
            >
              Go to Messages
            </Button>
          )}
        </CardContent>
      </Card>
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
    </div>
  );
};

export default ConnectionRequests;

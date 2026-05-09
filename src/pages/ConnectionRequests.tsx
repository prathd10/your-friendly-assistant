import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ConnectionRequest } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IndianRupee, Users, FileText, Send, Eye, Globe, TrendingUp, Target, FileSignature, Loader2, Download, Lock, Clock, Check, X, Calendar, MapPin, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { generateMOUDraft } from '@/lib/ai-service';
import { downloadMOUAsPDF } from '@/lib/mou-pdf';
import { Textarea } from '@/components/ui/textarea';

const ConnectionRequests = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [incoming, setIncoming] = useState<ConnectionRequest[]>([]);
  const [outgoing, setOutgoing] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedReq, setSelectedReq] = useState<ConnectionRequest | null>(null);
  const [selectedIsIncoming, setSelectedIsIncoming] = useState(false);

  // MOU States
  const [mouEditorOpen, setMouEditorOpen] = useState(false);
  const [draftMOU, setDraftMOU] = useState('');
  const [isDraftingMOU, setIsDraftingMOU] = useState(false);
  const [isSendingMOU, setIsSendingMOU] = useState(false);
  const [isFunding, setIsFunding] = useState(false);

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
    setProcessing(req.id);
    try {
      const { error: updateErr } = await supabase.from('connection_requests').update({ status: 'accepted' }).eq('id', req.id);
      if (updateErr) throw updateErr;

      // Determine organizer_id and sponsor_id for the conversation thread
      // Conversations table has organizer_id and sponsor_id columns (used for all threads).
      // For creator threads we put the non-creator in the more applicable column and the creator in the other.
      let organizerId: string;
      let sponsorId: string;

      switch (req.request_type) {
        case 'sponsor_to_organizer': organizerId = req.receiver_id; sponsorId = req.sender_id; break;
        case 'organizer_to_sponsor': organizerId = req.sender_id; sponsorId = req.receiver_id; break;
        case 'organizer_to_creator': organizerId = req.sender_id; sponsorId = req.receiver_id; break; // creator in sponsor slot
        case 'sponsor_to_creator': organizerId = req.receiver_id; sponsorId = req.sender_id; break;  // creator in organizer slot
        case 'creator_to_organizer': organizerId = req.receiver_id; sponsorId = req.sender_id; break;  // creator in sponsor slot
        case 'creator_to_sponsor': organizerId = req.sender_id; sponsorId = req.receiver_id; break; // creator in organizer slot
        default: organizerId = req.sender_id; sponsorId = req.receiver_id;
      }

      const eventId = req.event?.id || null;

      const { data: existingConv } = await supabase
        .from('conversations').select('id')
        .eq('organizer_id', organizerId)
        .eq('sponsor_id', sponsorId)
        .maybeSingle();

      if (!existingConv) {
        // Only include event_id if it exists — conversations table may have it NOT NULL
        // Make sure to run: ALTER TABLE conversations ALTER COLUMN event_id DROP NOT NULL;
        const convPayload: Record<string, any> = { organizer_id: organizerId, sponsor_id: sponsorId };
        if (eventId) convPayload.event_id = eventId;

        const { error: convErr } = await supabase.from('conversations').insert(convPayload);
        if (convErr) throw convErr;
      }

      toast.success('Request accepted! Opening conversation...');
      setSelectedReq(null);
      navigate('/messages');
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

  const handleDraftMOU = async () => {
    if (!selectedReq) return;
    setIsDraftingMOU(true);
    try {
      const draft = await generateMOUDraft(selectedReq);
      setDraftMOU(draft);
      setMouEditorOpen(true);
    } catch (err) {
      toast.error('Failed to generate MOU draft. Please try again.');
    } finally {
      setIsDraftingMOU(false);
    }
  };

  const handleSendMOU = async () => {
    if (!selectedReq || !draftMOU.trim()) return;
    setIsSendingMOU(true);
    try {
      // 1. Find or create conversation (similar logic to handleAccept)
      let organizerId: string;
      let sponsorId: string;

      switch (selectedReq.request_type) {
        case 'sponsor_to_organizer': organizerId = selectedReq.receiver_id; sponsorId = selectedReq.sender_id; break;
        case 'organizer_to_sponsor': organizerId = selectedReq.sender_id; sponsorId = selectedReq.receiver_id; break;
        case 'organizer_to_creator': organizerId = selectedReq.sender_id; sponsorId = selectedReq.receiver_id; break;
        case 'sponsor_to_creator': organizerId = selectedReq.receiver_id; sponsorId = selectedReq.sender_id; break;
        case 'creator_to_organizer': organizerId = selectedReq.receiver_id; sponsorId = selectedReq.sender_id; break;
        case 'creator_to_sponsor': organizerId = selectedReq.sender_id; sponsorId = selectedReq.receiver_id; break;
        default: organizerId = selectedReq.sender_id; sponsorId = selectedReq.receiver_id;
      }

      const { data: conv } = await supabase
        .from('conversations').select('id')
        .eq('organizer_id', organizerId)
        .eq('sponsor_id', sponsorId)
        .maybeSingle();

      if (!conv) {
        toast.error('No conversation found. Please ensure the request is fully accepted.');
        return;
      }

      // 2. Send the MOU as a formatted document message
      const mouMessage = `[MOU_DOCUMENT_v1]\n\n${draftMOU}`;

      const { error: msgErr } = await supabase.from('messages').insert({
        conversation_id: conv.id,
        sender_id: user?.id,
        receiver_id: organizerId === user?.id ? sponsorId : organizerId,
        content: mouMessage
      });

      if (msgErr) throw msgErr;

      toast.success('Official Partnership MOU finalized and sent!');
      setMouEditorOpen(false);
      setSelectedReq(null);
      navigate('/messages');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send MOU');
    } finally {
      setIsSendingMOU(false);
    }
  };

  const handleFundEvent = async () => {
    if (!selectedReq || !selectedReq.event_id || !selectedReq.event?.budget_required) return;

    setIsFunding(true);
    try {
      const { error } = await supabase.rpc('fund_event_escrow', {
        p_event_id: selectedReq.event_id,
        p_amount: selectedReq.event.budget_required,
        p_request_id: selectedReq.id
      });

      if (error) throw error;

      toast.success(`Successfully funded ₹${selectedReq.event.budget_required.toLocaleString()} to escrow!`);
      // Update local state or refetch if needed
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to fund event. Check your balance.');
    } finally {
      setIsFunding(false);
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'pending') return <Badge variant="outline" className="text-yellow-500 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    if (status === 'accepted') return <Badge variant="outline" className="text-green-500 border-green-500/30"><Check className="h-3 w-3 mr-1" />Accepted</Badge>;
    return <Badge variant="outline" className="text-red-400 border-red-400/30"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
  };

  const renderRequestCard = (req: ConnectionRequest, isIncoming: boolean) => {
    const otherUser = isIncoming ? req.sender : req.receiver;
    const isCreatorRequest = req.request_type === 'organizer_to_creator' || req.request_type === 'sponsor_to_creator';
    const isCreatorPitch = req.request_type === 'creator_to_organizer' || req.request_type === 'creator_to_sponsor';
    const hasCampaignDetails = isCreatorRequest || isCreatorPitch;
    const isProposal = req.request_type === 'organizer_to_sponsor';

    return (
      <Card
        key={req.id}
        className="glass-card border-border/30 cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
        onClick={() => { setSelectedReq(req); setSelectedIsIncoming(isIncoming); }}
      >
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {isProposal || isCreatorRequest || isCreatorPitch ? <Send className="h-5 w-5 text-primary" /> : <Building className="h-5 w-5 text-primary" />}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold truncate" title={otherUser?.organization_name || otherUser?.full_name || ''}>
                  {otherUser?.organization_name || otherUser?.full_name}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {isProposal ? 'Event Proposal' : isCreatorRequest ? 'Campaign Request' : isCreatorPitch ? 'Creator Pitch' : 'Connection Request'} • {new Date(req.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="shrink-0 pt-0.5">
              {statusBadge(req.status)}
            </div>
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
            const isCreatorRequest = selectedReq.request_type.includes('_to_creator');
            const evt = selectedReq.event;

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle>
                      {isCreatorRequest ? 'Creator Campaign Request' : isProposal ? 'Event Proposal' : 'Connection Request'}
                    </DialogTitle>
                    {statusBadge(selectedReq.status)}
                  </div>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Sender info */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
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
                    {otherUser?.role === 'organizer' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary h-8 hidden sm:flex"
                        onClick={() => navigate(`/organizer/${otherUser.id}`)}
                      >
                        View Profile
                      </Button>
                    )}
                  </div>
                  {otherUser?.role === 'organizer' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-primary h-8 sm:hidden mt-2"
                      onClick={() => navigate(`/organizer/${otherUser.id}`)}
                    >
                      <Building className="h-3 w-3 mr-2" /> View Organizer Profile
                    </Button>
                  )}

                  {selectedReq.message && (
                    <div className="bg-muted/20 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1 font-medium">Message</p>
                      <p className="text-sm">{selectedReq.message}</p>
                    </div>
                  )}

                  {/* Campaign Details for Creators */}
                  {selectedReq.campaign_details && (
                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" /> Campaign Details
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {selectedReq.campaign_details.campaignType && (
                          <div>
                            <p className="text-xs text-muted-foreground">Type</p>
                            <p className="font-medium">{selectedReq.campaign_details.campaignType}</p>
                          </div>
                        )}
                        {selectedReq.campaign_details.budget && (
                          <div>
                            <p className="text-xs text-muted-foreground">Budget</p>
                            <p className="font-medium text-primary">₹{selectedReq.campaign_details.budget.toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                      {selectedReq.campaign_details.deliverables && (
                        <div>
                          <p className="text-xs text-muted-foreground">Required Deliverables</p>
                          <p className="text-sm">{selectedReq.campaign_details.deliverables}</p>
                        </div>
                      )}
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
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => { setSelectedReq(null); navigate('/messages'); }}>
                          <Send className="h-4 w-4 mr-2" /> Go to Messages
                        </Button>

                        {profile?.role === 'organizer' && (
                          <Button
                            className="flex-1 bg-primary hover:bg-primary/90"
                            onClick={handleDraftMOU}
                            disabled={isDraftingMOU}
                          >
                            {isDraftingMOU ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <FileSignature className="h-4 w-4 mr-2" />
                            )}
                            Send MOU
                          </Button>
                        )}
                      </div>

                      {profile?.role === 'sponsor' && (
                        <Button
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2 h-11"
                          onClick={handleFundEvent}
                          disabled={isFunding || !selectedReq.event?.budget_required}
                        >
                          {isFunding ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                          Fund Event (₹{selectedReq.event?.budget_required?.toLocaleString()})
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* MOU Editor Dialog */}
      <Dialog open={mouEditorOpen} onOpenChange={setMouEditorOpen}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              Draft Official MOU
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Review and edit the AI-generated MOU draft before sending it to the partner.
            </p>
          </DialogHeader>

          <div className="flex-1 py-4">
            <Textarea
              value={draftMOU}
              onChange={(e) => setDraftMOU(e.target.value)}
              className="h-full font-mono text-sm resize-none border-primary/20 bg-muted/20"
              placeholder="Drafting MOU..."
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            <Button
              variant="outline"
              onClick={() => downloadMOUAsPDF(draftMOU, selectedReq?.event?.name || 'Campaign')}
              className="border-primary/20 hover:bg-primary/5"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Preview
            </Button>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setMouEditorOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSendMOU}
                disabled={isSendingMOU || !draftMOU.trim()}
                className="min-w-[150px] bg-primary hover:bg-primary/90"
              >
                {isSendingMOU ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Finalizing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Finalize & Send PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConnectionRequests;
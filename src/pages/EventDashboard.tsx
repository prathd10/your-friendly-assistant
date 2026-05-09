import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Calendar, MapPin, Users, Sparkles, FileBarChart, Film, 
  ChevronLeft, Edit3, Rocket, Loader2, Info, Mail, Phone, User, Globe, Lock, Gift, Trash2, Plus
} from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import AIPitchDeck from '@/components/AIPitchDeck';
import AIVideoGenerator from '@/components/AIVideoGenerator';
import { generateEventPitch, generateVideoScript } from '@/lib/ai-service';

const EventDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [generatingPitch, setGeneratingPitch] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [aiPitchData, setAiPitchData] = useState<any>(null);
  const [aiVideoData, setAiVideoData] = useState<any>(null);

  const { data: event, isLoading, refetch } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: perks, refetch: refetchPerks } = useQuery({
    queryKey: ['perks', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_perks')
        .select('*')
        .eq('event_id', id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const [showPerkDialog, setShowPerkDialog] = useState(false);
  const [perkData, setPerkData] = useState({ title: '', description: '', code: '' });
  const [perkLoading, setPerkLoading] = useState(false);

  const handleAddPerk = async (e: React.FormEvent) => {
    e.preventDefault();
    setPerkLoading(true);
    const { error } = await supabase
      .from('event_perks')
      .insert({ event_id: id, ...perkData });

    if (error) {
      toast.error('Failed to add perk: ' + error.message);
    } else {
      toast.success('Perk added successfully!');
      setShowPerkDialog(false);
      setPerkData({ title: '', description: '', code: '' });
      refetchPerks();
    }
    setPerkLoading(false);
  };

  const deletePerk = async (perkId: string) => {
    const { error } = await supabase.from('event_perks').delete().eq('id', perkId);
    if (error) toast.error('Failed to delete perk');
    else {
      toast.success('Perk removed');
      refetchPerks();
    }
  };

  const { data: rsvps, isLoading: rsvpsLoading } = useQuery({
    queryKey: ['rsvps', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rsvps')
        .select('*')
        .eq('event_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handlePublish = async () => {
    if (!event) return;
    
    // Mandatory field check
    const mandatoryFields = [
      { name: 'Event Name', key: 'name' },
      { name: 'Category', key: 'category' },
      { name: 'Description', key: 'description' },
      { name: 'City', key: 'city' },
      { name: 'Date', key: 'event_date' },
      { name: 'Budget', key: 'budget_required' },
      { name: 'Expected Footfall', key: 'expected_footfall' },
      { name: 'Sponsorship Tiers', key: 'sponsorship_tiers' },
      { name: 'USP', key: 'usp' }
    ];

    const missingFields = mandatoryFields
      .filter(f => !event[f.key])
      .map(f => f.name);

    if (missingFields.length > 0) {
      toast.error(`Please fill all mandatory fields before publishing: ${missingFields.join(', ')}`);
      return;
    }

    const { error } = await supabase
      .from('events')
      .update({ status: 'active' })
      .eq('id', id);

    if (error) {
      toast.error('Failed to publish event: ' + error.message);
    } else {
      toast.success('Event published successfully!');
      refetch();
    }
  };

  const togglePrivacy = async () => {
    if (!event) return;
    const newPrivacy = !event.is_public;
    const { error } = await supabase
      .from('events')
      .update({ is_public: newPrivacy })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update privacy: ' + error.message);
    } else {
      toast.success(`Event is now ${newPrivacy ? 'Public' : 'Private'}`);
      refetch();
    }
  };

  const handleGeneratePitch = async () => {
    if (!event) return;
    
    // If we already have a deck, just show it
    if (event.ai_pitch_deck) {
      setAiPitchData(event.ai_pitch_deck);
      setShowPitchModal(true);
      return;
    }

    setGeneratingPitch(true);
    try {
      const data = await generateEventPitch(event, event.past_event_media || []);
      setAiPitchData(data);
      
      // Auto-save to database so it's persisted across tab switches
      await supabase
        .from('events')
        .update({ ai_pitch_deck: data })
        .eq('id', id);
        
      setShowPitchModal(true);
      toast.success("AI Pitch Deck generated and saved!");
      refetch(); // Refresh local event data to reflect the new deck
    } catch (error: any) {
      toast.error(error.message || "Failed to generate pitch.");
    } finally {
      setGeneratingPitch(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!event) return;
    
    // If we already have a script, just show it
    if (event.ai_video_script) {
      setAiVideoData(event.ai_video_script);
      setShowVideoModal(true);
      return;
    }

    setGeneratingVideo(true);
    try {
      const data = await generateVideoScript(event);
      setAiVideoData(data);
      
      // Auto-save to database
      await supabase
        .from('events')
        .update({ ai_video_script: data })
        .eq('id', id);
        
      setShowVideoModal(true);
      toast.success("AI Video Script generated and saved!");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate video.");
    } finally {
      setGeneratingVideo(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (!event) return <div>Event not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link to="/my-events" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mb-2">
            <ChevronLeft className="h-3 w-3" /> Back to My Events
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
            <Badge variant={event.status === 'draft' ? 'outline' : 'default'} className={event.status === 'draft' ? 'bg-muted' : 'bg-primary/20 text-primary border-primary/20'}>
              {event.status.toUpperCase()}
            </Badge>
          </div>
          <p className="text-muted-foreground">{event.category} Event in {event.city}</p>
        </div>
        <div className="flex items-center gap-2">
          {event.status === 'active' && (
            <Button variant="outline" onClick={togglePrivacy} title={event.is_public ? "Hide from landing page" : "Show on landing page"}>
              {event.is_public ? <Globe className="h-4 w-4 mr-2 text-green-500" /> : <Lock className="h-4 w-4 mr-2 text-yellow-500" />}
              {event.is_public ? 'Public' : 'Private'}
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate(`/event/${id}/edit`)}>
            <Edit3 className="h-4 w-4 mr-2" /> Edit Event
          </Button>
          {event.status === 'draft' && (
            <Button onClick={handlePublish} className="bg-primary hover:bg-primary/90 shadow-md">
              <Rocket className="h-4 w-4 mr-2" /> Publish Now
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Overview */}
        <div className="md:col-span-2 space-y-6">
          <Card className="glass-card border-border/30 overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" /> Event Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Date & Time</p>
                  <p className="flex items-center gap-2 font-medium">
                    <Calendar className="h-4 w-4 text-primary" />
                    {new Date(event.event_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Location</p>
                  <p className="flex items-center gap-2 font-medium">
                    <MapPin className="h-4 w-4 text-primary" />
                    {event.city}, {event.state || 'India'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Expected Audience</p>
                  <p className="flex items-center gap-2 font-medium">
                    <Users className="h-4 w-4 text-primary" />
                    {event.expected_footfall.toLocaleString()} Attendees
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Budget Goal</p>
                  <p className="flex items-center gap-2 font-medium">
                    ₹ {event.budget_required.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Event Description</p>
                <p className="text-sm leading-relaxed">{event.description}</p>
              </div>

              {event.target_demographics && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Target Audience</p>
                  <p className="text-sm">{event.target_demographics}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* RSVP List Section */}
          <Card className="glass-card border-border/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Attendee RSVPs
              </CardTitle>
              <CardDescription>People who expressed interest via the public landing page</CardDescription>
            </CardHeader>
            <CardContent>
              {rsvpsLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="animate-spin h-5 w-5 text-primary" /></div>
              ) : !rsvps || rsvps.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                  <p className="text-sm">No RSVPs yet. They'll appear here once guest users sign up from the landing page.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rsvps.map((rsvp: any) => (
                    <div key={rsvp.id} className="flex items-center justify-between p-3 rounded-lg border bg-background/50 hover:bg-background transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{rsvp.full_name}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(rsvp.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <a href={`mailto:${rsvp.email}`} className="text-muted-foreground hover:text-primary transition-colors">
                          <Mail className="h-4 w-4" />
                        </a>
                        {rsvp.phone && (
                          <a href={`tel:${rsvp.phone}`} className="text-muted-foreground hover:text-primary transition-colors">
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Perks Management Section */}
          <Card className="glass-card border-border/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" /> Sponsor Perks
                </CardTitle>
                <CardDescription>Reward attendees with discount codes or links</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowPerkDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Add Perk
              </Button>
            </CardHeader>
            <CardContent>
              {!perks || perks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                  <p className="text-sm italic">No perks added yet. Incentivize RSVPs by adding sponsor discounts!</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {perks.map((perk: any) => (
                    <div key={perk.id} className="flex items-center justify-between p-4 rounded-xl border bg-primary/5 border-primary/10">
                      <div>
                        <p className="font-bold text-sm">{perk.title}</p>
                        <p className="text-xs text-muted-foreground">{perk.description}</p>
                        {perk.code && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Code:</span>
                            <code className="text-xs bg-primary/20 px-2 py-0.5 rounded font-mono text-primary">{perk.code}</code>
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deletePerk(perk.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: AI Studio */}
        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> AI Creative Studio
              </CardTitle>
              <CardDescription>Generate premium assets to attract more sponsors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                variant="outline" 
                className="w-full justify-start h-14 gap-3 bg-background hover:bg-primary/5 border-primary/20 transition-all font-semibold"
                onClick={handleGeneratePitch}
                disabled={generatingPitch}
              >
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  {generatingPitch ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <FileBarChart className="h-4 w-4 text-primary" />}
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm">{event.ai_pitch_deck ? 'View Pitch Deck' : 'Pitch Deck Generator'}</p>
                  <p className="text-[10px] text-muted-foreground font-normal">
                    {event.ai_pitch_deck ? 'Open your generated deck' : 'Generate 10 professional slides'}
                  </p>
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="w-full justify-start h-14 gap-3 bg-secondary/5 hover:bg-secondary/10 border-secondary/20 transition-all font-semibold"
                onClick={handleGenerateVideo}
                disabled={generatingVideo}
              >
                <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                  {generatingVideo ? <Loader2 className="h-4 w-4 animate-spin text-secondary" /> : <Film className="h-4 w-4 text-secondary" />}
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm">{event.ai_video_script ? 'Watch Video Pitch' : 'Promo Video Script'}</p>
                  <p className="text-[10px] text-muted-foreground font-normal">
                    {event.ai_video_script ? 'View your saved pitch' : 'AI-driven video narrative'}
                  </p>
                </div>
              </Button>

              {event.status === 'draft' && (
                <div className="pt-4 mt-4 border-t border-primary/10">
                  <p className="text-[10px] text-muted-foreground text-center italic">
                    Asset generation works best with complete event details.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Modals */}
      <Dialog open={showPitchModal} onOpenChange={setShowPitchModal}>
        <DialogContent className="max-w-4xl p-0 border-none bg-transparent shadow-none overflow-visible">
          <DialogHeader className="sr-only">
            <DialogTitle>AI Pitch Deck Preview</DialogTitle>
            <DialogDescription>Review and download your generated event pitch deck.</DialogDescription>
          </DialogHeader>
          <AIPitchDeck data={aiPitchData} eventId={id} />
        </DialogContent>
      </Dialog>

      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="max-w-4xl p-0 border-none bg-transparent shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>AI Video Pitch Preview</DialogTitle>
            <DialogDescription>Review your generated AI video pitch script and visuals.</DialogDescription>
          </DialogHeader>
          <AIVideoGenerator eventData={event} media={event.past_event_media || []} script={aiVideoData} eventId={id} />
        </DialogContent>
      </Dialog>

      {/* Add Perk Dialog */}
      <Dialog open={showPerkDialog} onOpenChange={setShowPerkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Sponsor Perk</DialogTitle>
            <DialogDescription>
              This will be shown to guests immediately after they RSVP for your event.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddPerk} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Perk Title *</Label>
              <Input 
                placeholder="e.g. 20% off on Starbucks" 
                value={perkData.title}
                onChange={(e) => setPerkData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                placeholder="e.g. Valid at all Mumbai outlets" 
                value={perkData.description}
                onChange={(e) => setPerkData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Discount Code / Link</Label>
              <Input 
                placeholder="e.g. SBX20 or https://..." 
                value={perkData.code}
                onChange={(e) => setPerkData(prev => ({ ...prev, code: e.target.value }))}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={perkLoading} className="w-full">
                {perkLoading ? 'Adding...' : 'Create Perk'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventDashboard;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EVENT_CATEGORIES, EventStatus } from '@/types/database';
import { toast } from 'sonner';
import { CalendarPlus, MapPin, Users, DollarSign, FileText, Megaphone, Trophy, ChevronRight, ChevronLeft, Upload, Globe, Star } from 'lucide-react';
import { Label } from '@/components/ui/label';

const STEPS = [
  { title: 'Basic Info', icon: FileText, description: 'Event name, category & description' },
  { title: 'Venue & Date', icon: MapPin, description: 'Location and schedule details' },
  { title: 'Audience & Budget', icon: Users, description: 'Footfall, demographics & funding' },
  { title: 'Sponsor Pitch', icon: Trophy, description: 'Why should sponsors invest?' },
];

const CreateEvent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [uploadingDeck, setUploadingDeck] = useState(false);
  const [form, setForm] = useState({
    name: '', category: '', description: '',
    venue_name: '', full_address: '', city: '', state: '',
    event_date: '', event_end_date: '',
    budget_required: '', expected_footfall: '', previous_year_footfall: '',
    audience_size: '', target_demographics: '', tags: '',
    event_lineup: '', pitch_deck_url: '',
    website_url: '', social_media_reach: '',
    past_sponsors: '', sponsorship_tiers: '',
    usp: '', media_coverage: '',
    sponsor_deliverables: '',
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB');
      return;
    }
    const allowedTypes = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF or PPT files are allowed');
      return;
    }
    setUploadingDeck(true);
    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from('pitch-decks').upload(filePath, file);
    if (error) {
      toast.error('Failed to upload: ' + error.message);
    } else {
      const { data: urlData } = supabase.storage.from('pitch-decks').getPublicUrl(data.path);
      setForm((f) => ({ ...f, pitch_deck_url: urlData.publicUrl }));
      toast.success('Pitch deck uploaded!');
    }
    setUploadingDeck(false);
  };

  const validateStep = () => {
    if (step === 0) {
      if (!form.name.trim()) { toast.error('Event name is required'); return false; }
      if (!form.category) { toast.error('Please select a category'); return false; }
      if (!form.description.trim()) { toast.error('Description is required'); return false; }
    }
    if (step === 1) {
      if (!form.city.trim()) { toast.error('City is required'); return false; }
      if (!form.event_date) { toast.error('Event start date is required'); return false; }
    }
    if (step === 2) {
      if (!form.expected_footfall) { toast.error('Expected footfall is required'); return false; }
      if (!form.budget_required) { toast.error('Budget required is needed'); return false; }
    }
    return true;
  };

  const nextStep = () => { if (validateStep()) setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (form.name.length > 200 || form.description.length > 2000) {
      toast.error('Name must be under 200 chars, description under 2000');
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.from('events').insert({
      organizer_id: user.id,
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      venue_name: form.venue_name.trim(),
      full_address: form.full_address.trim(),
      budget_required: parseInt(form.budget_required) || 0,
      audience_size: parseInt(form.audience_size) || parseInt(form.expected_footfall) || 0,
      expected_footfall: parseInt(form.expected_footfall) || 0,
      previous_year_footfall: form.previous_year_footfall ? parseInt(form.previous_year_footfall) : null,
      target_demographics: form.target_demographics.trim(),
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      event_date: form.event_date,
      event_end_date: form.event_end_date || null,
      status: 'active' as EventStatus,
      pitch_deck_url: form.pitch_deck_url || null,
      website_url: form.website_url.trim() || null,
      social_media_reach: form.social_media_reach ? parseInt(form.social_media_reach) : null,
      event_lineup: form.event_lineup.trim(),
      past_sponsors: form.past_sponsors.trim() || null,
      sponsorship_tiers: form.sponsorship_tiers.trim() || null,
      usp: form.usp.trim() || null,
      media_coverage: form.media_coverage.trim() || null,
      sponsor_deliverables: form.sponsor_deliverables.trim() || null,
    }).select('id').single();

    if (error) {
      toast.error(error.message);
    } else {
      await supabase.rpc('calculate_matches', { p_event_id: data.id });
      toast.success('Event created & matches calculated!');
      navigate('/my-events');
    }
    setLoading(false);
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Event Name *</Label>
              <Input placeholder="e.g. TechFest Mumbai 2025" value={form.name} onChange={set('name')} required maxLength={200} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  {EVENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Description *</Label>
              <Textarea
                placeholder="Describe your event in detail — what it's about, the experience you're creating, and what makes it special..."
                value={form.description} onChange={set('description')} maxLength={2000} rows={4}
              />
              <p className="text-xs text-muted-foreground">{form.description.length}/2000 characters</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Tags</Label>
              <Input placeholder="e.g. tech, networking, startup, AI (comma separated)" value={form.tags} onChange={set('tags')} maxLength={500} />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Venue Name</Label>
              <Input placeholder="e.g. Jio Convention Centre" value={form.venue_name} onChange={set('venue_name')} maxLength={200} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Full Address</Label>
              <Textarea
                placeholder="Complete venue address with landmark, pin code..."
                value={form.full_address} onChange={set('full_address')} maxLength={500} rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">City *</Label>
                <Input placeholder="e.g. Mumbai" value={form.city} onChange={set('city')} required maxLength={100} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">State</Label>
                <Input placeholder="e.g. Maharashtra" value={form.state} onChange={set('state')} maxLength={100} className="h-11" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Start Date *</Label>
                <Input type="date" value={form.event_date} onChange={set('event_date')} required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">End Date</Label>
                <Input type="date" value={form.event_end_date} onChange={set('event_end_date')} className="h-11" />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Expected Footfall *</Label>
                <Input type="number" placeholder="e.g. 5000" value={form.expected_footfall} onChange={set('expected_footfall')} required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Previous Year Footfall</Label>
                <Input type="number" placeholder="e.g. 3500 (if applicable)" value={form.previous_year_footfall} onChange={set('previous_year_footfall')} className="h-11" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Total Budget Required (₹) *</Label>
                <Input type="number" placeholder="e.g. 500000" value={form.budget_required} onChange={set('budget_required')} required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Social Media Reach</Label>
                <Input type="number" placeholder="e.g. 50000 followers" value={form.social_media_reach} onChange={set('social_media_reach')} className="h-11" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Target Demographics</Label>
              <Input placeholder="e.g. College students aged 18-25, Tech professionals" value={form.target_demographics} onChange={set('target_demographics')} maxLength={300} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Website / Social Media Link</Label>
              <Input placeholder="https://yourevent.com or instagram.com/yourevent" value={form.website_url} onChange={set('website_url')} maxLength={500} className="h-11" />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Event Lineup / Activities</Label>
              <Textarea
                placeholder={"List key events, performances, or activities:\n• Keynote by Industry Leader\n• Startup Pitch Competition\n• Panel Discussion on AI\n• Networking Mixer\n• Live Music Performance"}
                value={form.event_lineup} onChange={set('event_lineup')} maxLength={2000} rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Sponsorship Tiers / Packages</Label>
              <Textarea
                placeholder={"Describe your sponsorship packages:\n• Title Sponsor – ₹5L (Logo on all banners, stage mentions)\n• Gold Sponsor – ₹3L (Stall + social media promotion)\n• Silver Sponsor – ₹1L (Logo on website + standee)"}
                value={form.sponsorship_tiers} onChange={set('sponsorship_tiers')} maxLength={2000} rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">What Makes This Event Unique? (USP)</Label>
              <Textarea
                placeholder="Why should a sponsor choose YOUR event? What ROI can they expect? Highlight unique value propositions..."
                value={form.usp} onChange={set('usp')} maxLength={1000} rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Sponsor Deliverables</Label>
              <Textarea
                placeholder={"What will sponsors receive in return?\n• Logo placement on banners, standees & stage backdrop\n• Social media shoutouts (3 posts + stories)\n• Dedicated stall/booth space\n• MC mentions during event\n• Post-event report with reach & engagement data\n• Photo/video content featuring sponsor branding"}
                value={form.sponsor_deliverables} onChange={set('sponsor_deliverables')} maxLength={2000} rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Past Sponsors / Partners</Label>
              <Input placeholder="e.g. Google, Razorpay, RedBull (if any)" value={form.past_sponsors} onChange={set('past_sponsors')} maxLength={500} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Expected Media Coverage</Label>
              <Input placeholder="e.g. Local news, YouTube livestream, Instagram reels" value={form.media_coverage} onChange={set('media_coverage')} maxLength={500} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                <Upload className="h-4 w-4 inline mr-1" /> Attach Pitch Deck (PDF / PPT)
              </Label>
              <Input
                type="file"
                accept=".pdf,.ppt,.pptx"
                onChange={handleFileUpload}
                disabled={uploadingDeck}
                className="h-11 file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
              />
              {uploadingDeck && <p className="text-xs text-muted-foreground">Uploading...</p>}
              {form.pitch_deck_url && <p className="text-xs text-green-500">✓ Pitch deck attached</p>}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="glass-card border-border/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" /> Create New Event
          </CardTitle>
          <CardDescription>Fill in the details to attract the right sponsors for your event</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step Indicator */}
          <div className="flex items-center gap-1 mb-8">
            {STEPS.map((s, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className={`h-2 w-full rounded-full transition-colors ${
                  i <= step ? 'bg-primary' : 'bg-muted'
                }`} />
                <span className={`text-[10px] font-medium text-center leading-tight ${
                  i <= step ? 'text-primary' : 'text-muted-foreground'
                }`}>{s.title}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {renderStepContent()}

            <div className="flex justify-between mt-8">
              {step > 0 ? (
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              ) : <div />}

              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={nextStep}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" disabled={loading} className="min-w-[140px]">
                  {loading ? 'Creating...' : '🚀 Publish Event'}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateEvent;

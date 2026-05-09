import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EVENT_CATEGORIES, EventStatus, Demographics } from '@/types/database';
import { toast } from 'sonner';
import { CalendarPlus, MapPin, Users, FileText, Trophy, ChevronRight, ChevronLeft, Upload, Loader2, Save, X, Globe, Lock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { uploadToImageKit, deleteFromImageKit } from '@/lib/imagekit';

const STEPS = [
  { title: 'Basic Info', icon: FileText, description: 'Event name, category & description' },
  { title: 'Venue & Date', icon: MapPin, description: 'Location and schedule details' },
  { title: 'Audience & Budget', icon: Users, description: 'Footfall, demographics & funding' },
  { title: 'Sponsor Pitch', icon: Trophy, description: 'Why should sponsors invest?' },
];

const GENDER_OPTIONS = ['Men', 'Women', 'Non-binary', 'All'];
const PROFESSION_OPTIONS = ['Students', 'Professionals', 'Corporate', 'Entrepreneurs', 'Freelancers', 'Artists', 'Athletes', 'Techies', 'Creatives', 'Other'];
const TYPE_OPTIONS = ['B2C', 'B2B', 'Mixed', 'Other'];

const CreateEvent = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [step, setStep] = useState(0);
  const [uploadingDeck, setUploadingDeck] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [form, setForm] = useState({
    name: '', category: '', description: '',
    venue_name: '', full_address: '', city: '', state: '',
    event_date: '', event_end_date: '',
    budget_required: '', expected_footfall: '', previous_year_footfall: '',
    audience_size: '', 
    target_demographics: {
      gender: [] as string[],
      ageRange: [18, 35] as number[],
      profession: [] as string[],
      type: [] as string[],
      customProfession: '',
      customType: '',
    } as Demographics,
    tags: '',
    event_lineup: '', pitch_deck_url: '',
    website_url: '', social_media_reach: '',
    past_sponsors: '', sponsorship_tiers: '',
    usp: '', media_coverage: '',
    sponsor_deliverables: '',
    past_event_media: [] as string[],
    pitch_deck_file_id: '',
    past_media_details: [] as { url: string; fileId: string }[],
    is_public: true,
  });

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  useEffect(() => {
    if (id) {
      const fetchEvent = async () => {
        setFetching(true);
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          toast.error('Failed to fetch event data');
          navigate('/my-events');
        } else if (data) {
          setForm({
            ...data,
            name: data.name || '',
            category: data.category || '',
            description: data.description || '',
            city: data.city || '',
            venue_name: data.venue_name || '',
            full_address: data.full_address || '',
            state: data.state || '',
            event_end_date: data.event_end_date || '',
            website_url: data.website_url || '',
            event_lineup: data.event_lineup || '',
            past_sponsors: data.past_sponsors || '',
            sponsorship_tiers: data.sponsorship_tiers || '',
            usp: data.usp || '',
            media_coverage: data.media_coverage || '',
            sponsor_deliverables: data.sponsor_deliverables || '',
            pitch_deck_url: data.pitch_deck_url || '',
            pitch_deck_file_id: data.pitch_deck_file_id || '',
            budget_required: data.budget_required?.toString() || '',
            expected_footfall: data.expected_footfall?.toString() || '',
            previous_year_footfall: data.previous_year_footfall?.toString() || '',
            audience_size: data.audience_size?.toString() || '',
            social_media_reach: data.social_media_reach?.toString() || '',
            target_demographics: (() => {
              try {
                if (typeof data.target_demographics === 'string') {
                  const parsed = JSON.parse(data.target_demographics);
                  return {
                    gender: parsed.gender || [],
                    ageRange: parsed.ageRange || [18, 35],
                    profession: parsed.profession || [],
                    type: parsed.type || [],
                    customProfession: parsed.customProfession || '',
                    customType: parsed.customType || '',
                  };
                }
                return data.target_demographics || form.target_demographics;
              } catch (e) {
                console.warn('Failed to parse target_demographics', e);
                return form.target_demographics;
              }
            })(),
            tags: data.tags?.join(', ') || '',
            past_event_media: data.past_event_media || [],
            past_media_details: data.past_media_details || [],
            is_public: data.is_public ?? true,
          });
        }
        setFetching(false);
      };
      fetchEvent();
    }
  }, [id, navigate]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleDemographic = (key: keyof Demographics, value: string) => {
    setForm((f) => {
      const current = f.target_demographics[key] as string[];
      const exists = current.includes(value);
      const updated = exists 
        ? current.filter(v => v !== value)
        : [...current, value];
      return {
        ...f,
        target_demographics: {
          ...f.target_demographics,
          [key]: updated
        }
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB');
      return;
    }
    const allowedTypes = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'video/mp4', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, PPT, MP4, or MOV files are allowed');
      return;
    }
    setUploadingDeck(true);
    const fileName = `${user.id}-${Date.now()}-${file.name}`;
    try {
      const { url, fileId } = await uploadToImageKit(file, fileName, 'pitch-decks');
      setForm((f) => ({ ...f, pitch_deck_url: url, pitch_deck_file_id: fileId }));
      toast.success('Pitch deck uploaded!');
    } catch (error: any) {
      toast.error('Failed to upload: ' + (error.message || 'Unknown error'));
    }
    setUploadingDeck(false);
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !user) return;
    
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} must be under 20MB`);
        return;
      }
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error(`${file.name} is not a valid image or video`);
        return;
      }
    }

    setPendingFiles((prev) => [...prev, ...files]);
    toast.info(`${files.length} files added to review queue`);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPendingFiles = async () => {
    if (pendingFiles.length === 0 || !user) return;
    setUploadingMedia(true);
    let uploadedUrls: string[] = [...form.past_event_media];
    let uploadedDetails: { url: string; fileId: string }[] = [...form.past_media_details];
    
    try {
      for (const file of pendingFiles) {
        const fileName = `${user.id}-${Date.now()}-${file.name}`;
        const { url, fileId } = await uploadToImageKit(file, fileName, 'event-media');
        uploadedUrls.push(url);
        uploadedDetails.push({ url, fileId });
      }
      setForm(f => ({ ...f, past_event_media: uploadedUrls, past_media_details: uploadedDetails }));
      setPendingFiles([]);
      toast.success('Gallery updated successfully!');
    } catch (error: any) {
      toast.error('Failed to upload some files');
    }
    setUploadingMedia(false);
  };

  const removeMedia = async (index: number) => {
    const detail = form.past_media_details[index];
    if (detail?.fileId) {
      const success = await deleteFromImageKit(detail.fileId);
      if (!success) {
        toast.error('Failed to delete from storage');
        return;
      }
    }

    setForm(f => {
      const newMedia = [...f.past_event_media];
      const newDetails = [...f.past_media_details];
      newMedia.splice(index, 1);
      newDetails.splice(index, 1);
      return { ...f, past_event_media: newMedia, past_media_details: newDetails };
    });
    toast.success('Media removed');
  };

  const validateStep = () => {
    if (step === 0) {
      if (!form.name.trim()) { toast.error('Event name is required'); return false; }
      if (!form.category) { toast.error('Please select a category'); return false; }
      if (!form.description.trim()) { toast.error('Description is required'); return false; }
    }
    if (step === 1) {
      if (!form.city.trim()) { toast.error('City is required'); return false; }
      if (!form.state.trim()) { toast.error('State is required'); return false; }
      if (!form.event_date) { toast.error('Event start date is required'); return false; }
    }
    if (step === 2) {
      if (!form.expected_footfall) { toast.error('Expected footfall is required'); return false; }
      if (!form.budget_required) { toast.error('Budget required is needed'); return false; }
      
      const { gender, profession, type, customProfession, customType } = form.target_demographics;
      if (gender.length === 0) { toast.error('Please select at least one gender'); return false; }
      if (profession.length === 0 && !customProfession.trim()) { toast.error('Please select at least one profession'); return false; }
      if (type.length === 0 && !customType.trim()) { toast.error('Please select audience type'); return false; }
    }
    if (step === 3) {
      if (!form.sponsorship_tiers.trim()) { toast.error('Sponsorship tiers are required'); return false; }
      if (!form.usp.trim()) { toast.error('Event USP is required'); return false; }
      if (!form.sponsor_deliverables.trim()) { toast.error('Sponsor deliverables are required'); return false; }
    }
    return true;
  };

  const nextStep = () => { if (validateStep()) setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!user) return;
    if (!validateStep()) return;

    if (pendingFiles.length > 0) {
      toast.warning('You have pending files in the upload queue. Please click "Upload" or remove them.');
      return;
    }

    if (form.name.length > 200 || form.description.length > 2000) {
      toast.error('Name must be under 200 chars, description under 2000');
      return;
    }
    setLoading(true);

    const eventPayload = {
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
      target_demographics: JSON.stringify(form.target_demographics),
      tags: typeof form.tags === 'string' ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : form.tags,
      event_date: form.event_date,
      event_end_date: form.event_end_date || null,
      status: 'draft' as EventStatus,
      pitch_deck_url: form.pitch_deck_url || null,
      pitch_deck_file_id: form.pitch_deck_file_id || null,
      website_url: form.website_url?.trim() || null,
      social_media_reach: form.social_media_reach ? parseInt(form.social_media_reach) : null,
      event_lineup: form.event_lineup?.trim() || '',
      past_sponsors: form.past_sponsors?.trim() || null,
      sponsorship_tiers: form.sponsorship_tiers?.trim() || null,
      usp: form.usp?.trim() || null,
      media_coverage: form.media_coverage?.trim() || null,
      sponsor_deliverables: form.sponsor_deliverables?.trim() || null,
      past_event_media: form.past_event_media,
      past_media_details: form.past_media_details,
      is_public: form.is_public,
    };

    let result;
    if (id) {
      result = await supabase.from('events').update(eventPayload).eq('id', id).select('id').single();
    } else {
      result = await supabase.from('events').insert(eventPayload).select('id').single();
    }

    if (result.error) {
      toast.error(result.error.message);
    } else {
      if (!id) await supabase.rpc('calculate_matches', { p_event_id: result.data.id });
      toast.success(id ? 'Event updated!' : 'Event draft saved!');
      navigate(`/event/${result.data.id}/dashboard`);
    }
    setLoading(false);
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Event Name *</Label>
              <Input placeholder="e.g. TechFest Mumbai 2025" value={form.name} onChange={set('name')} required maxLength={200} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  {EVENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Description *</Label>
              <Textarea
                placeholder="Describe your event specifically highlighting the experience you're creating and your target audience hook..."
                value={form.description} onChange={set('description')} maxLength={2000} rows={4}
              />
              <p className="text-xs text-muted-foreground">{form.description.length}/2000 characters</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tags</Label>
              <Input placeholder="e.g. tech, networking, startup, AI" value={form.tags} onChange={set('tags')} maxLength={500} />
            </div>
            <div className="pt-4 border-t border-border/50">
               <div className="flex items-center justify-between p-4 rounded-xl border bg-primary/5 border-primary/10">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      {form.is_public ? <Globe className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                      Public RSVP
                    </Label>
                    <p className="text-xs text-muted-foreground">Show this event on the landing page for guest users to RSVP.</p>
                  </div>
                  <Button 
                    type="button" 
                    variant={form.is_public ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setForm(f => ({ ...f, is_public: !f.is_public }))}
                    className="transition-all"
                  >
                    {form.is_public ? 'Enabled' : 'Disabled'}
                  </Button>
               </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Venue Name</Label>
              <Input placeholder="e.g. Jio Convention Centre" value={form.venue_name} onChange={set('venue_name')} maxLength={200} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Full Address</Label>
              <Textarea
                placeholder="Complete venue address..."
                value={form.full_address} onChange={set('full_address')} maxLength={500} rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">City *</Label>
                <Input placeholder="e.g. Mumbai" value={form.city} onChange={set('city')} required maxLength={100} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">State *</Label>
                <Input placeholder="e.g. Maharashtra" value={form.state} onChange={set('state')} required maxLength={100} className="h-11" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Start Date *</Label>
                <Input type="date" value={form.event_date} onChange={set('event_date')} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">End Date</Label>
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
                <Label className="text-sm font-medium">Expected Attendees *</Label>
                <Input type="number" placeholder="5000" value={form.expected_footfall} onChange={set('expected_footfall')} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Previous Year Footfall</Label>
                <Input type="number" placeholder="3500" value={form.previous_year_footfall} onChange={set('previous_year_footfall')} className="h-11" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Total Budget (₹) *</Label>
                <Input type="number" placeholder="500000" value={form.budget_required} onChange={set('budget_required')} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Social Media Reach</Label>
                <Input type="number" placeholder="50000" value={form.social_media_reach} onChange={set('social_media_reach')} className="h-11" />
              </div>
            </div>
            <div className="space-y-6 pt-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-primary">Age Range</Label>
                  <span className="text-sm font-medium bg-secondary px-3 py-1 rounded-full">
                    {form.target_demographics.ageRange[0]} - {form.target_demographics.ageRange[1]} years
                  </span>
                </div>
                <Slider
                  min={1}
                  max={100}
                  step={1}
                  value={form.target_demographics.ageRange}
                  onValueChange={(val) => setForm(f => ({
                    ...f,
                    target_demographics: { ...f.target_demographics, ageRange: val }
                  }))}
                  className="py-4"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-primary">Gender * (Select Multiple)</Label>
                <div className="flex flex-wrap gap-2">
                  {GENDER_OPTIONS.map((opt) => (
                    <Badge
                      key={opt}
                      variant={form.target_demographics.gender.includes(opt) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer px-4 py-1.5 text-xs transition-all hover:scale-105 active:scale-95",
                        !form.target_demographics.gender.includes(opt) && "hover:bg-secondary border-muted-foreground/30"
                      )}
                      onClick={() => toggleDemographic('gender', opt)}
                    >
                      {opt}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-primary">Profession * (Select Multiple)</Label>
                <div className="flex flex-wrap gap-2">
                  {PROFESSION_OPTIONS.map((opt) => (
                    <Badge
                      key={opt}
                      variant={form.target_demographics.profession.includes(opt) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer px-4 py-1.5 text-xs transition-all hover:scale-105 active:scale-95",
                        !form.target_demographics.profession.includes(opt) && "hover:bg-secondary border-muted-foreground/30"
                      )}
                      onClick={() => toggleDemographic('profession', opt)}
                    >
                      {opt}
                    </Badge>
                  ))}
                </div>
                {form.target_demographics.profession.includes('Other') && (
                  <Input 
                    placeholder="Specify profession..."
                    value={form.target_demographics.customProfession}
                    onChange={(e) => setForm(f => ({
                      ...f,
                      target_demographics: { ...f.target_demographics, customProfession: e.target.value }
                    }))}
                    className="mt-3 bg-secondary/50 border-dashed border-primary/30 h-10"
                  />
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-primary">Audience Type * (Select Multiple)</Label>
                <div className="flex flex-wrap gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <Badge
                      key={opt}
                      variant={form.target_demographics.type.includes(opt) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer px-4 py-1.5 text-xs transition-all hover:scale-105 active:scale-95",
                        !form.target_demographics.type.includes(opt) && "hover:bg-secondary border-muted-foreground/30"
                      )}
                      onClick={() => toggleDemographic('type', opt)}
                    >
                      {opt}
                    </Badge>
                  ))}
                </div>
                {form.target_demographics.type.includes('Other') && (
                  <Input 
                    placeholder="Specify audience type..."
                    value={form.target_demographics.customType}
                    onChange={(e) => setForm(f => ({
                      ...f,
                      target_demographics: { ...f.target_demographics, customType: e.target.value }
                    }))}
                    className="mt-3 bg-secondary/50 border-dashed border-primary/30 h-10"
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Website / Social URL</Label>
              <Input placeholder="https://yourevent.com" value={form.website_url} onChange={set('website_url')} maxLength={500} className="h-11" />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sponsorship Tiers *</Label>
              <Textarea
                placeholder="Title Sponsor – ₹5L, Gold Sponsor – ₹3L..."
                value={form.sponsorship_tiers} onChange={set('sponsorship_tiers')} maxLength={2000} rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Event USP * (Why invest?)</Label>
              <Textarea
                placeholder="Unique value proposition for sponsors..."
                value={form.usp} onChange={set('usp')} maxLength={1000} rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sponsor Deliverables *</Label>
              <Textarea
                placeholder="Logo placement, booth space, email blast..."
                value={form.sponsor_deliverables} onChange={set('sponsor_deliverables')} maxLength={2000} rows={4}
              />
            </div>
            <div className="space-y-4 pt-2 pb-2 rounded border border-border/50 p-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Upload className="h-4 w-4" /> Past Event Photos / Videos
              </Label>
              <Input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleMediaUpload}
                disabled={uploadingMedia}
                className="h-11 file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary"
              />
              {uploadingMedia && <p className="text-xs text-muted-foreground animate-pulse">Uploading to gallery...</p>}
              
              {/* Pending Queue */}
              {pendingFiles.length > 0 && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                      Review Queue ({pendingFiles.length})
                    </span>
                    <Button 
                      type="button" 
                      size="sm" 
                      onClick={uploadPendingFiles} 
                      disabled={uploadingMedia}
                      className="h-7 text-[10px] px-3 font-bold"
                    >
                      {uploadingMedia ? <><Loader2 className="h-3 w-3 animate-spin mr-1"/> uploading...</> : <><Upload className="h-3 w-3 mr-1"/> Upload All</>}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pendingFiles.map((file, idx) => {
                      const isVideo = file.type.startsWith('video/');
                      const url = URL.createObjectURL(file);
                      return (
                        <div key={idx} className="relative group rounded-md overflow-hidden bg-muted h-16 w-16 flex items-center justify-center border border-dashed border-primary/30">
                          {isVideo ? (
                            <div className="flex items-center justify-center bg-black/10 w-full h-full"><Upload className="h-4 w-4 text-primary/40"/></div>
                          ) : (
                            <img src={url} alt={`Pending ${idx}`} className="object-cover w-full h-full opacity-60" />
                          )}
                          <button 
                            type="button"
                            onClick={() => removePendingFile(idx)}
                            className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <span className="text-xl font-bold">×</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Uploaded Gallery */}
              {form.past_event_media.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Gallery ({form.past_event_media.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {form.past_event_media.map((url, idx) => (
                      <div key={idx} className="relative group rounded-md overflow-hidden bg-muted h-20 w-20 flex items-center justify-center border border-border">
                        {url.match(/\.(mp4|mov|webm)$/i) ? (
                          <video src={url} className="object-cover w-full h-full" muted />
                        ) : (
                          <img src={url} alt={`Media ${idx}`} className="object-cover w-full h-full" />
                        )}
                        <button 
                          type="button"
                          onClick={() => removeMedia(idx)}
                          className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="text-xl font-bold">×</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (fetching) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="glass-card border-border/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" /> {id ? 'Edit Event' : 'Create New Event'}
          </CardTitle>
          <CardDescription>
            {id ? 'Update your event details to keep sponsors informed' : 'Fill in the details to attract the right sponsors for your event'}
          </CardDescription>
        </CardHeader>
        <CardContent>
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

          <div className="space-y-4">
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
                <Button type="button" onClick={handleSubmit} disabled={loading} className="min-w-[160px] gap-2">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> saving...</> : <><Save className="h-4 w-4" /> Save & Continue</>}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateEvent;

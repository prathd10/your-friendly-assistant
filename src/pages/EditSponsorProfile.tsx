import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { EVENT_CATEGORIES, SponsorPreferences } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, Building, User, Upload, X } from 'lucide-react';
import { uploadToImageKit, deleteFromImageKit } from '@/lib/imagekit';

const EditSponsorProfile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    organization_name: '',
    city: '',
    business_description: '',
    categories: [] as string[],
    max_budget: '',
    cities: '',
    min_audience: '',
    organization_logo: '',
    logo_file_id: '',
    profile_photo: '',
    profile_photo_file_id: '',
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const prefs = profile.preferences as SponsorPreferences | null;
    setForm({
      full_name: profile.full_name || '',
      organization_name: profile.organization_name || '',
      city: profile.city || '',
      business_description: profile.business_description || '',
      categories: prefs?.categories || [],
      max_budget: prefs?.max_budget?.toString() || '',
      cities: prefs?.cities?.join(', ') || '',
      min_audience: prefs?.min_audience?.toString() || '',
      organization_logo: profile.organization_logo || '',
      logo_file_id: profile.logo_file_id || '',
      profile_photo: profile.profile_photo || '',
      profile_photo_file_id: profile.profile_photo_file_id || '',
    });
  }, [profile]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setUploading(true);
    try {
      const fileName = `logo-${user.id}-${Date.now()}`;
      const { url, fileId } = await uploadToImageKit(file, fileName, 'sponsor-logos');
      setForm(prev => ({ ...prev, organization_logo: url, logo_file_id: fileId }));
      toast.success('Logo uploaded!');
    } catch (err) {
      toast.error('Logo upload failed');
    }
    setUploading(false);
  };

  const handleLogoDelete = async () => {
    if (!form.logo_file_id) return;
    
    setUploading(true);
    const success = await deleteFromImageKit(form.logo_file_id);
    if (success) {
      setForm(prev => ({ ...prev, organization_logo: '', logo_file_id: '' }));
      toast.success('Logo removed from storage');
    } else {
      toast.error('Failed to delete logo from storage');
    }
    setUploading(false);
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      toast.error('Image too large. Max size is 5 MB.');
      return;
    }

    setUploading(true);
    try {
      const fileName = `profile-photo-${user.id}-${Date.now()}`;
      const { url, fileId } = await uploadToImageKit(file, fileName, 'profile-photos');
      setForm(prev => ({ ...prev, profile_photo: url, profile_photo_file_id: fileId }));
      toast.success('Profile photo uploaded!');
    } catch (err) {
      toast.error('Photo upload failed. Please try again.');
    }
    setUploading(false);
  };

  const handleProfilePhotoDelete = async () => {
    if (!form.profile_photo_file_id) return;

    setUploading(true);
    const success = await deleteFromImageKit(form.profile_photo_file_id);
    if (success) {
      setForm(prev => ({ ...prev, profile_photo: '', profile_photo_file_id: '' }));
      toast.success('Profile photo removed.');
    } else {
      toast.error('Failed to remove photo from storage.');
    }
    setUploading(false);
  };

  const toggleCategory = (cat: string) => {
    setForm(prev => {
      const categories = prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat];
      return { ...prev, categories };
    });
  };

  const handleSave = async () => {
    if (!user) return;

    if (!form.full_name.trim()) { toast.error('Full name is required'); return; }
    if (!form.organization_name.trim()) { toast.error('Organization name is required'); return; }
    if (!form.city.trim()) { toast.error('City is required'); return; }
    if (!form.max_budget || parseInt(form.max_budget) <= 0) { toast.error('Max budget is required'); return; }

    setLoading(true);

    const preferences: SponsorPreferences = {
      categories: form.categories,
      max_budget: parseInt(form.max_budget) || 0,
      cities: form.cities.split(',').map((c) => c.trim()).filter(Boolean),
      min_audience: parseInt(form.min_audience) || 0,
    };

    const { error } = await supabase
      .from('users')
      .update({
        full_name: form.full_name.trim(),
        organization_name: form.organization_name.trim(),
        city: form.city.trim(),
        business_description: form.business_description.trim(),
        organization_logo: form.organization_logo,
        logo_file_id: form.logo_file_id,
        profile_photo: form.profile_photo,
        profile_photo_file_id: form.profile_photo_file_id,
        preferences,
      })
      .eq('id', user.id);

    if (error) {
      toast.error(error.message);
    } else {
      await refreshProfile();
      toast.success('Profile updated!');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Edit Profile</h1>

      <Card className="glass-card border-border/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Personal Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Profile Photo */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Profile Photo</Label>
            <div className="flex items-center gap-6">
              {form.profile_photo ? (
                <div className="relative group h-24 w-24 rounded-full overflow-hidden border-2 border-primary/30 bg-muted shadow-md shrink-0">
                  <img src={form.profile_photo} alt="Profile" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={handleProfilePhotoDelete}
                    disabled={uploading}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              ) : (
                <div className="h-24 w-24 rounded-full border-2 border-dashed border-border flex flex-col items-center justify-center bg-muted/30 text-muted-foreground shrink-0">
                  <User className="h-8 w-8 mb-1 opacity-30" />
                  <span className="text-[10px]">No Photo</span>
                </div>
              )}
              <div className="flex-1 space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePhotoUpload}
                  disabled={uploading}
                  className="h-9 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-xs file:font-medium file:text-primary"
                />
                {uploading && <p className="text-[10px] text-primary animate-pulse">Uploading…</p>}
                <p className="text-[10px] text-muted-foreground">JPG / PNG / WebP · Max 5 MB</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/30">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>City *</Label>
              <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Organization Name *</Label>
            <Input value={form.organization_name} onChange={(e) => setForm((f) => ({ ...f, organization_name: e.target.value }))} />
          </div>

          <div className="space-y-4 pt-4 border-t border-border/30">
            <Label className="text-sm font-medium">Brand Logo</Label>
            <div className="flex items-center gap-6">
              {form.organization_logo ? (
                <div className="relative group h-24 w-24 rounded-lg overflow-hidden border border-border bg-muted shrink-0">
                  <img src={form.organization_logo} alt="Logo" className="h-full w-full object-contain p-2" />
                  <button
                    type="button"
                    onClick={handleLogoDelete}
                    disabled={uploading}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              ) : (
                <div className="h-24 w-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center bg-muted/30 text-muted-foreground shrink-0">
                  <Building className="h-8 w-8 mb-1 opacity-20" />
                  <span className="text-[10px]">No Logo</span>
                </div>
              )}
              <div className="flex-1 space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="h-9 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-xs file:font-medium file:text-primary"
                />
                <p className="text-[10px] text-muted-foreground">Recommended: Square PNG/SVG (Max 2MB)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5 text-primary" /> Business Details</CardTitle>
          <CardDescription>Tell organizers about your brand and what you're looking for</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Business Description</Label>
            <Textarea
              placeholder="Describe your business, products, and what kind of events you like to sponsor..."
              value={form.business_description}
              onChange={(e) => setForm((f) => ({ ...f, business_description: e.target.value }))}
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">{form.business_description.length}/1000</p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/30">
        <CardHeader>
          <CardTitle>Sponsorship Preferences</CardTitle>
          <CardDescription>Help us match you with the right events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Interested Categories</Label>
            <div className="flex flex-wrap gap-2">
              {EVENT_CATEGORIES.map((cat) => (
                <Badge
                  key={cat}
                  variant={form.categories.includes(cat) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleCategory(cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Budget (₹) *</Label>
              <Input type="number" placeholder="e.g. 500000" value={form.max_budget} onChange={(e) => setForm((f) => ({ ...f, max_budget: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Min Audience Size</Label>
              <Input type="number" placeholder="e.g. 1000" value={form.min_audience} onChange={(e) => setForm((f) => ({ ...f, min_audience: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Preferred Cities</Label>
            <Input placeholder="e.g. Mumbai, Delhi, Bangalore (comma separated)" value={form.cities} onChange={(e) => setForm((f) => ({ ...f, cities: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={loading} className="w-full" size="lg">
        <Save className="h-4 w-4 mr-2" />
        {loading ? 'Saving...' : 'Save Profile'}
      </Button>
    </div>
  );
};

export default EditSponsorProfile;

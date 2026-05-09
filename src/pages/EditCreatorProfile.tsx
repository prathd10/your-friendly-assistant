import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { uploadToImageKit, deleteFromImageKit } from '@/lib/imagekit';

const EditCreatorProfile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    platform: '',
    niche: '',
    followers_count: '',
    engagement_rate: '',
    average_views: '',
    audience_demographics: '',
    pricing_per_post: '',
    profile_photo: '',
    profile_photo_file_id: '',
  });

  // Derived validation warnings
  const followers = parseInt(formData.followers_count) || 0;
  const engagement = parseFloat(formData.engagement_rate) || 0;
  const isSuspiciousEngagement = engagement > 20;
  const isSuspiciousFollowers = followers > 5_000_000;
  const isSuspicious = isSuspiciousEngagement || isSuspiciousFollowers;

  useEffect(() => {
    if (profile) {
      setFormData({
        platform: profile.platform || '',
        niche: profile.niche || '',
        followers_count: profile.followers_count?.toString() || '',
        engagement_rate: profile.engagement_rate?.toString() || '',
        average_views: profile.average_views?.toString() || '',
        audience_demographics: profile.audience_demographics || '',
        pricing_per_post: profile.pricing_per_post?.toString() || '',
        profile_photo: profile.profile_photo || '',
        profile_photo_file_id: profile.profile_photo_file_id || '',
      });
    }
  }, [profile]);

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileName = `profile-${user.id}-${Date.now()}`;
      const { url, fileId } = await uploadToImageKit(file, fileName, 'profile-photos');
      setFormData(prev => ({ ...prev, profile_photo: url, profile_photo_file_id: fileId }));
      toast.success('Profile photo uploaded!');
    } catch (err) {
      toast.error('Photo upload failed');
    }
    setUploading(false);
  };

  const handleProfilePhotoDelete = async () => {
    if (!formData.profile_photo_file_id) return;

    setUploading(true);
    const success = await deleteFromImageKit(formData.profile_photo_file_id);
    if (success) {
      setFormData(prev => ({ ...prev, profile_photo: '', profile_photo_file_id: '' }));
      toast.success('Profile photo removed');
    } else {
      toast.error('Failed to remove photo');
    }
    setUploading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user) return;

    // Hard validation
    if (!formData.platform.trim()) { toast.error('Primary platform is required.'); return; }
    if (!formData.niche.trim()) { toast.error('Niche is required.'); return; }
    if (followers <= 0) {
      toast.error('Followers count must be greater than 0.');
      return;
    }
    if (engagement < 0 || engagement > 25) {
      toast.error('Engagement rate must be between 0% and 25%.');
      return;
    }
    if (!formData.average_views || parseInt(formData.average_views) <= 0) {
      toast.error('Average views must be greater than 0.');
      return;
    }
    if (!formData.pricing_per_post || parseInt(formData.pricing_per_post) <= 0) {
      toast.error('Pricing per post is required.');
      return;
    }

    setLoading(true);

    // Determine if auto-flagging is needed
    const requiresFlag = isSuspiciousEngagement || isSuspiciousFollowers;
    const currentStatus = profile?.verification_status;
    const newStatus = requiresFlag ? 'flagged' : currentStatus === 'verified' ? 'verified' : currentStatus;

    const updates: Record<string, any> = {
      platform: formData.platform,
      niche: formData.niche,
      followers_count: followers,
      engagement_rate: engagement,
      average_views: parseInt(formData.average_views) || 0,
      audience_demographics: formData.audience_demographics,
      pricing_per_post: parseInt(formData.pricing_per_post) || 0,
      profile_photo: formData.profile_photo,
      profile_photo_file_id: formData.profile_photo_file_id,
    };

    if (newStatus && newStatus !== currentStatus) {
      updates.verification_status = newStatus;
    }

    const { error } = await supabase.from('users').update(updates).eq('id', user.id);

    if (error) {
      toast.error('Failed to update profile: ' + error.message);
    } else {
      await refreshProfile();
      if (requiresFlag) {
        toast.warning('Profile saved, but your metrics were flagged for review. Please upload proof in your Dashboard.');
      } else {
        toast.success('Profile updated successfully!');
      }
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Creator Profile</h1>
        <p className="text-muted-foreground">Manage your stats and portfolio to attract sponsors and events.</p>
      </div>

      {/* Suspicious metrics warning */}
      {isSuspicious && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-500">⚠ Suspicious Metrics – Verification Required</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isSuspiciousEngagement && 'Engagement rates above 20% are unusually high. '}
              {isSuspiciousFollowers && 'Follower counts above 5M require verification. '}
              Your profile will be flagged for admin review. Please upload proof screenshots in your dashboard.
            </p>
          </div>
        </div>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription className="flex items-center gap-1.5 mt-1">
            <Shield className="h-3.5 w-3.5" />
            {profile?.verification_status === 'verified' ? (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">✅ Platform Verified Metrics</Badge>
            ) : (
              <Badge variant="outline" className="text-yellow-600 border-yellow-500/30 text-xs">⚠ Self-Reported Metrics</Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Photo */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Profile Photo</Label>
            <div className="flex items-center gap-6">
              {formData.profile_photo ? (
                <div className="relative group h-24 w-24 rounded-full overflow-hidden border-2 border-primary/30 bg-muted shadow-md shrink-0">
                  <img src={formData.profile_photo} alt="Profile" className="h-full w-full object-cover" />
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

          <div className="space-y-4 pt-4 border-t border-border/30">
            <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primary Platform *</Label>
              <Input name="platform" placeholder="e.g. Instagram, YouTube" value={formData.platform} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Niche *</Label>
              <Input name="niche" placeholder="e.g. Tech, Lifestyle, Comedy" value={formData.niche} onChange={handleChange} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Followers Count *</Label>
              <Input
                name="followers_count"
                type="number"
                min="1"
                placeholder="e.g. 50000"
                value={formData.followers_count}
                onChange={handleChange}
                className={isSuspiciousFollowers ? 'border-red-500/50' : ''}
              />
              {isSuspiciousFollowers && <p className="text-xs text-red-500">Requires verification</p>}
            </div>
            <div className="space-y-2">
              <Label>Engagement Rate (%) *</Label>
              <Input
                name="engagement_rate"
                type="number"
                step="0.1"
                min="0"
                max="25"
                placeholder="e.g. 4.5"
                value={formData.engagement_rate}
                onChange={handleChange}
                className={isSuspiciousEngagement ? 'border-red-500/50' : ''}
              />
              {isSuspiciousEngagement && <p className="text-xs text-red-500">&gt;20% flagged</p>}
            </div>
            <div className="space-y-2">
              <Label>Avg. Views / Reach *</Label>
              <Input name="average_views" type="number" placeholder="e.g. 20000" value={formData.average_views} onChange={handleChange} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Audience Demographics</Label>
            <Textarea name="audience_demographics" placeholder="e.g. 60% Gen-Z, mostly Tier 1 cities in India" value={formData.audience_demographics} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label>Starting Rate per Post / Collaboration (₹) *</Label>
            <Input name="pricing_per_post" type="number" placeholder="e.g. 15000" value={formData.pricing_per_post} onChange={handleChange} />
          </div>
          <Button onClick={handleSave} disabled={loading} className="w-full mt-4">
            {loading ? 'Saving...' : 'Save Profile'}
          </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditCreatorProfile;

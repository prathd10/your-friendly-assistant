import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { uploadToImageKit, deleteFromImageKit } from '@/lib/imagekit';
import { LayoutDashboard, Users, Heart, Shield, CheckCircle, Clock, XCircle, AlertTriangle, Upload, Trash2, MapPin, IndianRupee, Calendar, Send, Briefcase } from 'lucide-react';

// --- Trust Score Calculation (0-100) ---
function calculateTrustScore(profile: any): number {
  let score = 0;
  // 1. Profile completeness (20)
  if (profile.niche && profile.platform && profile.audience_demographics) score += 20;
  // 2. Media kit uploaded (20)
  if (profile.media_kit_url) score += 20;
  // 3. Proof uploaded / Verified (20)
  if (profile.verification_status === 'verified') score += 20;
  else if (profile.verification_proof_urls?.length > 0) score += 10;
  // 4. Past collaborations (portfolio_urls not empty) (20)
  if (profile.portfolio_urls?.length > 0) score += 20;
  // 5. Realistic engagement range: 0–15% (20)
  const er = profile.engagement_rate || 0;
  if (er > 0 && er <= 15) score += 20;
  else if (er > 15 && er <= 25) score += 5; // partial credit
  return Math.min(score, 100);
}

function getTrustColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
}

function getTrustBg(score: number): string {
  if (score >= 80) return 'bg-green-500/10 border-green-500/20';
  if (score >= 60) return 'bg-yellow-500/10 border-yellow-500/20';
  return 'bg-red-500/10 border-red-500/20';
}

const statusConfig: Record<string, { label: string; icon: JSX.Element; color: string }> = {
  unverified:     { label: 'Unverified',      icon: <Shield className="h-4 w-4" />,       color: 'text-muted-foreground' },
  pending_review: { label: 'Pending Review',  icon: <Clock className="h-4 w-4" />,         color: 'text-yellow-500' },
  verified:       { label: 'Verified ✅',     icon: <CheckCircle className="h-4 w-4" />,   color: 'text-green-500' },
  rejected:       { label: 'Rejected',        icon: <XCircle className="h-4 w-4" />,       color: 'text-red-500' },
  flagged:        { label: '⚠ Suspicious Metrics', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-orange-500' },
};

const CreatorDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState({ activeCampaigns: 0, pendingRequests: 0 });
  const [uploading, setUploading] = useState(false);
  const [featuredGigs, setFeaturedGigs] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    const fetchStats = async () => {
      const { data: requests } = await supabase
        .from('connection_requests')
        .select('status')
        .eq('receiver_id', profile.id)
        .in('request_type', ['organizer_to_creator', 'sponsor_to_creator']);
      if (requests) {
        setStats({
          activeCampaigns: requests.filter((r) => r.status === 'accepted').length,
          pendingRequests: requests.filter((r) => r.status === 'pending').length,
        });
      }
    };
    fetchStats();

    supabase.from('events').select('id, name, city, event_date, budget_required, category').eq('status', 'active').order('created_at', { ascending: false }).limit(2)
      .then(({ data }) => setFeaturedGigs(data || []));
  }, [profile]);

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${ext}`;
    try {
      const { url, fileId } = await uploadToImageKit(file, fileName, 'verification-proofs');
      
      const existingProofs = (profile?.verification_proof_details || []) as { url: string; fileId: string }[];
      
      const { error: updateErr } = await supabase.from('users').update({
        verification_proof_details: [...existingProofs, { url, fileId }],
        // Map URLs for backward compatibility if needed by other components
        verification_proof_urls: [...(profile?.verification_proof_urls || []), url],
        verification_status: 'pending_review',
      }).eq('id', user.id);

      if (updateErr) {
        toast.error('Failed to save proof: ' + updateErr.message);
      } else {
        toast.success('Proof uploaded! Status set to Pending Review.');
        window.location.reload();
      }
    } catch (err) {
      toast.error('Upload failed');
    }
    setUploading(false);
  };

  const handleDeleteProof = async (fileId: string, url: string) => {
    if (!user) return;
    setUploading(true);
    
    try {
      const success = await deleteFromImageKit(fileId);
      if (!success) throw new Error('ImageKit deletion failed');

      const existingDetails = (profile?.verification_proof_details || []) as { url: string; fileId: string }[];
      const existingUrls = (profile?.verification_proof_urls || []) as string[];

      const { error: updateErr } = await supabase.from('users').update({
        verification_proof_details: existingDetails.filter(d => d.fileId !== fileId),
        verification_proof_urls: existingUrls.filter(u => u !== url),
      }).eq('id', user.id);

      if (updateErr) {
        toast.error('Failed to update profile: ' + updateErr.message);
      } else {
        toast.success('Proof removed successfully');
        window.location.reload();
      }
    } catch (err: any) {
      toast.error('Failed to delete: ' + err.message);
    }
    setUploading(false);
  };

  if (!profile) return null;

  const trustScore = calculateTrustScore(profile);
  const trustColor = getTrustColor(trustScore);
  const trustBg = getTrustBg(trustScore);
  const verStatus = profile.verification_status || 'unverified';
  const statusInfo = statusConfig[verStatus] || statusConfig.unverified;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Creator Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {profile.full_name}!</p>
      </div>

      {/* Featured Gigs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" /> Featured Gigs</h2>
          <Link to="/browse-gigs" className="text-xs text-primary hover:underline">View All Gigs</Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {featuredGigs.map((gig) => (
            <Card key={gig.id} className="glass-card border-border/30 hover:border-primary/20 transition-all group overflow-hidden flex flex-col">
              <CardContent className="p-3 space-y-2 flex-1 flex flex-col">
                <h3 className="font-bold text-[11px] sm:text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">{gig.name}</h3>
                <div className="flex flex-col gap-1 text-[9px] text-muted-foreground">
                  <div className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 text-primary shrink-0" /> {gig.city}</div>
                  <div className="flex items-center gap-1 truncate"><Calendar className="h-3 w-3 text-primary shrink-0" /> {new Date(gig.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                  <div className="flex items-center gap-1 font-semibold text-foreground"><IndianRupee className="h-3 w-3 text-primary shrink-0" /> ₹{gig.budget_required?.toLocaleString()}</div>
                </div>
                <Button asChild variant="default" className="w-full h-7 text-[10px] mt-auto bg-primary/90">
                  <Link to="/browse-gigs"><Send className="h-3 w-3 mr-1" /> Pitch</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
          {featuredGigs.length === 0 && (
            <div className="col-span-2 py-8 text-center border border-dashed rounded-xl bg-muted/5">
              <p className="text-xs text-muted-foreground italic">No active gigs right now. Check back soon!</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.activeCampaigns}</div></CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting your response</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Followers</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.followers_count?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{profile.platform || 'Platform not set'}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <Heart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{profile.engagement_rate || 0}%</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Verification Status Card */}
        <Card className={`border ${trustBg}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className={statusInfo.color}>{statusInfo.icon}</span>
              Verification Status
            </CardTitle>
            <CardDescription>
              <span className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Trust Score */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
              <span className="text-sm font-medium">Trust Score</span>
              <span className={`text-2xl font-bold ${trustColor}`}>{trustScore} <span className="text-sm font-normal text-muted-foreground">/ 100</span></span>
            </div>

            {/* Proof URLs already uploaded */}
            {profile.verification_proof_details && profile.verification_proof_details.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">{profile.verification_proof_details.length} proof file(s) submitted</p>
                <div className="flex flex-col gap-2">
                  {profile.verification_proof_details.map((proof: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded border border-border/30 bg-background/40">
                      <a href={proof.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate max-w-[200px]">
                        View Proof #{i + 1}
                      </a>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 text-muted-foreground hover:text-red-500"
                        onClick={() => handleDeleteProof(proof.fileId, proof.url)}
                        disabled={uploading}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback for legacy data without file IDs */}
            {(!profile.verification_proof_details || profile.verification_proof_details.length === 0) && profile.verification_proof_urls?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">{profile.verification_proof_urls.length} legacy proof file(s)</p>
                <div className="flex flex-wrap gap-2">
                  {profile.verification_proof_urls.map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                      View Proof #{i + 1}
                    </a>
                  ))}
                </div>
                <p className="text-[10px] text-orange-500 mt-1 italic">Note: These older files cannot be deleted from dashboard.</p>
              </div>
            )}

            {/* Rejection Feedback */}
            {verStatus === 'rejected' && profile.verification_feedback && (
              <div className="text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="font-medium text-red-500 mb-1">Review Feedback:</p>
                <p className="text-muted-foreground">{profile.verification_feedback}</p>
              </div>
            )}

            {/* Upload proof button */}
            {verStatus !== 'verified' && (
              <>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={handleProofUpload} />
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload Proof (Screenshot / PDF)'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Submit platform insights, analytics screenshots, or past campaign receipts. Admin will review it.
                </p>
              </>
            )}

            {verStatus === 'verified' && (
              <p className="text-xs text-green-600 text-center font-medium">
                ✅ Your metrics are verified. Your profile is ranked higher to organizers and sponsors.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="glass-card border-border/30">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your creator profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full justify-start" onClick={() => navigate('/edit-creator-profile')}>
              Update Profile & Media Kit
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/requests')}>
              View Campaign Requests
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreatorDashboard;

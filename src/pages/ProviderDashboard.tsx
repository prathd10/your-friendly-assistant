import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LayoutDashboard, Users, Star, Shield, CheckCircle, Clock, XCircle, AlertTriangle, Upload, Trash2, IndianRupee, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { uploadToImageKit, deleteFromImageKit } from '@/lib/imagekit';

// --- Trust Score Calculation (0-100) ---
function calculateTrustScore(profile: any): number {
  let score = 0;
  if (profile.niche && profile.city) score += 20;
  if (profile.business_description) score += 20;
  if (profile.verification_status === 'verified') score += 20;
  else if (profile.verification_proof_details?.length > 0) score += 10;
  if (profile.portfolio_urls?.length > 0) score += 20;
  score += 20; // Base trust
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
  flagged:        { label: '⚠ Account Warning', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-orange-500' },
};

const ProviderDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState({ activeRequests: 0, pendingRequests: 0, totalMatches: 0 });
  const [uploading, setUploading] = useState(false);

  const isPerformer = profile?.role === 'performer';
  const roleLabel = isPerformer ? 'Performer' : 'Service Provider';

  useEffect(() => {
    if (!profile) return;
    const fetchStats = async () => {
      const type = isPerformer ? 'organizer_to_performer' : 'organizer_to_vendor';
      const { data: requests } = await supabase
        .from('connection_requests')
        .select('status')
        .eq('receiver_id', profile.id)
        .eq('request_type', type);
      
      if (requests) {
        setStats({
          activeRequests: requests.filter((r) => r.status === 'accepted').length,
          pendingRequests: requests.filter((r) => r.status === 'pending').length,
          totalMatches: requests.length,
        });
      }
    };
    fetchStats();
  }, [profile, isPerformer]);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{roleLabel} Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {profile.full_name}!</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 bg-primary/5 text-primary border-primary/20">
          {isPerformer ? 'Talent Account' : 'Service Business'}
        </Badge>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active {isPerformer ? 'Gigs' : 'Services'}</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.activeRequests}</div></CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New {isPerformer ? 'Requests' : 'Inquiries'}</CardTitle>
            <MessageSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting your response</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outreach</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMatches}</div>
            <p className="text-xs text-muted-foreground mt-1">Organizers who found you</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Base Rate</CardTitle>
            <IndianRupee className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">₹{profile.pricing_per_post?.toLocaleString() || 0}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Verification Status Card */}
        <Card className={`border ${trustBg}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className={statusInfo.color}>{statusInfo.icon}</span>
              Trust & Verification
            </CardTitle>
            <CardDescription>
              Rank higher in search results with a verified profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
              <span className="text-sm font-medium">Trust Score</span>
              <span className={`text-2xl font-bold ${trustColor}`}>{trustScore} <span className="text-sm font-normal text-muted-foreground">/ 100</span></span>
            </div>

            {profile.verification_proof_details && profile.verification_proof_details.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Submitted Proofs</p>
                {profile.verification_proof_details.map((proof: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded border border-border/30 bg-background/40">
                    <a href={proof.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate max-w-[200px]">
                      View Proof #{i + 1}
                    </a>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteProof(proof.fileId, proof.url)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {verStatus !== 'verified' && (
              <>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={handleProofUpload} />
                <Button variant="outline" className="w-full" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload Business/Talent Proof'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Submit certifications, awards, or photos of past events/sets for review.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="glass-card border-border/30">
          <CardHeader>
            <CardTitle>Business Management</CardTitle>
            <CardDescription>Keep your profile up to date</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full justify-start" onClick={() => navigate('/edit-profile')}>
              Edit Profile & Portfolio
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/requests')}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Manage {isPerformer ? 'Bookings' : 'Service Inquiries'}
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => navigate('/messages')}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Open Chats
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProviderDashboard;

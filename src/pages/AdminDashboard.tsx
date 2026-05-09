import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Users, Heart, Eye, IndianRupee, MapPin, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const { profile } = useAuth();
  const [creators, setCreators] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'creator')
      .in('verification_status', ['pending_review', 'flagged'])
      .order('created_at', { ascending: false });
    setCreators(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (profile?.role !== 'admin') {
    return (
      <div className="flex justify-center items-center py-32">
        <p className="text-muted-foreground text-lg">⛔ Access Denied. Admins only.</p>
      </div>
    );
  }

  const handleAction = async (action: 'verified' | 'rejected') => {
    if (!selected) return;
    setProcessing(true);
    const updates: Record<string, any> = { verification_status: action };
    if (action === 'rejected' && feedback) {
      updates.verification_feedback = feedback;
    }
    const { error } = await supabase.from('users').update(updates).eq('id', selected.id);
    if (error) {
      toast.error('Action failed: ' + error.message);
    } else {
      toast.success(`Creator ${action === 'verified' ? 'approved' : 'rejected'} successfully!`);
      setSelected(null);
      setFeedback('');
      load();
    }
    setProcessing(false);
  };

  const statusColor: Record<string, string> = {
    pending_review: 'text-yellow-500 border-yellow-500/30',
    flagged: 'text-orange-500 border-orange-500/30',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin — Creator Verification Queue</h1>
        <p className="text-muted-foreground">Review pending creator verification requests.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : creators.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">🎉 No pending verifications right now.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {creators.map((creator) => (
            <Card
              key={creator.id}
              className="glass-card border-border/30 cursor-pointer hover:border-primary/40 hover:shadow-lg transition-all"
              onClick={() => { setSelected(creator); setFeedback(''); }}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{creator.full_name}</h3>
                    <p className="text-xs text-muted-foreground">{creator.platform} · {creator.niche}</p>
                  </div>
                  <Badge variant="outline" className={statusColor[creator.verification_status || ''] || ''}>
                    {creator.verification_status?.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{creator.followers_count?.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{creator.engagement_rate}% ER</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{creator.city}</span>
                </div>
                <p className="text-xs text-primary">{creator.verification_proof_urls?.length || 0} proof file(s) submitted</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selected.full_name}</DialogTitle>
                <p className="text-muted-foreground text-sm">{selected.platform} · {selected.niche} · {selected.city}</p>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg text-center text-sm border border-border/50">
                  <div><p className="text-xs text-muted-foreground">Followers</p><p className="font-bold">{selected.followers_count?.toLocaleString()}</p></div>
                  <div className="border-x border-border/50"><p className="text-xs text-muted-foreground">Engagement</p><p className="font-bold">{selected.engagement_rate}%</p></div>
                  <div><p className="text-xs text-muted-foreground">Avg Views</p><p className="font-bold">{selected.average_views?.toLocaleString()}</p></div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Pricing</p>
                  <p className="text-sm flex items-center gap-1"><IndianRupee className="h-3 w-3" />₹{selected.pricing_per_post?.toLocaleString()} / post</p>
                </div>

                {selected.audience_demographics && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Audience Demographics</p>
                    <p className="text-sm text-muted-foreground">{selected.audience_demographics}</p>
                  </div>
                )}

                <Separator />

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Submitted Proof ({selected.verification_proof_urls?.length || 0} files)</p>
                  {selected.verification_proof_urls && selected.verification_proof_urls.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selected.verification_proof_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary border border-primary/30 rounded px-2 py-1 hover:bg-primary/10">
                          <ExternalLink className="h-3 w-3" /> View Proof #{i + 1}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No proof uploaded yet.</p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Rejection Reason (optional, shown to creator if rejected)</p>
                  <Textarea
                    placeholder="e.g. Engagement rate appears artificially inflated. Please submit authentic analytics..."
                    className="h-20"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700" disabled={processing} onClick={() => handleAction('verified')}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Approve
                  </Button>
                  <Button variant="destructive" className="flex-1" disabled={processing} onClick={() => handleAction('rejected')}>
                    <XCircle className="h-4 w-4 mr-2" /> Reject
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;

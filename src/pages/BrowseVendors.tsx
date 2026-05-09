import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, IndianRupee, Utensils, Camera, Truck, Send, ExternalLink, Sparkles, CheckCircle, Shield, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

// --- Shared Trust Score calculation (0-100) ---
function calcTrust(c: UserProfile): number {
  let s = 0;
  if (c.organization_name && c.city) s += 20;
  if (c.verification_status === 'verified') s += 30;
  else if (c.verification_proof_urls && c.verification_proof_urls.length > 0) s += 15;
  if (c.portfolio_urls && c.portfolio_urls.length > 0) s += 20;
  s += 30; // Vendors usually have established businesses
  return Math.min(s, 100);
}

function trustColor(score: number) {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
}

const BrowseVendors = () => {
  const { user, profile } = useAuth();
  const [vendors, setVendors] = useState<UserProfile[]>([]);
  const [filtered, setFiltered] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<UserProfile | null>(null);

  // Inquiry Request State
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [serviceType, setServiceType] = useState('Full Package');
  const [budget, setBudget] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;

    const load = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'vendor')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[BrowseVendors] fetch error:', error);
        setLoading(false);
        return;
      }

      setVendors(data || []);
      setFiltered(data || []);
      setLoading(false);
    };

    load();
  }, [user, profile]);

  useEffect(() => {
    let result = vendors;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.organization_name?.toLowerCase().includes(q) ||
        c.niche?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [vendors, search]);

  const handleSendRequest = async () => {
    if (!user || !profile || !selectedVendor) return;
    if (!budget || !deliverables || !message) {
      toast.error('Please fill in all inquiry details');
      return;
    }

    setSending(true);
    try {
      const { data: existing } = await supabase
        .from('connection_requests')
        .select('id, status')
        .eq('sender_id', user.id)
        .eq('receiver_id', selectedVendor.id)
        .in('status', ['pending', 'accepted'])
        .maybeSingle();

      if (existing) {
        toast.info(`You already have a ${existing.status} request with this service provider.`);
        setSending(false);
        return;
      }

      const { error } = await supabase.from('connection_requests').insert({
        sender_id: user.id,
        receiver_id: selectedVendor.id,
        request_type: 'organizer_to_vendor',
        message,
        campaign_details: {
          serviceType,
          budget: Number(budget),
          deliverables
        }
      });

      if (error) throw error;
      
      toast.success('Service inquiry sent successfully!');
      setShowRequestForm(false);
      setSelectedVendor(null);
      setBudget('');
      setDeliverables('');
      setMessage('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send inquiry');
    } finally {
      setSending(false);
    }
  };

  const getIcon = (niche: string) => {
    const n = niche?.toLowerCase() || '';
    if (n.includes('food') || n.includes('cater')) return <Utensils className="h-5 w-5 text-primary" />;
    if (n.includes('photo') || n.includes('video')) return <Camera className="h-5 w-5 text-primary" />;
    if (n.includes('logistics') || n.includes('decor')) return <Truck className="h-5 w-5 text-primary" />;
    return <Briefcase className="h-5 w-5 text-primary" />;
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Find Service Providers</h1>
        <p className="text-muted-foreground">Hire caterers, photographers, decorators, and other event essentials.</p>
      </div>

      <Card className="glass-card border-border/30">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by company name, service (e.g. Catering), location..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">No service providers found yet.</p>
      ) : (
        <div className="grid gap-3 sm:gap-6 grid-cols-2 lg:grid-cols-3">
          {filtered.map((vendor) => (
            <Card
              key={vendor.id}
              className="glass-card border-border/30 hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer"
              onClick={() => setSelectedVendor(vendor)}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-1 sm:gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {getIcon(vendor.niche || '')}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs sm:text-base flex items-center gap-1 truncate">
                        {vendor.organization_name || vendor.full_name}
                        {vendor.verification_status === 'verified' && (
                          <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                        )}
                      </h3>
                      <p className="text-[10px] text-muted-foreground truncate">{vendor.city || 'India'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {vendor.niche && <Badge variant="outline" className="text-[8px] sm:text-xs px-1 py-0">{vendor.niche}</Badge>}
                    {(() => { const ts = calcTrust(vendor); return (
                      <span className={`text-[8px] sm:text-xs font-bold ${trustColor(ts)}`}>T {ts}</span>
                    ); })()}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground pt-2">
                  <span className="flex items-center gap-1 font-medium"><Briefcase className="h-3 w-3 text-muted-foreground" /> Professional Service</span>
                  {vendor.pricing_per_post ? <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />Packages from ₹{vendor.pricing_per_post.toLocaleString()}</span> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Vendor Detail Dialog */}
      <Dialog open={!!selectedVendor} onOpenChange={(open) => !open && setSelectedVendor(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedVendor && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-wrap gap-2">
                    {selectedVendor.verification_status === 'verified' ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        <CheckCircle className="h-3 w-3 mr-1" /> Business Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-500/30">
                        <Shield className="h-3 w-3 mr-1" /> Identity Verified
                      </Badge>
                    )}
                  </div>
                  {selectedVendor.niche && <Badge variant="outline">{selectedVendor.niche}</Badge>}
                </div>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  {selectedVendor.organization_name || selectedVendor.full_name}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" /> {selectedVendor.city || 'India'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-sm font-medium">Business Trust Score</span>
                  {(() => { const ts = calcTrust(selectedVendor); return (
                    <span className={`text-2xl font-bold ${trustColor(ts)}`}>{ts} <span className="text-xs font-normal text-muted-foreground">/ 100</span></span>
                  ); })()}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-1 flex items-center gap-1"><Briefcase className="h-4 w-4 text-primary" /> Service Description</h4>
                    <p className="text-sm text-muted-foreground bg-muted/20 p-3 rounded border border-border/20">
                      {selectedVendor.business_description || "High-quality professional services tailored for events of all sizes."}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-1 flex items-center gap-1"><IndianRupee className="h-4 w-4 text-primary" /> Standard Rates</h4>
                    <p className="text-sm">
                      Starting at <span className="font-semibold text-primary">₹{selectedVendor.pricing_per_post?.toLocaleString() || 0}</span> 
                      <span className="text-muted-foreground text-xs ml-1">base package price</span>
                    </p>
                  </div>

                  {selectedVendor.portfolio_urls && selectedVendor.portfolio_urls.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                       {selectedVendor.portfolio_urls.map((url, i) => (
                         <Button key={i} variant="outline" size="sm" onClick={() => window.open(url, '_blank')} className="truncate">
                           <ExternalLink className="h-3 w-3 mr-2" /> View Portfolio
                         </Button>
                       ))}
                    </div>
                  )}
                </div>

                {!showRequestForm ? (
                  <div className="pt-4 border-t border-border/30">
                    <Button className="w-full" onClick={() => setShowRequestForm(true)}>
                      <Send className="h-4 w-4 mr-2" /> Send Service Inquiry
                    </Button>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-border/30 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                    <h4 className="font-semibold text-sm">Service Requirements</h4>
                    
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Required Service</p>
                      <Select value={serviceType} onValueChange={setServiceType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Full Package">Full Package</SelectItem>
                          <SelectItem value="Partial Service">Partial Service</SelectItem>
                          <SelectItem value="Single Day Support">Single Day Support</SelectItem>
                          <SelectItem value="Custom Requirement">Custom Requirement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Estimated Budget (₹)</p>
                      <Input type="number" placeholder="e.g. 20000" value={budget} onChange={(e) => setBudget(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Specific Deliverables</p>
                      <Textarea placeholder="e.g. 4-course dinner for 200 people, 50 high-res photos..." className="h-20" value={deliverables} onChange={(e) => setDeliverables(e.target.value)} />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Message</p>
                      <Textarea placeholder="Details about your event and specific needs..." className="h-24" value={message} onChange={(e) => setMessage(e.target.value)} />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" className="flex-1" onClick={() => setShowRequestForm(false)}>Cancel</Button>
                      <Button className="flex-1" onClick={handleSendRequest} disabled={sending}>
                        {sending ? 'Sending...' : 'Send Inquiry'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrowseVendors;

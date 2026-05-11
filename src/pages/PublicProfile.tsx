import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { UserProfile, Event, SponsorPreferences } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Building, MapPin, Calendar, Users, IndianRupee, ArrowLeft, 
  Star, Send, Music, Truck, Users2, Target, Globe, Phone, Mail,
  ExternalLink, CheckCircle2, LayoutGrid
} from 'lucide-react';
import { toast } from 'sonner';
import QuickRequestDialog from '@/components/QuickRequestDialog';

const PublicProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const fetchProfile = async () => {
      setLoading(true);
      // Fetch user profile
      const { data: userData, error: userErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
        
      if (userErr || !userData) {
        setLoading(false);
        return;
      }
      
      setUserProfile(userData);

      // If organizer, fetch their events
      if (userData.role === 'organizer') {
        const { data: eventsData } = await supabase
          .from('events')
          .select('*')
          .eq('organizer_id', id)
          .order('created_at', { ascending: false });
        setEvents(eventsData || []);
      }
      
      setLoading(false);
    };

    fetchProfile();
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  if (!userProfile) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-2">Profile not found</h2>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const renderOrganizerDetails = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
        {events.filter(e => e.status === 'active').map(event => (
          <Card key={event.id} className="glass-card border-border/30 overflow-hidden cursor-pointer hover:shadow-lg transition-all" onClick={() => navigate(`/event/${event.id}/dashboard`)}>
             <CardContent className="p-5 space-y-2">
                <div className="flex justify-between items-start">
                   <h3 className="font-bold truncate">{event.name}</h3>
                   <Badge variant="outline">{event.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-2">
                   <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.city}</span>
                   <span className="flex items-center gap-1"><Users className="h-3 w-3" />{event.expected_footfall}</span>
                </div>
             </CardContent>
          </Card>
        ))}
      </div>
      {events.length === 0 && <p className="text-center py-10 text-muted-foreground italic">No events published yet.</p>}
    </div>
  );

  const renderSponsorDetails = () => {
    const sp = userProfile.preferences as SponsorPreferences;
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-muted/20 border-border/50">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Sponsorship Focus</h3>
              <div className="space-y-3">
                {sp?.max_budget && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Max Ticket Size</span>
                    <span className="font-bold">₹{sp.max_budget.toLocaleString()}</span>
                  </div>
                )}
                {sp?.min_audience && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Min Audience</span>
                    <span className="font-bold">{sp.min_audience.toLocaleString()}+</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/20 border-border/50">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-primary" /> Target Niches</h3>
              <div className="flex flex-wrap gap-2">
                {sp?.categories?.map(c => <Badge key={c} variant="secondary">{c}</Badge>)}
                {!sp?.categories?.length && <span className="text-xs text-muted-foreground">All Categories</span>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderTalentDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted/30 p-4 rounded-xl text-center border border-border/30">
          <p className="text-2xl font-black text-primary">{userProfile.followers_count ? (Number(userProfile.followers_count) >= 1000 ? `${(Number(userProfile.followers_count) / 1000).toFixed(1)}K` : userProfile.followers_count) : 'N/A'}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 font-bold">Followers</p>
        </div>
        <div className="bg-muted/30 p-4 rounded-xl text-center border border-border/30">
          <p className="text-2xl font-black text-primary">{userProfile.engagement_rate ? `${userProfile.engagement_rate}%` : 'N/A'}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 font-bold">Engagement</p>
        </div>
        <div className="bg-muted/30 p-4 rounded-xl text-center border border-border/30">
          <p className="text-2xl font-black text-primary">{userProfile.niche || 'N/A'}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 font-bold">Niche</p>
        </div>
        <div className="bg-muted/30 p-4 rounded-xl text-center border border-border/30">
          <p className="text-2xl font-black text-primary">{userProfile.platform || 'Direct'}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 font-bold">Platform</p>
        </div>
      </div>
      
      {userProfile.pricing_per_post !== undefined && userProfile.pricing_per_post !== null && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                   <IndianRupee className="h-5 w-5 text-primary" />
                </div>
                <div>
                   <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Starting Commercials</p>
                   <p className="text-xl font-bold">₹{Number(userProfile.pricing_per_post).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">/ campaign</span></p>
                </div>
             </div>
             <Button onClick={() => setIsRequestDialogOpen(true)}>
                Book Now
             </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-4 gap-2 text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {/* Header Profile Card */}
      <Card className="overflow-hidden border-none shadow-2xl bg-background/50 backdrop-blur-xl">
        <div className="h-40 bg-gradient-to-br from-primary/30 via-primary/5 to-background relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.2),transparent)]" />
        </div>
        <CardContent className="relative px-8 pb-8 -mt-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-end gap-6">
              <div className="h-32 w-32 rounded-2xl bg-background border-4 border-background shadow-xl overflow-hidden shrink-0">
                {userProfile.profile_photo ? (
                  <img src={userProfile.profile_photo} alt="" className="h-full w-full object-cover" />
                ) : userProfile.organization_logo ? (
                  <img src={userProfile.organization_logo} alt="" className="h-full w-full object-contain p-2" />
                ) : (
                  <div className="h-full w-full bg-primary/10 flex items-center justify-center">
                    {userProfile.role === 'sponsor' ? <Building className="h-12 w-12 text-primary/50" /> : <Users2 className="h-12 w-12 text-primary/50" />}
                  </div>
                )}
              </div>
              <div className="pb-2">
                <div className="flex items-center gap-2 mb-1">
                   <h1 className="text-3xl font-black tracking-tight">{userProfile?.organization_name || userProfile?.full_name}</h1>
                   {userProfile?.verification_status === 'verified' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <Badge variant="secondary" className="capitalize px-3">{userProfile?.role}</Badge>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {userProfile?.city || 'India'}</span>
                  {userProfile?.website_url && (
                    <a href={userProfile.website_url} target="_blank" rel="noopener" className="flex items-center gap-1 text-primary hover:underline">
                      <Globe className="h-3 w-3" /> Website
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pb-2">
               <Button onClick={() => setIsRequestDialogOpen(true)} className="gap-2 px-6">
                  <Send className="h-4 w-4" /> Connect
               </Button>
               <Button variant="outline" size="icon" onClick={() => toast.info("Sharing coming soon!")}>
                  <ExternalLink className="h-4 w-4" />
               </Button>
            </div>
          </div>

          <Separator className="my-8 opacity-50" />

          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div>
                <h3 className="text-lg font-bold mb-3">About</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {userProfile?.business_description || `A professional ${userProfile?.role} dedicated to excellence in the ${userProfile?.niche || 'event'} space. Contact for collaborations.`}
                </p>
              </div>

              {/* Role Specific Content */}
              <div className="pt-4">
                <h3 className="text-lg font-bold mb-4">
                  {userProfile.role === 'organizer' ? 'Active Events' : 
                   userProfile.role === 'sponsor' ? 'Sponsorship Preferences' : 
                   'Portfolio & Stats'}
                </h3>
                {userProfile.role === 'organizer' ? renderOrganizerDetails() : 
                 userProfile.role === 'sponsor' ? renderSponsorDetails() : 
                 renderTalentDetails()}
              </div>
            </div>

            <div className="space-y-6">
              <Card className="bg-muted/20 border-border/30">
                <CardHeader>
                  <CardTitle className="text-sm">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center border">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Email</p>
                      <p className="font-medium">{userProfile?.email}</p>
                    </div>
                  </div>
                  {userProfile?.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center border">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Phone</p>
                        <p className="font-medium">{userProfile?.phone}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {userProfile.niche && (
                <Card className="bg-muted/20 border-border/30">
                  <CardHeader>
                    <CardTitle className="text-sm">Specialization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{userProfile.niche}</Badge>
                      {userProfile.role === 'performer' && <Badge variant="outline">Live Performance</Badge>}
                      {userProfile.role === 'creator' && <Badge variant="outline">Content Creator</Badge>}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <QuickRequestDialog 
        isOpen={isRequestDialogOpen}
        onOpenChange={setIsRequestDialogOpen}
        targetUser={userProfile}
      />
    </div>
  );
};

export default PublicProfile;

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { UserProfile, Event } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building, MapPin, Calendar, Users, IndianRupee, ArrowLeft, Image as ImageIcon, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

const OrganizerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [organizer, setOrganizer] = useState<UserProfile | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    
    const fetchProfile = async () => {
      // Fetch user profile
      const { data: userData, error: userErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
        
      if (userErr || !userData || userData.role !== 'organizer') {
        setLoading(false);
        return;
      }
      
      setOrganizer(userData);

      // Fetch their events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', id)
        .order('created_at', { ascending: false });
        
      setEvents(eventsData || []);
      setLoading(false);
    };

    fetchProfile();
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  if (!organizer) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-2">Organizer not found</h2>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const activeEvents = events.filter(e => e.status === 'active');
  const pastEvents = events.filter(e => e.status === 'closed');

  const openEventDetails = (event: Event) => {
    setSelectedEvent(event);
    setActiveMediaIndex(0);
  };

  const nextMedia = () => {
    if (selectedEvent && selectedEvent.past_event_media) {
      setActiveMediaIndex((i) => (i + 1) % selectedEvent.past_event_media!.length);
    }
  };

  const prevMedia = () => {
    if (selectedEvent && selectedEvent.past_event_media) {
      setActiveMediaIndex((i) => (i - 1 + selectedEvent.past_event_media!.length) % selectedEvent.past_event_media!.length);
    }
  };

  const renderEventCard = (event: Event) => (
    <Card 
      key={event.id} 
      className="glass-card border-border/30 overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all"
      onClick={() => openEventDetails(event)}
    >
      {event.past_event_media && event.past_event_media.length > 0 && (
        <div className="h-48 w-full bg-muted border-b border-border/30 relative">
          {event.past_event_media[0].match(/\.(mp4|mov|webm)$/i) ? (
            <video src={event.past_event_media[0]} className="object-cover w-full h-full" muted loop playsInline />
          ) : (
            <img src={event.past_event_media[0]} alt="Event highlight" className="object-cover w-full h-full" />
          )}
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1">
            <ImageIcon className="h-3 w-3" /> {event.past_event_media.length} Media
          </div>
        </div>
      )}
      <CardContent className="p-5 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-lg">{event.name}</h3>
          <Badge variant={event.status === 'active' ? 'default' : 'secondary'}>{event.status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.city}</span>
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(event.event_date).toLocaleDateString()}</span>
          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{event.audience_size}</span>
          {event.status === 'active' && <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />₹{event.budget_required.toLocaleString()}</span>}
        </div>
        <div className="flex gap-1 flex-wrap pt-2">
          <Badge variant="outline" className="text-xs">{event.category}</Badge>
          {event.tags?.slice(0, 2).map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2 -ml-4 hover:bg-transparent hover:underline text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      {/* Organizer Header */}
      <Card className="glass-card border-border/30 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent flex items-end px-6 pb-6">
          <div className="flex items-center gap-4 translate-y-6">
            <div className="h-20 w-20 rounded-xl bg-background border shadow-sm flex items-center justify-center overflow-hidden shrink-0">
              {organizer.profile_photo ? (
                <img src={organizer.profile_photo} alt="" className="h-full w-full object-cover" />
              ) : organizer.organization_logo ? (
                <img src={organizer.organization_logo} alt="" className="h-full w-full object-contain p-2" />
              ) : (
                <Building className="h-10 w-10 text-primary/50" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{organizer.organization_name}</h1>
              <p className="text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-4 w-4" /> {organizer.city || 'India'}</p>
            </div>
          </div>
        </div>
        <CardContent className="pt-12 pb-6 px-6">
          <div className="grid grid-cols-3 gap-4 border border-border/50 rounded-lg p-4 bg-muted/20">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Events</p>
              <p className="text-2xl font-bold">{events.length}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Events</p>
              <p className="text-2xl font-bold">{activeEvents.length}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Representative</p>
              <p className="text-sm font-medium mt-1">{organizer.full_name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Events */}
      {activeEvents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">Active Events <Badge>{activeEvents.length}</Badge></h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeEvents.map(renderEventCard)}
          </div>
        </div>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-bold flex items-center gap-2">Past Events <Badge variant="secondary">{pastEvents.length}</Badge></h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pastEvents.map(renderEventCard)}
          </div>
        </div>
      )}
      
      {events.length === 0 && (
        <div className="text-center py-10 border border-dashed rounded-lg text-muted-foreground">
          <p>This organizer hasn't created any events yet.</p>
        </div>
      )}

      {/* Event Details & Media Gallery Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-border/30">
          {selectedEvent && (
            <div className="flex flex-col md:flex-row h-full">
              {/* Media Gallery Section */}
              <div className="w-full md:w-3/5 bg-black min-h-[300px] flex flex-col relative items-center justify-center">
                {selectedEvent.past_event_media && selectedEvent.past_event_media.length > 0 ? (
                  <>
                    <div className="w-full h-full flex items-center justify-center relative">
                      {selectedEvent.past_event_media[activeMediaIndex].match(/\.(mp4|mov|webm)$/i) ? (
                        <video 
                          src={selectedEvent.past_event_media[activeMediaIndex]} 
                          className="max-w-full max-h-[80vh] object-contain" 
                          controls 
                          autoPlay 
                          playsInline 
                        />
                      ) : (
                        <img 
                          src={selectedEvent.past_event_media[activeMediaIndex]} 
                          alt={`Event media ${activeMediaIndex + 1}`} 
                          className="max-w-full max-h-[80vh] object-contain" 
                        />
                      )}
                    </div>
                    
                    {/* Gallery Controls */}
                    {selectedEvent.past_event_media.length > 1 && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute left-2 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full h-10 w-10"
                          onClick={() => prevMedia()}
                        >
                          <ChevronLeft className="h-6 w-6" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full h-10 w-10"
                          onClick={() => nextMedia()}
                        >
                          <ChevronRight className="h-6 w-6" />
                        </Button>
                        
                        {/* Media Counter */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                          {activeMediaIndex + 1} / {selectedEvent.past_event_media.length}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-white/50 flex flex-col items-center justify-center h-full p-10">
                    <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
                    <p>No media uploaded for this event</p>
                  </div>
                )}
              </div>

              {/* Event Details Section */}
              <div className="w-full md:w-2/5 p-6 bg-background flex flex-col overflow-y-auto">
                <DialogHeader className="mb-4 text-left">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <Badge variant={selectedEvent.status === 'active' ? 'default' : 'secondary'}>
                      {selectedEvent.status}
                    </Badge>
                    <Badge variant="outline">{selectedEvent.category}</Badge>
                  </div>
                  <DialogTitle className="text-2xl leading-tight">{selectedEvent.name}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">About</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedEvent.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm bg-muted/30 p-4 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center"><Calendar className="h-3 w-3 mr-1" /> Date</p>
                      <p className="font-medium">{new Date(selectedEvent.event_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center"><MapPin className="h-3 w-3 mr-1" /> Location</p>
                      <p className="font-medium">{selectedEvent.city}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center"><Users className="h-3 w-3 mr-1" /> Audience Size</p>
                      <p className="font-medium">{selectedEvent.audience_size}</p>
                    </div>
                    {selectedEvent.status === 'active' && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 flex items-center"><IndianRupee className="h-3 w-3 mr-1" /> Budget required</p>
                        <p className="font-medium">₹{selectedEvent.budget_required.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                  
                  {selectedEvent.pitch_deck_url && (
                    <div>
                      <Button 
                        className="w-full" 
                        variant="default"
                        onClick={() => window.open(selectedEvent.pitch_deck_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" /> View Pitch Deck
                      </Button>
                    </div>
                  )}
                  
                  {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedEvent.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizerProfile;

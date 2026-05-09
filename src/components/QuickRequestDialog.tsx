import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile, Event } from '@/types/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2, Calendar, MapPin, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface QuickRequestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: UserProfile | null;
}

const QuickRequestDialog: React.FC<QuickRequestDialogProps> = ({ isOpen, onOpenChange, targetUser }) => {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [budget, setBudget] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  useEffect(() => {
    if (isOpen && user && profile?.role === 'organizer') {
      loadOrganizerEvents();
    }
  }, [isOpen, user, profile]);

  const loadOrganizerEvents = async () => {
    setIsLoadingEvents(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', user?.id)
        .eq('status', 'active');
      
      if (error) throw error;
      setEvents(data || []);
      if (data && data.length > 0) {
        setSelectedEventId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
      toast.error('Could not load your events');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const handleSend = async () => {
    if (!user || !targetUser) return;
    
    if (profile?.role === 'organizer' && !selectedEventId) {
      toast.error('Please select an event for this request');
      return;
    }

    if (!message.trim()) {
      toast.error('Please include a message');
      return;
    }

    setIsSending(true);
    try {
      // Determine request type
      let requestType: any = 'organizer_to_performer';
      if (profile?.role === 'organizer') {
        if (targetUser.role === 'sponsor') requestType = 'organizer_to_sponsor';
        else if (targetUser.role === 'creator') requestType = 'organizer_to_creator';
        else if (targetUser.role === 'vendor') requestType = 'organizer_to_vendor';
        else requestType = 'organizer_to_performer';
      } else if (profile?.role === 'sponsor') {
        if (targetUser.role === 'organizer') requestType = 'sponsor_to_organizer';
        else if (targetUser.role === 'creator') requestType = 'sponsor_to_creator';
      } else if (profile?.role === 'creator') {
        if (targetUser.role === 'organizer') requestType = 'creator_to_organizer';
        else if (targetUser.role === 'sponsor') requestType = 'creator_to_sponsor';
      }

      const { error } = await supabase.from('connection_requests').insert({
        sender_id: user.id,
        receiver_id: targetUser.id,
        event_id: selectedEventId || null,
        request_type: requestType,
        message,
        campaign_details: (budget || deliverables) ? {
          budget: budget ? Number(budget) : undefined,
          deliverables: deliverables || undefined,
        } : null,
        status: 'pending'
      });

      if (error) throw error;

      toast.success(`Request sent to ${targetUser.organization_name || targetUser.full_name}!`);
      onOpenChange(false);
      // Reset form
      setMessage('');
      setBudget('');
      setDeliverables('');
    } catch (err: any) {
      console.error('Failed to send request:', err);
      toast.error(err.message || 'Failed to send request');
    } finally {
      setIsSending(false);
    }
  };

  if (!targetUser) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background/95 backdrop-blur-2xl border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Quick Request
          </DialogTitle>
          <DialogDescription>
            Send an immediate connection request to <strong>{targetUser.organization_name || targetUser.full_name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {profile?.role === 'organizer' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Your Event</label>
              {isLoadingEvents ? (
                <div className="h-10 w-full flex items-center justify-center bg-muted/20 rounded-lg animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              ) : events.length > 0 ? (
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger className="bg-background/50 border-white/10">
                    <SelectValue placeholder="Choose an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map(ev => (
                      <SelectItem key={ev.id} value={ev.id}>
                        <div className="flex flex-col items-start py-0.5">
                          <span className="font-medium text-sm">{ev.name}</span>
                          <span className="text-[10px] text-muted-foreground">{ev.city} • {new Date(ev.event_date).toLocaleDateString()}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs text-orange-500 text-center">
                  You don't have any active events. Create one to send requests.
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Message</label>
            <Textarea 
              placeholder={`Hi ${targetUser.full_name.split(' ')[0]}, I'd love to collaborate with you on...`}
              className="min-h-[100px] bg-background/50 border-white/10 resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Budget (Optional)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  className="pl-7 bg-background/50 border-white/10"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date (Optional)</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="text" 
                  placeholder="DD/MM/YYYY" 
                  className="pl-10 bg-background/50 border-white/10"
                  disabled // Simplified for now, just text or derived from event
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            className="flex-1 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            onClick={handleSend}
            disabled={isSending || (profile?.role === 'organizer' && events.length === 0)}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickRequestDialog;

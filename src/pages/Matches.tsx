import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface MatchRow {
  id: string;
  match_score: number;
  reason: string;
  event_id: string;
  sponsor_id: string;
  event_name: string;
  event_category: string;
  event_city: string;
  counterpart_name: string;
  counterpart_org: string;
}

const Matches = () => {
  const { user, profile } = useAuth();
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !profile) { setLoading(false); return; }
    const load = async () => {
      if (profile.role === 'organizer') {
        const { data: events } = await supabase.from('events').select('id, name, category, city').eq('organizer_id', user.id);
        const eventIds = events?.map((e) => e.id) || [];
        if (!eventIds.length) { setLoading(false); return; }
        const { data: matchData } = await supabase.from('matches').select('*, users!matches_sponsor_id_fkey(full_name, organization_name)').in('event_id', eventIds);
        const eventMap = Object.fromEntries(events?.map((e) => [e.id, e]) || []);
        setMatches(matchData?.map((m: any) => ({
          id: m.id, match_score: m.match_score, reason: m.reason,
          event_id: m.event_id, sponsor_id: m.sponsor_id,
          event_name: eventMap[m.event_id]?.name || '', event_category: eventMap[m.event_id]?.category || '',
          event_city: eventMap[m.event_id]?.city || '',
          counterpart_name: m.users?.full_name || '', counterpart_org: m.users?.organization_name || '',
        })) || []);
      } else {
        const { data: matchData } = await supabase
          .from('matches')
          .select('*, events(name, category, city, organizer_id), users!matches_sponsor_id_fkey(full_name)')
          .eq('sponsor_id', user.id);
        setMatches(matchData?.map((m: any) => ({
          id: m.id, match_score: m.match_score, reason: m.reason,
          event_id: m.event_id, sponsor_id: m.sponsor_id,
          event_name: m.events?.name || '', event_category: m.events?.category || '',
          event_city: m.events?.city || '',
          counterpart_name: '', counterpart_org: '',
        })) || []);
      }
      setLoading(false);
    };
    load();
  }, [user, profile]);

  const startConversation = async (match: MatchRow) => {
    if (!user || !profile) return;
    const organizerId = profile.role === 'organizer' ? user.id : undefined;
    const sponsorId = profile.role === 'sponsor' ? user.id : match.sponsor_id;

    // Check if conversation exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('event_id', match.event_id)
      .eq('sponsor_id', sponsorId!)
      .single();

    if (existing) {
      navigate(`/messages?conv=${existing.id}`);
      return;
    }

    // Get organizer ID if sponsor
    let orgId = organizerId;
    if (!orgId) {
      const { data: event } = await supabase.from('events').select('organizer_id').eq('id', match.event_id).single();
      orgId = event?.organizer_id;
    }

    const { data, error } = await supabase.from('conversations').insert({
      event_id: match.event_id,
      organizer_id: orgId!,
      sponsor_id: sponsorId!,
    }).select('id').single();

    if (error) { toast.error('Failed to start conversation'); return; }
    navigate(`/messages?conv=${data.id}`);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {profile?.role === 'organizer' ? 'Matched Sponsors' : 'Matched Events'}
      </h1>
      {matches.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">No matches yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {matches.map((m) => (
            <Card key={m.id} className="glass-card border-border/30">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{m.event_name}</h3>
                    {m.counterpart_org && (
                      <p className="text-sm text-muted-foreground">{m.counterpart_org}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span className="text-sm font-bold text-primary">{m.match_score}%</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">{m.event_category}</Badge>
                  <Badge variant="outline">{m.event_city}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{m.reason}</p>
                <Button size="sm" variant="outline" onClick={() => startConversation(m)} className="w-full">
                  <MessageSquare className="h-4 w-4 mr-1" /> Message
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Matches;

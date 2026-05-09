import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, MessageSquare, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import VirtualWallet from '@/components/VirtualWallet';

const COLORS = ['hsl(349,70%,65%)', 'hsl(240,67%,75%)', 'hsl(170,50%,60%)', 'hsl(40,80%,65%)', 'hsl(280,50%,65%)'];

const OrganizerDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ events: 0, matches: 0, messages: 0, sponsors: 0 });
  const [matchData, setMatchData] = useState<{ name: string; matches: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: events } = await supabase.from('events').select('id, name, category').eq('organizer_id', user.id);
      const eventIds = events?.map((e) => e.id) || [];
      if (!eventIds.length) {
        setStats({ events: 0, matches: 0, messages: 0, sponsors: 0 });
        return;
      }
      const { count: matchCount } = await supabase.from('matches').select('*', { count: 'exact', head: true }).in('event_id', eventIds);
      const { count: msgCount } = await supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('organizer_id', user.id);
      const { data: matchesPerEvent } = await supabase.from('matches').select('event_id').in('event_id', eventIds);

      const sponsorIds = new Set<string>();
      matchesPerEvent?.forEach((m) => sponsorIds.add(m.event_id));

      setStats({
        events: events?.length || 0,
        matches: matchCount || 0,
        messages: msgCount || 0,
        sponsors: sponsorIds.size,
      });

      // Matches per event
      const mpe: Record<string, number> = {};
      matchesPerEvent?.forEach((m) => { mpe[m.event_id] = (mpe[m.event_id] || 0) + 1; });
      setMatchData(events?.map((e) => ({ name: e.name?.substring(0, 15) || 'Event', matches: mpe[e.id] || 0 })) || []);

      // Category distribution
      const cats: Record<string, number> = {};
      events?.forEach((e) => { cats[e.category] = (cats[e.category] || 0) + 1; });
      setCategoryData(Object.entries(cats).map(([name, value]) => ({ name, value })));
    };
    load();
  }, [user]);

  const statCards = [
    { label: 'Total Events', value: stats.events, icon: Calendar, color: 'text-primary' },
    { label: 'Total Matches', value: stats.matches, icon: Sparkles, color: 'text-accent-foreground' },
    { label: 'Messages', value: stats.messages, icon: MessageSquare, color: 'text-primary' },
    { label: 'Active Sponsors', value: stats.sponsors, icon: Users, color: 'text-accent-foreground' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organizer Dashboard</h1>
          <p className="text-sm text-muted-foreground">Monitor your event health and sponsor engagement</p>
        </div>
        <div className="w-full md:w-80">
          <VirtualWallet />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="glass-card border-border/30">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card border-border/30">
          <CardHeader><CardTitle className="text-base">Matches per Event</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={matchData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="matches" fill="hsl(349,70%,65%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/30">
          <CardHeader><CardTitle className="text-base">Category Distribution</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name }) => name}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrganizerDashboard;

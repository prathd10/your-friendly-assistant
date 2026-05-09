import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Calendar, MessageSquare, Sparkles, TrendingUp, MapPin, Users, Building, IndianRupee, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import VirtualWallet from '@/components/VirtualWallet';

const COLORS = ['hsl(349,70%,65%)', 'hsl(240,67%,75%)', 'hsl(170,50%,60%)', 'hsl(40,80%,65%)', 'hsl(280,50%,65%)'];

const SponsorDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ matched: 0, conversations: 0, messages: 0 });
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([]);
  const [budgetData, setBudgetData] = useState<{ name: string; budget: number }[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [topCreators, setTopCreators] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: matches } = await supabase
        .from('matches')
        .select('id, event_id, events(category, name, budget_required)')
        .eq('sponsor_id', user.id);

      const { count: convCount } = await supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('sponsor_id', user.id);
      const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', user.id);

      setStats({
        matched: matches?.length || 0,
        conversations: convCount || 0,
        messages: msgCount || 0,
      });

      const cats: Record<string, number> = {};
      const budgets: { name: string; budget: number }[] = [];
      matches?.forEach((m: any) => {
        const ev = m.events;
        if (ev) {
          cats[ev.category] = (cats[ev.category] || 0) + 1;
          budgets.push({ name: ev.name?.substring(0, 12) || 'Event', budget: ev.budget_required || 0 });
        }
      });
      setCategoryData(Object.entries(cats).map(([name, value]) => ({ name, value })));
      setBudgetData(budgets.slice(0, 8));

      // Featured Events
      const { data: fe } = await supabase.from('events').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(2);
      setRecentEvents(fe || []);

      // Trending Creators
      const { data: tc } = await supabase.from('users').select('*').eq('role', 'creator').order('created_at', { ascending: false }).limit(2);
      setTopCreators(tc || []);
    };
    load();
  }, [user]);

  const statCards = [
    { label: 'Matched Events', value: stats.matched, icon: Sparkles },
    { label: 'Conversations', value: stats.conversations, icon: MessageSquare },
    { label: 'Messages', value: stats.messages, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sponsor Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage your event sponsorships and track ROI</p>
        </div>
        <div className="w-full md:w-80">
          <VirtualWallet />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Events Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Featured Events</h2>
            <Link to="/browse-events" className="text-xs text-primary hover:underline">View All</Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {recentEvents.map((event) => (
              <Card key={event.id} className="glass-card border-border/30 hover:border-primary/20 transition-all group overflow-hidden">
                <CardContent className="p-3 space-y-2">
                  <h3 className="font-bold text-[11px] sm:text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">{event.name}</h3>
                  <div className="flex flex-col gap-1 text-[9px] text-muted-foreground">
                    <div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-primary" /> {event.city}</div>
                    <div className="flex items-center gap-1 font-semibold text-foreground"><IndianRupee className="h-3 w-3 text-primary" /> ₹{event.budget_required.toLocaleString()}</div>
                  </div>
                  <Button asChild variant="default" className="w-full h-7 text-[10px] mt-1 bg-primary/90">
                    <Link to="/browse-events">Details</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Top Creators Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Top Creators</h2>
            <Link to="/browse-creators" className="text-xs text-primary hover:underline">View All</Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {topCreators.map((creator) => (
              <Card key={creator.id} className="glass-card border-border/30 hover:border-primary/20 transition-all group overflow-hidden">
                <CardContent className="p-3 space-y-2 text-center">
                  <div className="flex justify-center mb-1">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center relative">
                      <Users className="h-5 w-5 text-primary" />
                      {creator.verification_status === 'verified' && (
                        <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-green-500 fill-background" />
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-[11px] sm:text-sm leading-tight line-clamp-1">{creator.full_name}</h3>
                    <p className="text-[9px] text-muted-foreground">{creator.platform || 'Creator'}</p>
                  </div>
                  <Button asChild variant="outline" className="w-full h-7 text-[10px] mt-1">
                    <Link to="/browse-creators">View Profile</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card border-border/30">
          <CardHeader><CardTitle className="text-base">Event Categories</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name }) => name}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/30">
          <CardHeader><CardTitle className="text-base">Budget by Event</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={budgetData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                <Bar dataKey="budget" fill="hsl(240,67%,75%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SponsorDashboard;

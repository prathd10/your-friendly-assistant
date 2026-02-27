import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MessageSquare, Sparkles, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(349,70%,65%)', 'hsl(240,67%,75%)', 'hsl(170,50%,60%)', 'hsl(40,80%,65%)', 'hsl(280,50%,65%)'];

const SponsorDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ matched: 0, conversations: 0, messages: 0 });
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([]);
  const [budgetData, setBudgetData] = useState<{ name: string; budget: number }[]>([]);

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
      <h1 className="text-2xl font-bold">Sponsor Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="glass-card border-border/30">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <s.icon className="h-5 w-5 text-primary" />
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

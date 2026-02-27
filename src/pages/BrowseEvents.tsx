import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Event, EVENT_CATEGORIES } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Calendar, MapPin, Users, IndianRupee, Search } from 'lucide-react';

const BrowseEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filtered, setFiltered] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [maxBudget, setMaxBudget] = useState([1000000]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase
      .from('events')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setEvents(data || []);
        setFiltered(data || []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let result = events;
    if (category !== 'all') result = result.filter((e) => e.category === category);
    if (maxBudget[0] < 1000000) result = result.filter((e) => e.budget_required <= maxBudget[0]);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) =>
        e.name.toLowerCase().includes(q) || e.city.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [events, category, maxBudget, search]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Browse Events</h1>

      <Card className="glass-card border-border/30">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="w-[180px]">
            <label className="text-xs text-muted-foreground mb-1 block">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {EVENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">Max Budget: ₹{maxBudget[0].toLocaleString()}</label>
            <Slider value={maxBudget} onValueChange={setMaxBudget} min={50000} max={1000000} step={50000} />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-10">No events found matching your criteria.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((event) => (
            <Card key={event.id} className="glass-card border-border/30 hover:shadow-lg transition-all hover:-translate-y-0.5">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold text-lg">{event.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.city}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(event.event_date).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{event.audience_size}</span>
                  <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />₹{event.budget_required.toLocaleString()}</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="secondary">{event.category}</Badge>
                  {event.tags?.slice(0, 3).map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrowseEvents;

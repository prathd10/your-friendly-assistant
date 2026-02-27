import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EVENT_CATEGORIES, EventStatus } from '@/types/database';
import { toast } from 'sonner';
import { CalendarPlus } from 'lucide-react';

const CreateEvent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', category: '', description: '', city: '',
    latitude: '', longitude: '', budget_required: '',
    audience_size: '', target_demographics: '', tags: '', event_date: '',
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (form.name.length > 200 || form.description.length > 2000) {
      toast.error('Name must be under 200 chars, description under 2000');
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.from('events').insert({
      organizer_id: user.id,
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
      city: form.city.trim(),
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      budget_required: parseInt(form.budget_required) || 0,
      audience_size: parseInt(form.audience_size) || 0,
      target_demographics: form.target_demographics.trim(),
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      event_date: form.event_date,
      status: 'active' as EventStatus,
    }).select('id').single();

    if (error) {
      toast.error(error.message);
    } else {
      // Trigger matching
      await supabase.rpc('calculate_matches', { p_event_id: data.id });
      toast.success('Event created & matches calculated!');
      navigate('/my-events');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="glass-card border-border/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" /> Create New Event
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="Event Name" value={form.name} onChange={set('name')} required maxLength={200} />
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {EVENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea placeholder="Description" value={form.description} onChange={set('description')} maxLength={2000} rows={3} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="City" value={form.city} onChange={set('city')} required maxLength={100} />
              <Input type="date" value={form.event_date} onChange={set('event_date')} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Latitude" value={form.latitude} onChange={set('latitude')} step="any" />
              <Input type="number" placeholder="Longitude" value={form.longitude} onChange={set('longitude')} step="any" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Budget Required (₹)" value={form.budget_required} onChange={set('budget_required')} required />
              <Input type="number" placeholder="Audience Size" value={form.audience_size} onChange={set('audience_size')} required />
            </div>
            <Input placeholder="Target Demographics" value={form.target_demographics} onChange={set('target_demographics')} maxLength={200} />
            <Input placeholder="Tags (comma separated)" value={form.tags} onChange={set('tags')} maxLength={500} />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateEvent;

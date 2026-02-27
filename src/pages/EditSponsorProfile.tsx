import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { EVENT_CATEGORIES, SponsorPreferences } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, Building, User } from 'lucide-react';

const EditSponsorProfile = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    organization_name: '',
    city: '',
    business_description: '',
    categories: [] as string[],
    max_budget: '',
    cities: '',
    min_audience: '',
  });

  useEffect(() => {
    if (!profile) return;
    const prefs = profile.preferences as SponsorPreferences | null;
    setForm({
      full_name: profile.full_name || '',
      organization_name: profile.organization_name || '',
      city: profile.city || '',
      business_description: profile.business_description || '',
      categories: prefs?.categories || [],
      max_budget: prefs?.max_budget?.toString() || '',
      cities: prefs?.cities?.join(', ') || '',
      min_audience: prefs?.min_audience?.toString() || '',
    });
  }, [profile]);

  const toggleCategory = (cat: string) => {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    const preferences: SponsorPreferences = {
      categories: form.categories,
      max_budget: parseInt(form.max_budget) || 0,
      cities: form.cities.split(',').map((c) => c.trim()).filter(Boolean),
      min_audience: parseInt(form.min_audience) || 0,
    };

    const { error } = await supabase
      .from('users')
      .update({
        full_name: form.full_name.trim(),
        organization_name: form.organization_name.trim(),
        city: form.city.trim(),
        business_description: form.business_description.trim(),
        preferences,
      })
      .eq('id', user.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Profile updated!');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Edit Profile</h1>

      <Card className="glass-card border-border/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Personal Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Organization Name</Label>
            <Input value={form.organization_name} onChange={(e) => setForm((f) => ({ ...f, organization_name: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5 text-primary" /> Business Details</CardTitle>
          <CardDescription>Tell organizers about your brand and what you're looking for</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Business Description</Label>
            <Textarea
              placeholder="Describe your business, products, and what kind of events you like to sponsor..."
              value={form.business_description}
              onChange={(e) => setForm((f) => ({ ...f, business_description: e.target.value }))}
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">{form.business_description.length}/1000</p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/30">
        <CardHeader>
          <CardTitle>Sponsorship Preferences</CardTitle>
          <CardDescription>Help us match you with the right events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Interested Categories</Label>
            <div className="flex flex-wrap gap-2">
              {EVENT_CATEGORIES.map((cat) => (
                <Badge
                  key={cat}
                  variant={form.categories.includes(cat) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleCategory(cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Budget (₹)</Label>
              <Input type="number" placeholder="e.g. 500000" value={form.max_budget} onChange={(e) => setForm((f) => ({ ...f, max_budget: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Min Audience Size</Label>
              <Input type="number" placeholder="e.g. 1000" value={form.min_audience} onChange={(e) => setForm((f) => ({ ...f, min_audience: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Preferred Cities</Label>
            <Input placeholder="e.g. Mumbai, Delhi, Bangalore (comma separated)" value={form.cities} onChange={(e) => setForm((f) => ({ ...f, cities: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={loading} className="w-full" size="lg">
        <Save className="h-4 w-4 mr-2" />
        {loading ? 'Saving...' : 'Save Profile'}
      </Button>
    </div>
  );
};

export default EditSponsorProfile;

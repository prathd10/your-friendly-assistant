import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { UserRole } from '@/types/database';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('organizer');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.length > 100 || orgName.length > 100 || city.length > 100) {
      toast.error('Fields must be under 100 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUp(email, password, {
        role,
        full_name: fullName.trim(),
        organization_name: orgName.trim(),
        city: city.trim(),
      });

      if (error) {
        toast.error(error.message || 'Unable to create account right now. Please try again.');
        return;
      }

      toast.success('Account created! Check your email to confirm.');
      navigate('/login');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create account right now. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-accent/20 p-4">
      <Card className="w-full max-w-md glass-card border-border/30">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>Join EventSphere as an organizer or sponsor</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(['organizer', 'sponsor'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium capitalize transition-all ${
                    role === r
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/40 text-muted-foreground'
                  }`}
                >
                  {r === 'organizer' ? '🎯 Organizer' : '🏢 Sponsor'}
                </button>
              ))}
            </div>
            <Input placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} className="h-11" />
            <Input placeholder="Organization Name" value={orgName} onChange={(e) => setOrgName(e.target.value)} required maxLength={100} className="h-11" />
            <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} required maxLength={100} className="h-11" />
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
            <Input type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-11" />
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;

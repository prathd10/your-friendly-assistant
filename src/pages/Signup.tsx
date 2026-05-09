import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sparkles, Calendar, Users, Music, Briefcase, Shield, ArrowLeft } from 'lucide-react';
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-accent/20 p-6">
      <div className="mb-6">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
      </div>
      <Card className="w-full max-w-xl glass-card border-border/30">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex items-center justify-center">
            <img src="/logo%20without%20bg.png" alt="EventSphere Logo" className="h-16 w-auto object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>Join EventSphere as an organizer, sponsor, creator, or service provider</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-semibold opacity-80">I want to join as an:</Label>
              <RadioGroup value={role} onValueChange={(val: UserRole) => setRole(val)} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div 
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${role === 'organizer' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/50 hover:border-border hover:bg-muted/30'}`}
                  onClick={() => setRole('organizer')}
                >
                  <Calendar className={`h-5 w-5 mb-2 ${role === 'organizer' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-semibold ${role === 'organizer' ? 'text-primary' : 'text-muted-foreground'}`}>Organizer</span>
                  <RadioGroupItem value="organizer" id="organizer" className="sr-only" />
                </div>

                <div 
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${role === 'sponsor' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/50 hover:border-border hover:bg-muted/30'}`}
                  onClick={() => setRole('sponsor')}
                >
                  <Users className={`h-5 w-5 mb-2 ${role === 'sponsor' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-semibold ${role === 'sponsor' ? 'text-primary' : 'text-muted-foreground'}`}>Sponsor</span>
                  <RadioGroupItem value="sponsor" id="sponsor" className="sr-only" />
                </div>

                <div 
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${role === 'creator' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/50 hover:border-border hover:bg-muted/30'}`}
                  onClick={() => setRole('creator')}
                >
                  <Sparkles className={`h-5 w-5 mb-2 ${role === 'creator' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-semibold ${role === 'creator' ? 'text-primary' : 'text-muted-foreground'}`}>Creator</span>
                  <RadioGroupItem value="creator" id="creator" className="sr-only" />
                </div>

                <div 
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${role === 'performer' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/50 hover:border-border hover:bg-muted/30'}`}
                  onClick={() => setRole('performer')}
                >
                  <Music className={`h-5 w-5 mb-2 ${role === 'performer' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-semibold ${role === 'performer' ? 'text-primary' : 'text-muted-foreground'}`}>Performer</span>
                  <RadioGroupItem value="performer" id="performer" className="sr-only" />
                </div>

                <div 
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${role === 'vendor' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/50 hover:border-border hover:bg-muted/30'}`}
                  onClick={() => setRole('vendor')}
                >
                  <Briefcase className={`h-5 w-5 mb-2 ${role === 'vendor' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-semibold ${role === 'vendor' ? 'text-primary' : 'text-muted-foreground'}`}>Provider</span>
                  <RadioGroupItem value="vendor" id="vendor" className="sr-only" />
                </div>
              </RadioGroup>
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

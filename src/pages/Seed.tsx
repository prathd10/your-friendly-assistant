import { useState } from 'react';
import { seedDemoData } from '@/lib/seed';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles, Loader2 } from 'lucide-react';

const Seed = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const run = async () => {
    setRunning(true);
    setLogs([]);
    await seedDemoData((msg) => setLogs((prev) => [...prev, msg]));
    setRunning(false);
    setDone(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg glass-card border-border/30">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Seed Demo Data</CardTitle>
          <CardDescription>
            This will create 5 college organizers, 5 sponsor companies, 5 events, auto-matches, and sample conversations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!done && (
            <Button onClick={run} disabled={running} className="w-full">
              {running ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Seeding...</> : '🚀 Seed Demo Data'}
            </Button>
          )}

          {logs.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 max-h-60 overflow-auto space-y-1">
              {logs.map((log, i) => (
                <p key={i} className="text-xs font-mono text-muted-foreground">{log}</p>
              ))}
            </div>
          )}

          {done && (
            <div className="space-y-3">
              <div className="bg-primary/10 rounded-lg p-3">
                <p className="text-sm font-medium text-primary mb-2">Demo Accounts</p>
                <p className="text-xs text-muted-foreground mb-1">Password for all: <code className="bg-muted px-1 rounded">Demo@12345</code></p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <p className="text-xs font-medium">Organizers:</p>
                    <p className="text-xs text-muted-foreground">techfest@kjsce.demo</p>
                    <p className="text-xs text-muted-foreground">moksha@nmims.demo</p>
                    <p className="text-xs text-muted-foreground">umang@nmu.demo</p>
                    <p className="text-xs text-muted-foreground">technovanza@vjti.demo</p>
                    <p className="text-xs text-muted-foreground">malhar@xaviers.demo</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium">Sponsors:</p>
                    <p className="text-xs text-muted-foreground">sponsor@redbull.demo</p>
                    <p className="text-xs text-muted-foreground">sponsor@boatlifestyle.demo</p>
                    <p className="text-xs text-muted-foreground">sponsor@zomato.demo</p>
                    <p className="text-xs text-muted-foreground">sponsor@tcs.demo</p>
                    <p className="text-xs text-muted-foreground">sponsor@slicepay.demo</p>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => window.location.href = '/login'}>
                Go to Login →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Seed;

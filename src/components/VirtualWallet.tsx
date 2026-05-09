import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, IndianRupee, ArrowUpCircle, History, 
  Lock, Loader2, Plus, ArrowRight, RefreshCw 
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';

interface WalletData {
  balance: number;
  escrow_balance: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

const VirtualWallet = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingCredits, setAddingCredits] = useState(false);
  const [amount, setAmount] = useState('10000');
  const [showHistory, setShowHistory] = useState(false);

  const fetchWalletData = async () => {
    if (!user) return;
    try {
      // Fetch wallet balance
      const { data: walletData, error: walletErr } = await supabase
        .from('wallets')
        .select('balance, escrow_balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletErr) throw walletErr;
      setWallet(walletData || { balance: 0, escrow_balance: 0 });

      // Fetch recent transactions
      const { data: txData, error: txErr } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', (walletData as any)?.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      // If we don't have the wallet ID yet from previous query, we might need a separate query
      // but let's see if we can get it in one go
      if (!walletData) {
         // It will be created by trigger or manual insert if missing
      } else {
         setTransactions(txData || []);
      }

    } catch (err: any) {
      console.error('Wallet error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();

    // Subscribe to changes
    const walletSub = supabase
      .channel('wallet_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${user?.id}` }, () => {
        fetchWalletData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(walletSub);
    };
  }, [user]);

  const handleAddCredits = async () => {
    const val = parseInt(amount);
    if (isNaN(val) || val <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setAddingCredits(true);
    try {
      const { error } = await supabase.rpc('add_demo_credits', { p_amount: val });
      if (error) throw error;
      
      toast.success(`Successfully added ₹${val.toLocaleString()} demo credits!`);
      fetchWalletData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add credits');
    } finally {
      setAddingCredits(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  if (loading && !wallet) {
    return (
      <Card className="glass-card border-primary/20">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="glass-card border-primary/20 bg-primary/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Wallet className="h-24 w-24 text-primary" />
        </div>
        
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" /> Virtual Wallet
            </CardTitle>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 uppercase text-[10px] tracking-widest font-black">
              Demo Mode
            </Badge>
          </div>
          <div className="mt-2">
            <h2 className="text-3xl font-black tracking-tight flex items-center">
              <IndianRupee className="h-6 w-6 mr-1 text-primary" />
              {formatCurrency(wallet?.balance || 0).replace('₹', '')}
            </h2>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Lock className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Escrow Locked</p>
                <p className="text-sm font-bold">{formatCurrency(wallet?.escrow_balance || 0)}</p>
              </div>
            </div>
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full hover:bg-white/10"
                onClick={fetchWalletData}
            >
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="flex-1 bg-primary hover:bg-primary/90 gap-2 h-10 shadow-lg shadow-primary/20">
                  <Plus className="h-4 w-4" /> Add Credits
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Demo Credits</DialogTitle>
                  <DialogDescription>
                    Boost your virtual balance for testing purposes. No real payment required.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Enter Amount (₹)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        className="pl-9"
                        placeholder="10000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[5000, 10000, 50000].map(val => (
                      <Button 
                        key={val} 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setAmount(val.toString())}
                        className={amount === val.toString() ? "border-primary bg-primary/5" : ""}
                      >
                        ₹{val.toLocaleString()}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button 
                  onClick={handleAddCredits} 
                  disabled={addingCredits}
                  className="w-full gap-2"
                >
                  {addingCredits ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpCircle className="h-4 w-4" />}
                  Confirm Deposit
                </Button>
              </DialogContent>
            </Dialog>

            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1 gap-2 h-10 border-white/10 bg-white/5 hover:bg-white/10">
                        <History className="h-4 w-4" /> History
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[70vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Transaction History</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto mt-4 space-y-3">
                        {transactions.length === 0 ? (
                            <p className="text-center py-10 text-muted-foreground italic">No transactions found</p>
                        ) : (
                            transactions.map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                                            tx.type === 'deposit' || tx.type === 'receive' ? 'bg-green-500/10' : 'bg-red-500/10'
                                        }`}>
                                            {tx.type === 'deposit' || tx.type === 'receive' ? 
                                                <ArrowUpCircle className={`h-4 w-4 ${tx.type === 'deposit' || tx.type === 'receive' ? 'text-green-500' : 'text-red-500'}`} /> :
                                                <History className="h-4 w-4 text-red-500" />
                                            }
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold capitalize">{tx.type.replace('_', ' ')}</p>
                                            <p className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(tx.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <p className={`font-mono text-sm font-bold ${
                                         tx.amount > 0 ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VirtualWallet;

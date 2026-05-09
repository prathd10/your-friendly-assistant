-- ============================================
-- Virtual Wallet & Escrow System
-- ============================================

-- 1. Wallets Table
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance BIGINT DEFAULT 0 CHECK (balance >= 0),
  escrow_balance BIGINT DEFAULT 0 CHECK (escrow_balance >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Wallet Transactions Table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
  amount BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'escrow_lock', 'escrow_release', 'receive')),
  description TEXT,
  reference_id UUID, -- Can be connection_request_id or event_id
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own wallet" ON public.wallets
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can view own transactions" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()));

-- 3. Trigger to Create Wallet on User Creation
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger already exists (not easy in SQL script, but we'll try)
DROP TRIGGER IF EXISTS on_user_created_wallet ON public.users;
CREATE TRIGGER on_user_created_wallet
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();

-- Backfill existing users
INSERT INTO public.wallets (user_id, balance)
SELECT id, 0 FROM public.users
ON CONFLICT (user_id) DO NOTHING;

-- 4. RPC: Add Demo Credits (Simulation)
CREATE OR REPLACE FUNCTION public.add_demo_credits(p_amount BIGINT)
RETURNS VOID AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  -- Get or create wallet
  INSERT INTO public.wallets (user_id, balance)
  VALUES (auth.uid(), 0)
  ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_wallet_id;

  -- Update balance
  UPDATE public.wallets
  SET balance = balance + p_amount
  WHERE id = v_wallet_id;

  -- Log transaction
  INSERT INTO public.wallet_transactions (wallet_id, amount, type, description)
  VALUES (v_wallet_id, p_amount, 'deposit', 'Demo credits added');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: Fund Event (Escrow Lock)
CREATE OR REPLACE FUNCTION public.fund_event_escrow(p_event_id UUID, p_amount BIGINT, p_request_id UUID)
RETURNS VOID AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance BIGINT;
BEGIN
  -- Get wallet
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM public.wallets
  WHERE user_id = auth.uid();

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Update balances
  UPDATE public.wallets
  SET balance = balance - p_amount,
      escrow_balance = escrow_balance + p_amount
  WHERE id = v_wallet_id;

  -- Log transaction
  INSERT INTO public.wallet_transactions (wallet_id, amount, type, description, reference_id)
  VALUES (v_wallet_id, -p_amount, 'escrow_lock', 'Funds locked for event sponsorship', p_event_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

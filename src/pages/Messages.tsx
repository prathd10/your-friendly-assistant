import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Message } from '@/types/database';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, MessageSquare, Lock } from 'lucide-react';

interface ConvItem {
  id: string;
  event_name: string;
  other_name: string;
  other_org: string;
  last_message?: string;
}

const Messages = () => {
  const { user, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<ConvItem[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(searchParams.get('conv'));
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isSponsor = profile?.role === 'sponsor';

  // Load conversations
  useEffect(() => {
    if (!user || !profile) return;
    const load = async () => {
      const col = profile.role === 'organizer' ? 'organizer_id' : 'sponsor_id';
      const { data, error } = await supabase
        .from('conversations')
        .select('id, events(name), organizer:users!conversations_organizer_id_fkey(full_name, organization_name), sponsor:users!conversations_sponsor_id_fkey(full_name, organization_name)')
        .eq(col, user.id)
        .order('created_at', { ascending: false });

      if (error) console.error('[Messages] conversations error:', error);

      setConversations(data?.map((c: any) => {
        const other = profile.role === 'organizer' ? c.sponsor : c.organizer;
        return {
          id: c.id,
          event_name: c.events?.name || 'Event',
          other_name: other?.full_name || '',
          other_org: other?.organization_name || '',
        };
      }) || []);
      setLoading(false);
    };
    load();
  }, [user, profile]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConv) { setMessages([]); return; }
    const load = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConv)
        .order('created_at', { ascending: true });
      setMessages(data || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };
    load();

    const channel = supabase
      .channel(`messages:${activeConv}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConv}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConv]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeConv || !user) return;
    if (!isSponsor && messages.length === 0) return; // Organizers cannot send the first message
    if (newMsg.length > 2000) return;

    const { data: convData } = await supabase
      .from('conversations')
      .select('organizer_id, sponsor_id')
      .eq('id', activeConv)
      .single();

    const receiverId = convData?.organizer_id === user.id ? convData?.sponsor_id : convData?.organizer_id;

    await supabase.from('messages').insert({
      conversation_id: activeConv,
      sender_id: user.id,
      receiver_id: receiverId!,
      content: newMsg.trim(),
    });
    setNewMsg('');
  };

  const selectConv = (id: string) => {
    setActiveConv(id);
    setSearchParams({ conv: id });
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="h-[calc(100vh-8rem)]">
      <h1 className="text-2xl font-bold mb-4">Messages</h1>
      <div className="flex gap-4 h-[calc(100%-3rem)]">
        {/* Conversation list */}
        <Card className="w-72 shrink-0 glass-card border-border/30 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border/30 font-medium text-sm">Conversations</div>
          <div className="flex-1 overflow-auto">
            {conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground p-4 text-center">No conversations yet</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectConv(c.id)}
                  className={`w-full text-left p-3 border-b border-border/20 hover:bg-accent/30 transition-colors ${activeConv === c.id ? 'bg-accent/40' : ''}`}
                >
                  <p className="font-medium text-sm truncate">{c.other_org || c.other_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.event_name}</p>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Chat area */}
        <Card className="flex-1 glass-card border-border/30 flex flex-col overflow-hidden">
          {!activeConv ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>Select a conversation</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto p-4 space-y-3">
                {messages.map((msg) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                        isMine ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted rounded-bl-md'
                      }`}>
                        <p>{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Message input - sponsors can always send, organizers only if messages exist */}
              {isSponsor || messages.length > 0 ? (
                <div className="p-3 border-t border-border/30 flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    maxLength={2000}
                    className="flex-1"
                  />
                  <Button size="icon" onClick={sendMessage} disabled={!newMsg.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="p-3 border-t border-border/30 flex items-center gap-2 text-muted-foreground text-sm">
                  <Lock className="h-4 w-4" />
                  <span>Waiting for the sponsor to send the first message.</span>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Messages;

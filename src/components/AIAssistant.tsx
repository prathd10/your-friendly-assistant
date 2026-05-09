import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Mic, 
  MicOff, 
  X, 
  Send, 
  Loader2, 
  Building, 
  User, 
  Music, 
  ShoppingBag,
  ArrowRight,
  MessageSquare,
  MapPin,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { analyzeDiscoveryIntentNew } from '@/lib/ai-service';
import { findSuggestedPartners, DiscoveryCriteria } from '@/lib/ai-discovery';
import { UserProfile } from '@/types/database';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import QuickRequestDialog from './QuickRequestDialog';
import { Calendar as CalendarIcon, Briefcase, IndianRupee, MapPin as MapPinIcon, LayoutGrid } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Type definition for Speech Recognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: any) => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const AIAssistant = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [input, setInput] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [criteria, setCriteria] = useState<DiscoveryCriteria | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Quick Request State
  const [selectedPartner, setSelectedPartner] = useState<UserProfile | null>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);

  const appendToInput = (text: string) => {
    const newInput = input ? `${input} ${text}` : text;
    setInput(newInput);
    handleAnalyze(newInput);
  };

  const quickFilters = [
    { 
      label: 'Role', 
      icon: Briefcase, 
      options: ['Sponsor', 'Creator', 'Performer', 'Vendor'],
      prefix: 'looking for'
    },
    { 
      label: 'Niche', 
      icon: LayoutGrid, 
      options: ['Tech', 'Music', 'Sports', 'Startup', 'Wedding', 'Gaming', 'Food'],
      prefix: ''
    },
    { 
      label: 'Budget', 
      icon: IndianRupee, 
      options: ['10k', '50k', '1 Lakh', '5 Lakhs', '10 Lakhs'],
      prefix: 'budget'
    },
    { 
      label: 'Venue', 
      icon: MapPinIcon, 
      options: ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata', 'Indoor', 'Outdoor', 'College', 'Hotel', 'Resort', 'Stadium'],
      prefix: 'in'
    },
  ];

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        
        if (currentTranscript) {
          setInput(prev => {
            const trimmedPrev = prev.trim();
            return trimmedPrev ? trimmedPrev + ' ' + currentTranscript : currentTranscript;
          });
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
        // Specifically ignore 'no-speech' error if continuous is true, 
        // as it might trigger even if we want to keep listening.
        if (event.error !== 'no-speech') {
          toast.error('Speech recognition encountered an error.');
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setIsRecording(true);
      recognitionRef.current?.start();
    }
  };

  const handleAnalyze = async (text: string) => {
    if (!text.trim()) return;
    setIsThinking(true);
    setResults([]);
    setCriteria(null);

    try {
      console.log('--- AI Helper: Starting Analysis ---');
      const extractedCriteria = await analyzeDiscoveryIntentNew(text);
      console.log('AI Extraction:', extractedCriteria);
      setCriteria(extractedCriteria);
      
      const suggestedPartners = await findSuggestedPartners(extractedCriteria);
      setResults(suggestedPartners);
      
      if (suggestedPartners.length === 0) {
        toast.info("AI analyzed your request, but no exact matches were found in the database yet.");
      }
    } catch (error) {
      console.error('Analyzer error:', error);
      toast.error('AI Assistant is having trouble thinking. Please try again.');
    } finally {
      setIsThinking(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'sponsor': return <Building className="h-4 w-4" />;
      case 'performer': return <Music className="h-4 w-4" />;
      case 'vendor': return <ShoppingBag className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'sponsor': return 'Sponsor';
      case 'performer': return 'Performer';
      case 'creator': return 'Creator';
      case 'vendor': return 'Provider';
      default: return role;
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90 flex items-center justify-center p-0 overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent animate-pulse" />
          <Sparkles className="h-6 w-6 text-white" />
        </Button>
      </motion.div>

      {/* AI Assistant Sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-full sm:w-1/2 sm:max-w-none bg-background/95 backdrop-blur-xl border-l border-white/10 p-0 flex flex-col">
          <SheetHeader className="p-6 border-b border-white/5 bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center overflow-hidden">
                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <div className="flex-1">
                <SheetTitle className="text-xl font-bold">EventSphere AI Helper</SheetTitle>
                <p className="text-xs text-muted-foreground">Expert consultant at your service</p>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {/* Introduction */}
              {!criteria && !isThinking && (
                <div className="space-y-4 py-10 text-center">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="h-10 w-10 text-primary opacity-50" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">Your Event, AI-Powered.</h3>
                  <p className="text-sm text-muted-foreground max-w-[320px] mx-auto">
                    Describe your vision—<strong>budget, dates, and venue</strong>—and I'll scout the perfect partners across the sphere for you.
                  </p>
                </div>
              )}

              {/* Analysis Context */}
              {criteria && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">AI UNDERSTANDING</Badge>
                  </div>
                  <p className="text-sm italic text-muted-foreground font-medium">"{criteria.eventSummary}"</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {criteria.rolesNeeded && criteria.rolesNeeded.map(role => (
                      <Badge key={role} variant="default" className="bg-primary/20 text-primary border-primary/20 capitalize">
                        {role}s
                      </Badge>
                    ))}
                    {criteria.city && <Badge variant="secondary" className="gap-1 font-normal"><MapPin className="h-3 w-3" /> {criteria.city}</Badge>}
                    {criteria.category && <Badge variant="secondary" className="gap-1 font-normal"><Tag className="h-3 w-3" /> {criteria.category}</Badge>}
                    {criteria.date && <Badge variant="secondary" className="gap-1 font-normal"><CalendarIcon className="h-3 w-3" /> {criteria.date}</Badge>}
                    {criteria.approximateBudget && <Badge variant="secondary" className="gap-1 font-normal">₹ {criteria.approximateBudget.toLocaleString()}</Badge>}
                  </div>
                </motion.div>
              )}

              {/* Results */}
              <div className="space-y-4">
                {isThinking ? (
                  <div className="space-y-3 py-10 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground animate-pulse">Scouting the best talent for you...</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {results.map((partner, idx) => (
                      <motion.div
                        key={partner.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <Card 
                          className="glass-card border-white/10 hover:border-primary/30 transition-all cursor-pointer group relative overflow-hidden"
                          onClick={() => navigate(`/profile/${partner.id}`)}
                        >
                          <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Button
                               size="sm"
                               variant="secondary"
                               className="h-7 px-2 text-[10px] bg-primary/20 hover:bg-primary/40 border border-primary/20 backdrop-blur-md"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setSelectedPartner(partner);
                                 setIsRequestDialogOpen(true);
                               }}
                             >
                               <Send className="h-3 w-3 mr-1" /> Request
                             </Button>
                          </div>
                          <CardContent className="p-4 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                              {getRoleIcon(partner.role)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-sm truncate">{partner.organization_name || partner.full_name}</h4>
                                {partner.verification_status === 'verified' && (
                                  <div className="h-3 w-3 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                    <Sparkles className="h-2 w-2 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-[10px] h-4 py-0 px-1.5 uppercase font-bold tracking-wider">{getRoleLabel(partner.role)}</Badge>
                                <span className="text-[10px] text-muted-foreground truncate">{partner.city}</span>
                              </div>
                              {partner.match_reasons && partner.match_reasons.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {partner.match_reasons.slice(0, 2).map((reason, i) => (
                                    <span key={i} className="text-[9px] text-primary/70 bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
                                      {reason}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all shrink-0" />
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-6 bg-muted/30 border-t border-white/5 space-y-4">
            {/* Quick Filters */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {quickFilters.map((filter) => (
                <DropdownMenu key={filter.label}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 rounded-full border-white/10 bg-background/50 backdrop-blur-sm text-[11px] gap-1.5 hover:bg-primary/10 hover:border-primary/30 transition-all whitespace-nowrap"
                    >
                      <filter.icon className="h-3 w-3 text-primary" />
                      {filter.label}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-background/95 backdrop-blur-xl border-white/10">
                    {filter.options.map((opt) => (
                      <DropdownMenuItem 
                        key={opt}
                        onClick={() => appendToInput(`${filter.prefix} ${opt}`.trim())}
                        className="text-xs cursor-pointer hover:bg-primary/20"
                      >
                        {opt}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ))}
            </div>

            <div className="relative group">
              <Input
                placeholder={isRecording ? "Listening..." : "Try: 'Singer for college fest in Mumbai budget 50k'"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze(input)}
                className={`pr-24 h-12 rounded-xl bg-background/50 border-white/10 ${isRecording ? 'border-primary shadow-lg shadow-primary/20' : ''}`}
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleRecording}
                  className={`h-9 w-9 rounded-lg transition-all ${isRecording ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 shadow-lg' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'}`}
                >
                  <AnimatePresence mode="wait">
                    {isRecording ? (
                      <motion.div
                        key="mic-off"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <MicOff className="h-5 w-5" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="mic"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        <Mic className="h-5 w-5" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleAnalyze(input)}
                  disabled={!input.trim() || isThinking}
                  className="h-9 w-9 rounded-lg text-primary hover:bg-primary/10"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-medium opacity-50">
              AI Consultations are powered by OpenAI GPT-4o
            </p>
          </div>
        </SheetContent>
      </Sheet>
      <QuickRequestDialog 
        isOpen={isRequestDialogOpen}
        onOpenChange={setIsRequestDialogOpen}
        targetUser={selectedPartner}
      />
    </>
  );
};

export default AIAssistant;

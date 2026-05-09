import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, Users, Calendar, MessageSquare, ShieldCheck, Zap, Building, Briefcase, Sparkles, Film, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EcosystemChart } from "@/components/EcosystemChart";
import EventsNearMe from "@/components/EventsNearMe";

const Index = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              YF
            </div>
            <span className="text-xl font-bold tracking-tight">Your Friendly Assistant</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link to="/browse-sponsors" className="text-sm font-medium hover:text-primary transition-colors">Browse Sponsors</Link>
            <Link to="/browse-events" className="text-sm font-medium hover:text-primary transition-colors">Browse Events</Link>
            <Link to="/login">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] border-l-border/30 bg-background/95 backdrop-blur-xl">
                <SheetHeader className="text-left mb-8">
                  <SheetTitle className="text-xl font-bold flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
                      YF
                    </div>
                    <span>Navigation</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-6">
                  <Link to="/browse-sponsors" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold hover:text-primary transition-colors flex items-center gap-3">
                    <Building className="h-5 w-5 text-primary" /> Browse Sponsors
                  </Link>
                  <Link to="/browse-events" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold hover:text-primary transition-colors flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" /> Browse Events
                  </Link>
                  <Link to="/browse-creators" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold hover:text-primary transition-colors flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" /> Browse Creators
                  </Link>
                  <hr className="border-border/30" />
                  <div className="flex flex-col gap-3">
                    <Link to="/login" onClick={() => setIsMenuOpen(false)} className="w-full">
                      <Button variant="outline" className="w-full h-12 text-lg font-bold">Login</Button>
                    </Link>
                    <Link to="/signup" onClick={() => setIsMenuOpen(false)} className="w-full">
                      <Button className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20">Get Started</Button>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="container relative z-10">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="flex flex-col items-start gap-6 animate-in fade-in slide-in-from-left-8 duration-700">
              <Badge variant="secondary" className="px-4 py-1.5 font-semibold bg-primary/10 text-primary border-primary/20">
                The Triple-Sector Marketplace
              </Badge>
              <h1 className="text-5xl font-extrabold tracking-tight md:text-7xl lg:leading-[1.1]">
                Where <span className="text-primary italic">Sponsors</span>, Organizers, & <span className="text-primary italic">Creators</span> Align
              </h1>
              <p className="max-w-[600px] text-lg text-muted-foreground md:text-xl">
                The ultimate ecosystem where brands find high-impact events, and creators land premium gigs. Unified matching, secure collaboration, and performance metrics.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Link to="/signup">
                  <Button size="lg" className="h-12 px-8 text-base gap-2">
                    Start Your Search <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/browse-creators">
                  <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                    Explore Creators
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-muted overflow-hidden">
                      <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" />
                    </div>
                  ))}
                </div>
                <p>Joined by <span className="font-semibold text-foreground">1,200+</span> creators this month</p>
              </div>
            </div>
            <div className="relative aspect-square lg:aspect-auto lg:h-[600px] animate-in fade-in zoom-in duration-1000">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-primary/20 to-lavender/40 blur-3xl opacity-50"></div>
              <div className="relative h-full w-full rounded-2xl border bg-card shadow-2xl overflow-hidden glass-card">
                <img 
                  src="/hero_image.png" 
                  alt="A creator at an event" 
                  className="h-full w-full object-cover opacity-90"
                />
                <div className="absolute bottom-6 left-6 right-6 p-6 rounded-xl bg-background/90 backdrop-blur shadow-lg border animate-in slide-in-from-bottom-8 duration-1000 delay-300">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <ShieldCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold italic text-sm">"Matched with the perfect lifestyle influencer in under 24 hours!"</p>
                      <p className="text-xs text-muted-foreground">— Sarah, Event Organizer</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Events Section */}
      <EventsNearMe />

      {/* Triple Value Proposition Section */}
      <section className="py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl font-bold md:text-5xl">The Power of Three</h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">A seamless collaboration engine built for the modern event landscape, ensuring every partner wins.</p>
          </div>
          <div className="grid gap-4 md:gap-8 grid-cols-2 lg:grid-cols-3">
            <Card className="glass-card transition-all duration-300 hover:translate-y-[-4px]">
              <CardHeader className="space-y-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg md:text-2xl">For Sponsors</CardTitle>
                <CardDescription className="text-xs md:text-base line-clamp-2">Maximize brand ROI with data-driven event sponsorships.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4 p-4 pt-0">
                <ul className="space-y-3">
                  {["Targeted audience matching", "Direct access to event organizers", "Verified creator engagement data", "End-to-end campaign tracking"].map((text) => (
                    <li key={text} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary" /> {text}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className="block pt-4">
                  <Button variant="outline" className="w-full font-semibold">Become a Sponsor</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="glass-card border-primary/20 bg-primary/5 transition-all duration-300 hover:translate-y-[-4px]">
              <CardHeader className="space-y-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg md:text-2xl">For Organizers</CardTitle>
                <CardDescription className="text-xs md:text-base line-clamp-2">Secure funding and find reliable creators for your vision.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4 p-4 pt-0">
                <ul className="space-y-3">
                  {["Automated sponsor pitch decks", "Direct connections to verified talent", "Unified event management hub", "Real-time collaboration tools"].map((text) => (
                    <li key={text} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary" /> {text}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className="block pt-4">
                  <Button className="w-full font-semibold">Host an Event</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="glass-card transition-all duration-300 hover:translate-y-[-4px]">
              <CardHeader className="space-y-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg md:text-2xl">For Creators</CardTitle>
                <CardDescription className="text-xs md:text-base line-clamp-2">Monetize your talent with high-profile collaborations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4 p-4 pt-0">
                <ul className="space-y-3">
                  {["Verified Trust Score for more gigs", "Direct links to brands & sponsors", "Premium event opportunities", "Automated portfolio updates"].map((text) => (
                    <li key={text} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary" /> {text}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className="block pt-4">
                  <Button variant="outline" className="w-full font-semibold">Join as Creator</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>


      <EcosystemChart />


      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="container">
          <div className="grid gap-8 md:gap-16 grid-cols-2 lg:grid-cols-3">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Smart Matching</h3>
              <p className="text-muted-foreground">Our intelligent algorithm connects you with partners based on niche, location, budget, and performance history.</p>
            </div>
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Trust Verification</h3>
              <p className="text-muted-foreground">Every creator profile features a dynamic Trust Score derived from real social metrics and past gig performance.</p>
            </div>
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Messaging Hub</h3>
              <p className="text-muted-foreground">Keep all event-related discussions in one place. Send briefs, negotiate terms, and finalize deals securely.</p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Creative Suite Section */}
      <section className="py-24 bg-charcoal text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="container relative z-10">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary-foreground font-black text-[10px] uppercase tracking-widest animate-pulse">
                <Sparkles className="h-3 w-3" /> Industry First AI Tools
              </div>
              <h2 className="text-4xl font-bold md:text-6xl tracking-tight">AI Tools built for <span className="text-primary italic">High-Stakes</span> Events</h2>
              <p className="text-white/60 text-lg md:text-xl">Automate your marketing and sponsorship efforts with our native creative suite. No third-party tools required.</p>
              
              <div className="grid gap-6 pt-4">
                <div className="flex items-start gap-4 p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xl">AI-Pitch Deck Generator</h4>
                    <p className="text-white/50 text-sm mt-1">Events generate professional, brand-aligned sponsorship proposals in seconds instead of hours.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <Film className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xl">AI Cinematic Video Engine</h4>
                    <p className="text-white/50 text-sm mt-1">Automatically transform event highlights into cinematic promotional videos with narration.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative group">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-primary to-lavender blur opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="relative rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 shadow-2xl overflow-hidden aspect-video flex items-center justify-center">
                 <div className="absolute inset-0 bg-grid-white/[0.02] opacity-50" />
                 <div className="text-center space-y-6">
                    <div className="h-20 w-20 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4 animate-bounce">
                      <Sparkles className="h-10 w-10 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-primary mb-2">Synergy Engine v4.0</p>
                      <h4 className="text-2xl font-black italic">Calculating ROI Match...</h4>
                    </div>
                    <div className="flex justify-center gap-4">
                      <div className="h-2 w-24 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-primary w-[85%] animate-pulse" />
                      </div>
                    </div>
                    <p className="text-xs text-white/40">98.4% Match found for [Global Tech Brand]</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="py-24 border-t bg-charcoal text-white">
        <div className="container text-center space-y-8">
          <h2 className="text-4xl font-bold tracking-tight">Ready to join the ecosystem?</h2>
          <p className="max-w-[700px] mx-auto text-white/70 text-lg">
            Join the fastest-growing community where sponsors, creators, and organizers thrive together. No upfront costs, just endless opportunities.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Link to="/signup">
              <Button size="lg" className="h-14 px-10 text-lg bg-white text-black hover:bg-white/90">
                Get Started for Free
              </Button>
            </Link>
          </div>
          <div className="pt-16 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-white/50">
            <p>© 2024 Your Friendly Assistant. All rights reserved.</p>
            <div className="flex gap-8">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;

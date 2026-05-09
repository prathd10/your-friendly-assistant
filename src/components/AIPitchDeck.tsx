import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, ChevronLeft, ChevronRight, Sparkles, Loader2, Paperclip, CheckCircle2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface Metric { label: string; value: string; }
interface Tier { name: string; price: string; perks: string[]; }

interface Slide {
  type: 'cover' | 'content' | 'metrics' | 'tiers' | 'cta';
  title: string;
  tagline?: string;
  subtitle?: string;
  content: string[];
  metrics?: Metric[];
  tiers?: Tier[];
  cta?: string;
}

interface AIPitchDeckProps {
  data: { slides: Slide[] };
  eventId?: string;
}

const ACCENT = '#7c3aed'; // primary purple
const DARK_BG = '#0a0a0f';

// ── Slide Layouts ──────────────────────────────────────────────

const CoverSlide = ({ slide }: { slide: Slide }) => (
  <div className="h-full w-full flex flex-col justify-between p-12 relative overflow-hidden bg-[#0a0a0f]">
    {/* background design using standard colors for html2canvas compatibility */}
    <div className="absolute top-0 right-0 w-full h-full opacity-20"
      style={{ background: 'radial-gradient(circle at top right, #7c3aed, transparent 60%)' }} />
    {/* background grid */}
    <div className="absolute inset-0 opacity-[0.03]"
      style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
    
    {/* Decorative element */}
    <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
    
    {/* top badge */}
    <div className="flex items-center gap-3 z-10">
      <div className="h-[2px] w-16 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
      <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-black">Official Partner Deck</span>
    </div>
    
    {/* main content */}
    <div className="z-10 space-y-6">
      <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white leading-[0.9] drop-shadow-2xl">
        {slide.title.split(' ').map((word, i) => (
          <span key={i} className={i % 2 === 1 ? 'text-primary' : ''}>{word} </span>
        ))}
      </h1>
      <div className="space-y-4">
        {slide.tagline && (
          <p className="text-2xl md:text-4xl font-bold text-white/90 tracking-tight max-w-2xl leading-tight">
            {slide.tagline}
          </p>
        )}
        {slide.subtitle && (
          <div className="flex items-center gap-3">
            <div className="h-4 w-[2px] bg-white/20" />
            <p className="text-sm text-white/40 font-semibold tracking-widest uppercase">{slide.subtitle}</p>
          </div>
        )}
      </div>
    </div>
    
    {/* bottom */}
    <div className="z-10 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1">
        <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
      </div>
      <span className="text-[9px] uppercase tracking-[0.4em] text-white/20 font-medium pl-6">Confidential • Powered by AI</span>
    </div>
  </div>
);

const ContentSlide = ({ slide }: { slide: Slide }) => (
  <div className="h-full w-full flex flex-col p-16 gap-12 relative overflow-hidden bg-[#0a0a0f]">
    <div className="absolute top-0 right-0 w-96 h-96 opacity-10 rounded-full blur-[100px] -mr-48 -mt-48" style={{ backgroundColor: ACCENT }} />
    <div className="space-y-3 z-10">
      <div className="h-1.5 w-12 rounded-full bg-primary" />
      <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase italic">{slide.title}</h2>
    </div>
    <ul className="space-y-6 flex-1 flex flex-col justify-center z-10">
      {slide.content.map((bullet, idx) => (
        <li key={idx} className="flex items-start gap-6 group">
          <div className="mt-2.5 h-3 w-3 rounded-full border-2 border-primary bg-transparent group-hover:bg-primary transition-colors shrink-0 shadow-[0_0_8px_rgba(var(--primary),0.3)]" />
          <p className="text-xl md:text-2xl font-medium text-white/80 leading-snug tracking-tight">
            {bullet}
          </p>
        </li>
      ))}
    </ul>
  </div>
);

const MetricsSlide = ({ slide }: { slide: Slide }) => (
  <div className="h-full w-full flex flex-col p-16 gap-10 relative overflow-hidden bg-[#0a0a0f]">
    <div className="absolute bottom-0 left-0 w-96 h-96 opacity-10 rounded-full blur-[100px] -ml-48 -mb-48" style={{ backgroundColor: ACCENT }} />
    <div className="space-y-3 z-10">
      <div className="h-1.5 w-12 rounded-full bg-primary" />
      <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase italic">{slide.title}</h2>
    </div>
    
    {/* Metrics grid */}
    {slide.metrics && slide.metrics.length > 0 && (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1 items-center z-10">
        {slide.metrics.map((m, idx) => (
          <div key={idx} className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-br from-primary/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col gap-2 backdrop-blur-md transition-transform group-hover:-translate-y-1">
              <span className="text-4xl md:text-5xl font-black text-primary tracking-tighter drop-shadow-sm">{m.value}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">{m.label}</span>
            </div>
          </div>
        ))}
      </div>
    )}
    
    {/* Supporting bullets */}
    {slide.content && slide.content.length > 0 && (
      <div className="grid grid-cols-2 gap-8 z-10">
        {slide.content.map((bullet, idx) => (
          <div key={idx} className="flex items-start gap-4 text-white/60 text-sm leading-relaxed border-l border-primary/20 pl-4">
            {bullet}
          </div>
        ))}
      </div>
    )}
  </div>
);

const TiersSlide = ({ slide }: { slide: Slide }) => (
  <div className="h-full w-full flex flex-col p-16 gap-10 relative overflow-hidden">
    <div className="space-y-3 z-10">
      <div className="h-1.5 w-12 rounded-full bg-primary" />
      <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase italic">{slide.title}</h2>
    </div>
    <div className="flex-1 grid grid-cols-3 gap-6 items-stretch z-10">
      {(slide.tiers || []).map((tier, idx) => (
        <div
          key={idx}
          className={`relative group flex flex-col gap-6 p-7 rounded-2xl border transition-all duration-500 ${
            idx === 0 
            ? 'border-primary bg-primary/10 shadow-[0_0_40px_rgba(var(--primary),0.1)] scale-105 z-20' 
            : 'border-white/10 bg-white/5 hover:border-white/20'
          }`}
        >
          {idx === 0 && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg">
              Most Exclusive
            </div>
          )}
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-white tracking-tight leading-none uppercase">{tier.name}</h3>
            <p className="text-lg font-bold text-primary">{tier.price}</p>
          </div>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <ul className="space-y-3 flex-1">
            {tier.perks.map((perk, i) => (
              <li key={i} className="flex items-start gap-3 text-[11px] text-white/60 leading-tight">
                <CheckCircle2 className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                {perk}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </div>
);

const CtaSlide = ({ slide }: { slide: Slide }) => (
  <div className="h-full w-full flex flex-col justify-center items-center p-16 gap-10 text-center relative overflow-hidden bg-[#0a0a0f]">
    <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at center, #7c3aed, transparent 70%)' }} />
    <div className="z-10 space-y-8 max-w-3xl">
      <h2 className="text-6xl md:text-7xl font-black tracking-tighter text-white leading-none uppercase italic drop-shadow-2xl">
        {slide.title}
      </h2>
      <div className="space-y-4">
        {slide.content.map((line, idx) => (
          <p key={idx} className="text-2xl text-white/70 font-medium tracking-tight leading-relaxed">{line}</p>
        ))}
      </div>
      {slide.cta && (
        <div className="inline-flex items-center gap-4 mt-6 px-12 py-5 rounded-full bg-primary text-white font-black text-xl shadow-[0_15px_30px_rgba(var(--primary),0.3)] hover:scale-105 transition-transform cursor-pointer uppercase tracking-wider">
          {slide.cta}
          <ChevronRight className="h-6 w-6" />
        </div>
      )}
    </div>
    <div className="absolute bottom-12 z-10">
      <div className="flex flex-col items-center gap-2">
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <p className="text-[10px] uppercase tracking-[0.5em] text-white/20 font-black">Future Events Ecosystem</p>
      </div>
    </div>
  </div>
);

// ── Render helper ──────────────────────────────────────────────

const renderSlide = (slide: Slide) => {
  switch (slide.type) {
    case 'cover':   return <CoverSlide slide={slide} />;
    case 'metrics': return <MetricsSlide slide={slide} />;
    case 'tiers':   return <TiersSlide slide={slide} />;
    case 'cta':     return <CtaSlide slide={slide} />;
    default:        return <ContentSlide slide={slide} />;
  }
};

// ── Main Component ─────────────────────────────────────────────

const AIPitchDeck = ({ data, eventId }: AIPitchDeckProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [attached, setAttached] = useState(false);

  const exportToPDF = async () => {
    if (!data?.slides?.length) return;
    setIsExporting(true);
    const toastId = toast.loading('Generating high-quality PDF...');
    
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: 'a4',
        hotfixes: ['px_scaling']
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < data.slides.length; i++) {
        const el = document.getElementById(`pdf-slide-${i}`);
        if (!el) continue;

        // Use slightly higher scale for better quality
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#0a0a0f',
          allowTaint: true,
          onclone: (clonedDoc) => {
            const clonedEl = clonedDoc.getElementById(`pdf-slide-${i}`);
            if (clonedEl) {
              clonedEl.style.position = 'static';
              clonedEl.style.display = 'block';
              clonedEl.style.visibility = 'visible';
            }
          }
        });

        if (canvas.width === 0 || canvas.height === 0) {
          throw new Error(`Canvas generated for slide ${i} has 0 dimensions`);
        }

        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

      const fileName = data.slides[0]?.title?.replace(/\s+/g, '_') || 'Pitch_Deck';
      pdf.save(`${fileName}.pdf`);
      toast.success('Pitch deck downloaded successfully!', { id: toastId });
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      toast.error('Failed to generate PDF. Please try again.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const attachToEvent = async () => {
    if (!eventId) return;
    setIsAttaching(true);
    toast.info('Attaching pitch deck to event...');
    try {
      const { error } = await supabase
        .from('events')
        .update({ ai_pitch_deck: data })
        .eq('id', eventId);

      if (error) throw error;

      setAttached(true);
      toast.success('Pitch deck attached! Sponsors can now view it on Browse Events.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to attach pitch deck');
    } finally {
      setIsAttaching(false);
    }
  };

  const slide = data.slides[currentSlide];
  const total = data.slides.length;

  if (!total || !slide) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center bg-card rounded-xl border border-dashed border-muted-foreground/30 text-muted-foreground">
        <Sparkles className="h-10 w-10 mb-4 opacity-20" />
        <p>No pitch deck data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-sm font-semibold tracking-tight">AI Pitch Studio</span>
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            {total} Slides
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToPDF} disabled={isExporting || isAttaching} className="gap-2 border-primary/20 hover:bg-primary/5">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Download className="h-4 w-4 text-primary" />}
            <span className="font-semibold">Download PDF</span>
          </Button>
          {eventId && (
            <Button
              size="sm"
              onClick={attachToEvent}
              disabled={isAttaching || isExporting || attached}
              className="gap-2 shadow-lg shadow-primary/20 font-semibold"
            >
              {isAttaching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : attached ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
              {attached ? 'Attached to Event' : 'Attach to Event'}
            </Button>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
        <div
          className="aspect-[16/9] bg-gradient-to-br from-[#0a0a0f] via-[#12121f] to-[#0a0a0f] relative group"
          style={{ minHeight: 320 }}
        >
          {/* Animated Glow */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-purple-500/20 blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
          
          <div className="relative h-full w-full">
            {renderSlide(slide)}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="ghost" size="icon"
          onClick={() => setCurrentSlide(s => Math.max(0, s - 1))}
          disabled={currentSlide === 0}
          className="rounded-full h-9 w-9 border border-border/50"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-1.5">
          {data.slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`rounded-full transition-all ${i === currentSlide ? 'bg-primary w-5 h-2' : 'bg-muted-foreground/30 w-2 h-2'}`}
            />
          ))}
        </div>

        <Button
          variant="ghost" size="icon"
          onClick={() => setCurrentSlide(s => Math.min(total - 1, s + 1))}
          disabled={currentSlide === total - 1}
          className="rounded-full h-9 w-9 border border-border/50"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Hidden PDF slides container - Optimized for html2canvas capture */}
      <div 
        style={{ 
          position: 'absolute',
          left: '-5000px',
          top: '0',
          width: '1280px',
          height: '720px',
          overflow: 'visible',
          pointerEvents: 'none',
          zIndex: -9999,
          opacity: 1
        }}
      >
        {data.slides.map((s, i) => (
          <div
            key={i}
            id={`pdf-slide-${i}`}
            style={{
              width: '1280px',
              height: '720px',
              backgroundColor: '#0a0a0f',
              position: 'relative',
              overflow: 'hidden',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {renderSlide(s)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIPitchDeck;

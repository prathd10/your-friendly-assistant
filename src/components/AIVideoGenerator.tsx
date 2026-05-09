import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, Film, Loader2, Paperclip, CheckCircle2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Scene {
  overlay: string;
  narratorText: string;
  imagePrompt: string;
}

const cleanNarratorText = (text: string) => {
  // Regex to remove any JSON-like structures that might have leaked
  return text.replace(/\{"gender".*?\}/g, 'our target audience').replace(/\{.*?\}/g, '');
};

interface AIVideoGeneratorProps {
  eventData: any;
  media: string[];
  script: { scenes: Scene[]; isAI: boolean };
  eventId?: string;
}

const SCENE_DURATION_MS = 6000;

const AIVideoGenerator = ({ eventData, media, script, eventId }: AIVideoGeneratorProps) => {
  const navigate = useNavigate();
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [muted, setMuted] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attached, setAttached] = useState(false);
  const isPlayingRef = useRef(false);
  const synth = window.speechSynthesis;

  useEffect(() => () => synth.cancel(), []);

  const getSceneBackground = (index: number) => {
    if (media && media.length > 0) return media[index % media.length];
    const scene = script.scenes[index];
    const category = eventData.category || 'Event';
    const prompt = scene?.imagePrompt || `${category} event cinematic professional India`;
    // Clean and shorten prompt for URL stability
    const cleanPrompt = prompt.replace(/[^\w\s]/gi, '').substring(0, 150);
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1280&height=720&nologo=true&seed=${index}`;
  };

  const playScene = (index: number) => {
    if (!isPlayingRef.current || index >= script.scenes.length) {
      setIsPlaying(false);
      if (index >= script.scenes.length) setIsDone(true);
      return;
    }
    setCurrentScene(index);
    const rawText = script.scenes[index]?.narratorText;
    const text = cleanNarratorText(rawText || '');
    
    if (!text || muted) {
      setTimeout(() => playScene(index + 1), 4000);
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') && v.lang === 'en-US')
      || voices.find(v => v.lang === 'en-US') || voices[0];
    if (preferred) utterance.voice = preferred;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => { if (isPlayingRef.current) setTimeout(() => playScene(index + 1), 800); };
    utterance.onerror = () => { if (isPlayingRef.current) setTimeout(() => playScene(index + 1), 3000); };
    synth.speak(utterance);
  };

  const start = () => {
    synth.cancel();
    isPlayingRef.current = true;
    setIsPlaying(true);
    setIsDone(false);
    setCurrentScene(0);
    setTimeout(() => playScene(0), 300);
  };

  const togglePlay = () => {
    if (isPlaying) {
      synth.pause();
      isPlayingRef.current = false;
      setIsPlaying(false);
    } else if (isDone) {
      start();
    } else {
      synth.resume();
      isPlayingRef.current = true;
      setIsPlaying(true);
    }
  };

  const reset = () => {
    synth.cancel();
    isPlayingRef.current = false;
    setIsPlaying(false);
    setIsDone(false);
    setCurrentScene(0);
  };

  // Render a single frame of a scene to canvas
  const renderFrame = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement | null,
    scene: Scene,
    progress: number, // 0–1 within scene
    sceneIndex: number,
    totalScenes: number
  ) => {
    const W = 1280, H = 720;
    ctx.clearRect(0, 0, W, H);

    // Dark background
    ctx.fillStyle = '#0f0f14';
    ctx.fillRect(0, 0, W, H);

    // Background image with Ken Burns
    if (img && img.naturalHeight > 0) {
      ctx.save();
      const scale = 1 + progress * 0.12;
      const dx = sceneIndex % 2 === 0 ? -progress * 25 : progress * 25;
      ctx.translate(W / 2 + dx, H / 2);
      ctx.scale(scale, scale);
      ctx.translate(-W / 2, -H / 2);
      ctx.globalAlpha = 0.55;
      ctx.drawImage(img, 0, 0, W, H);
      ctx.restore();
    }

    ctx.globalAlpha = 1;

    // Vignette
    const vignette = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, W * 0.75);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    // Bottom gradient for subtitle
    const bottomGrad = ctx.createLinearGradient(0, H * 0.55, 0, H);
    bottomGrad.addColorStop(0, 'rgba(0,0,0,0)');
    bottomGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);

    // Fade in overlay text
    const fadeIn = Math.min(1, progress * 6);
    ctx.globalAlpha = fadeIn;

    // Scene counter
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '500 14px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${sceneIndex + 1} / ${totalScenes}`, W / 2, 52);

    // Main overlay headline
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px Inter, Arial Black, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 20;
    const overlayText = scene.overlay.toUpperCase();
    ctx.fillText(overlayText, W / 2, H * 0.42);

    // Accent line
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(W / 2 - 50, H * 0.47, 100, 3);

    ctx.globalAlpha = 1;

    // Subtitle box
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(80, H - 140, W - 160, 110, 10);
    ctx.fill();

    // Subtitle text (word-wrap)
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = '500 20px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 0;
    const cleanText = cleanNarratorText(scene.narratorText);
    const words = cleanText.split(' ');
    let line = '';
    const lines: string[] = [];
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > W - 240) { lines.push(line.trim()); line = word + ' '; }
      else line = test;
    }
    if (line.trim()) lines.push(line.trim());
    const lineH = 28;
    const startY = H - 140 + (110 - lines.length * lineH) / 2 + lineH;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * lineH));

    // Progress bar - Premium style
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(40, H - 20, W - 80, 4);
    const progressWidth = (W - 80) * ((sceneIndex + progress) / totalScenes);
    const grad = ctx.createLinearGradient(40, 0, 40 + progressWidth, 0);
    grad.addColorStop(0, '#7c3aed');
    grad.addColorStop(1, '#a855f7');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(40, H - 20, progressWidth, 4, 2);
    ctx.fill();
  };

  const downloadVideo = async () => {
    if (!('MediaRecorder' in window)) {
      toast.error('Your browser does not support video recording');
      return;
    }

    setIsRecording(true);
    toast.info('Recording video — this will take a moment...');

    const W = 1280, H = 720;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // Prefer mp4 if supported, fall back to webm
    const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: mimeType.split(';')[0] });
    const chunks: Blob[] = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${eventData.name.replace(/\s+/g, '_')}_Pitch.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      setIsRecording(false);
      toast.success('Video downloaded!');
    };

    recorder.start();

    // Render all scenes frame by frame
    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];

      // Load background
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = getSceneBackground(i);
      await new Promise(res => { img.onload = res; img.onerror = res; setTimeout(res, 3000); });

      // Animate this scene
      await new Promise<void>(resolve => {
        const start = performance.now();
        const frame = (now: number) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / SCENE_DURATION_MS, 1);
          renderFrame(ctx, img.naturalHeight > 0 ? img : null, scene, progress, i, script.scenes.length);
          if (progress < 1) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
    }

    recorder.stop();
  };

  const attachToEvent = async () => {
    if (!eventId) return;
    setIsAttaching(true);
    toast.info('Attaching video pitch to event...');
    try {
      const { error } = await supabase
        .from('events')
        .update({ ai_video_script: script })
        .eq('id', eventId);
      if (error) throw error;
      setAttached(true);
      toast.success('Video pitch attached! Taking you back to the dashboard...');
      setTimeout(() => navigate(`/event/${eventId}/dashboard`), 1500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to attach video pitch');
      setIsAttaching(false);
    }
  };

  const scene = script.scenes[currentScene];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">AI Video Pitch</span>
          <span className="text-xs text-muted-foreground">({script.scenes.length} scenes)</span>
          {script.isAI && (
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[9px] font-bold uppercase tracking-wider border border-primary/30">
              AI
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setMuted(m => !m); synth.cancel(); }}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={downloadVideo} disabled={isRecording || isAttaching} className="gap-1.5">
            {isRecording ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            {isRecording ? 'Recording...' : 'Download Video'}
          </Button>
          {eventId && (
            <Button size="sm" onClick={attachToEvent} disabled={isAttaching || attached || isRecording} className="gap-1.5">
              {isAttaching ? <Loader2 className="h-3 w-3 animate-spin" /> : attached ? <CheckCircle2 className="h-3 w-3" /> : <Paperclip className="h-3 w-3" />}
              {attached ? 'Attached!' : 'Attach to Event'}
            </Button>
          )}
        </div>
      </div>

      {/* Player */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-black shadow-2xl border border-white/10">
        <AnimatePresence mode="wait">

          {!isPlaying && !isDone && (
            <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/95 z-20">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h4 className="text-lg font-bold text-white mb-1">{eventData.name}</h4>
              <p className="text-zinc-400 text-sm mb-6">Sponsor Video Pitch — {script.scenes.length} scenes</p>
              <Button onClick={start} className="gap-2 px-8">
                <Play className="h-4 w-4 fill-current" /> Play Pitch
              </Button>
              {muted && <p className="text-zinc-500 text-xs mt-3">Narration is muted</p>}
            </motion.div>
          )}

          {isDone && (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 backdrop-blur-sm">
              <CheckCircle2 className="h-12 w-12 text-primary mb-3" />
              <h4 className="text-xl font-bold text-white mb-4">Pitch Complete</h4>
              <Button variant="outline" onClick={reset} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Watch Again
              </Button>
            </motion.div>
          )}

          {isPlaying && scene && (
            <motion.div key={currentScene} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }} className="absolute inset-0">
              <motion.div
                initial={{ scale: 1, x: currentScene % 2 === 0 ? -15 : 15 }}
                animate={{ scale: 1.12, x: currentScene % 2 === 0 ? 15 : -15 }}
                transition={{ duration: 9, ease: 'linear' }}
                className="absolute inset-0"
              >
                <img 
                  src={getSceneBackground(currentScene)} 
                  className="w-full h-full object-cover brightness-50 transition-opacity duration-1000" 
                  alt="" 
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('unsplash')) {
                      target.src = `https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1280&q=80`;
                    }
                  }}
                />
              </motion.div>
              
              {/* AI Indicator Badge */}
              {(!media || media.length === 0) && (
                <div className="absolute top-6 left-6 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                  <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-tighter">AI Background</span>
                </div>
              )}

              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.15)_0%,transparent_70%)]" />
              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              
              <div className="absolute inset-0 flex flex-col justify-center items-center px-16 text-center z-10">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.8 }} className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-md mb-2">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{currentScene + 1} / {script.scenes.length}</span>
                  </div>
                  <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[0.85] drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] uppercase italic">
                    {scene.overlay}
                  </h2>
                  <motion.div initial={{ width: 0 }} animate={{ width: 120 }} transition={{ delay: 0.8, duration: 1 }} className="h-1 bg-gradient-to-r from-primary to-purple-400 mx-auto rounded-full" />
                </motion.div>
              </div>

              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.7 }}
                className="absolute bottom-12 left-12 right-12 z-10">
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl">
                  <p className="text-lg md:text-xl text-white/90 font-medium leading-relaxed text-center tracking-tight">
                    {cleanNarratorText(scene.narratorText)}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HUD Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/5 z-30">
          <motion.div className="h-full bg-gradient-to-r from-primary to-purple-500 shadow-[0_0_15px_rgba(124,58,237,0.5)]"
            animate={{ width: `${((currentScene + (isPlaying ? 1 : 0)) / script.scenes.length) * 100}%` }}
            transition={{ duration: 0.4 }} />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" size="sm" onClick={reset} disabled={!isPlaying && !isDone}><RotateCcw className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={togglePlay} className="w-28 gap-2">
          {isPlaying ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> {isDone ? 'Replay' : 'Play'}</>}
        </Button>
      </div>

      {/* Scene dots */}
      <div className="flex items-center justify-center gap-1.5">
        {script.scenes.map((_, i) => (
          <div key={i} className={`rounded-full transition-all ${i === currentScene && isPlaying ? 'bg-primary w-4 h-1.5' : i < currentScene || isDone ? 'bg-primary/40 w-1.5 h-1.5' : 'bg-muted-foreground/20 w-1.5 h-1.5'}`} />
        ))}
      </div>

      {isRecording && (
        <p className="text-xs text-muted-foreground text-center animate-pulse">
          Rendering {script.scenes.length} scenes × {SCENE_DURATION_MS / 1000}s each — do not close this window
        </p>
      )}
    </div>
  );
};

export default AIVideoGenerator;

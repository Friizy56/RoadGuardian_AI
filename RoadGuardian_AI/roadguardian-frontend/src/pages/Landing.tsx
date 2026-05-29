import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Activity, Map, Trophy, ShieldCheck, Zap, Globe2, AlertTriangle, Building2, UserCircle2, Radar, Shield, Server, Mic, PhoneCall, FileText, ChevronRight, ChevronDown, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';



export const Landing = () => {
  const navigate = useNavigate();
  const [activeDots, setActiveDots] = useState([true, false, true, false, true]);
  const [scanDegree, setScanDegree] = useState(0);
  const [expandedService, setExpandedService] = useState<number | null>(null);

  // Multilingual Voice AI simulation states
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'transcribing' | 'completed'>('idle');
  const [voiceLang, setVoiceLang] = useState<'Hindi' | 'Spanish' | 'German'>('Hindi');
  const [transcriptText, setTranscriptText] = useState('');
  const [translatedText, setTranslatedText] = useState('');

  const triggerVoiceDemo = () => {
    setVoiceState('listening');
    setTranscriptText('Listening to microphone input...');
    setTranslatedText('');
    
    // Simulate listening phase
    setTimeout(() => {
      setVoiceState('transcribing');
      if (voiceLang === 'Hindi') {
        setTranscriptText('सड़क के बीच में एक बहुत बड़ा गड्ढा है जिससे गाड़ियाँ टकरा रही हैं।');
      } else if (voiceLang === 'Spanish') {
        setTranscriptText('Hay un gran bache en medio de la carretera que está dañando los coches.');
      } else {
        setTranscriptText('Es gibt ein großes Schlagloch mitten auf der Straße, das Autos beschädigt.');
      }
      
      // Simulate translation/structuring phase
      setTimeout(() => {
        setVoiceState('completed');
        if (voiceLang === 'Hindi') {
          setTranslatedText('Severe pothole detected in the center of the lane. Categorized as critical high severity.');
        } else if (voiceLang === 'Spanish') {
          setTranslatedText('Major pothole reported in the middle of the road segment. Categorized as high severity.');
        } else {
          setTranslatedText('Large pothole detected on the central highway segment. Categorized as critical.');
        }
      }, 2000);
    }, 2000);
  };


  useEffect(() => {
    const interval = setInterval(() => {
      setActiveDots(prev => prev.map(() => Math.random() > 0.5));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Radar rotation effect
    const interval = setInterval(() => {
      setScanDegree(prev => (prev + 4) % 360);
    }, 20);
    return () => clearInterval(interval);
  }, []);

  const features = [
    { id: 0, icon: Activity, title: 'AI Hazard Detection', desc: 'Real-time severity analysis utilizing advanced computer vision networks.', code: 'MOD-01A', fullDesc: 'This module utilizes federated machine learning to process citizen-uploaded media and automatically categorize road hazards (potholes, cracks, waterlogging) by severity level, expediting municipal dispatch.' },
    { id: 1, icon: Map, title: 'Live Regional Heatmaps', desc: 'Identify high-risk zones with dynamic, interactive GIS mapping.', code: 'MOD-02B', fullDesc: 'Integrates with national GIS databases to overlay reported incidents onto a live heatmap. Authorities use this data to perform predictive maintenance and allocate infrastructure budgets effectively.' },
    { id: 2, icon: ShieldCheck, title: 'Municipal Portal', desc: 'Direct, secure dispatch pipelines connecting citizens to repair teams.', code: 'MOD-03C', fullDesc: 'A strictly authenticated dashboard for municipal engineers and contractors to view verified reports, update repair status, and communicate completion metrics back to the citizen.' },
    { id: 3, icon: Zap, title: 'Immediate Alerts', desc: 'Instant geographic notifications of severe hazards.', code: 'MOD-04D', fullDesc: 'An automated broadcast system that pushes critical SMS and portal notifications to users who are entering geographically flagged severe hazard zones.' },
    { id: 4, icon: Trophy, title: 'Civic Gamification', desc: 'Incentivize reporting through an official leaderboard.', code: 'MOD-05E', fullDesc: 'To ensure continuous civic engagement, users are awarded "Civic Points" for accurate hazard reports. High-ranking citizens earn digital badges and recognition from local authorities.' },
    { id: 5, icon: Globe2, title: 'Open Civic Data', desc: 'Transparent records accessible to the broader community.', code: 'MOD-06F', fullDesc: 'In compliance with the Right to Information, anonymized hazard resolution metrics and contractor response times are made publicly available for independent auditing.' },
  ];

  const toggleService = (id: number) => {
    if (expandedService === id) {
      setExpandedService(null);
    } else {
      setExpandedService(id);
    }
  };

  const handleViewAll = () => {
    // If not all are expanded, just expand the first one as a demo, or toggle state to show a master description
    setExpandedService(prev => prev !== null ? null : 0);
  };

  return (
    <div className="flex flex-col min-h-screen text-foreground pt-0 relative overflow-x-hidden">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 28s linear infinite;
        }
        @keyframes wave {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        .animate-wave-bar {
          animation: wave 1.2s ease-in-out infinite;
          transform-origin: bottom;
        }
      `}</style>

      {/* Live National Ticker */}
      <div className="bg-[#000080] dark:bg-slate-900 border-b border-[#FF9933] py-2 overflow-hidden relative z-50 shadow-md">
        <div className="flex items-center gap-4 whitespace-nowrap animate-marquee text-[10px] sm:text-xs font-mono uppercase text-white font-bold">
          <span className="text-[#FF9933] flex items-center gap-1 shrink-0 px-3 bg-black/40 py-0.5 rounded border border-[#FF9933]/30 font-bold"><Zap className="w-3.5 h-3.5" /> LIVE FEEDS:</span>
          <span className="mx-2">🌟 Citizen Bobby resolved crack #4029 in Washington D.C. (+50 Civic Points awarded!)</span>
          <span className="text-[#FF9933]">|</span>
          <span className="mx-2">🌿 Eco-Asphalt deployed on Highway-95 — 4.8 Metric Tons of CO2 Offset!</span>
          <span className="text-[#FF9933]">|</span>
          <span className="mx-2">🧠 ML hot-spot algorithm updated: 94.8% accuracy achieved on preemptive pavement erosion</span>
          <span className="text-[#FF9933]">|</span>
          <span className="mx-2">📡 Active Satellite Node orbiting Washington sector - live telemetry active</span>
        </div>
      </div>

      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-10" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-[#000080]/5 dark:from-primary/10 to-transparent pointer-events-none z-0"></div>

      {/* IRCTC-Style Dense Hero Section */}
      <section className="w-full relative z-10 overflow-hidden py-8 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Information Panel */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white/90 dark:bg-card/90 backdrop-blur-md border-t-4 border-t-[#000080] dark:border-t-primary border border-border shadow-xl rounded-sm p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-[0.03] group-hover:opacity-10 transition-opacity">
                <Shield className="w-48 h-48" />
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#000080] dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:to-gray-400 leading-tight mb-4 uppercase drop-shadow-sm">
                National Road Safety <br className="hidden md:block" />
                <span className="text-[#FF9933]">Reporting Portal</span>
              </h1>
              <p className="text-sm md:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-medium max-w-2xl relative z-10">
                Empowering citizens and municipal authorities with AI-driven infrastructure monitoring. Report hazards, track repairs, and ensure community safety through verified data collection. This portal serves as the central hub for all national infrastructure discrepancy logs.
              </p>
            </div>

            {/* Redesigned 3D Dynamic Visuals Panel */}
            <div className="hidden md:block bg-white/90 dark:bg-card/80 backdrop-blur-md border border-border shadow-lg p-5 rounded-sm" style={{ perspective: 1200 }}>
              <div className="flex items-center justify-between border-b border-border pb-3 mb-5">
                <h3 className="font-bold text-sm uppercase flex items-center text-[#000080] dark:text-primary tracking-wider"><Radar className="w-4 h-4 mr-2"/> Live Regional Scan</h3>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-muted px-3 py-1 border border-border rounded-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#138808] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#138808]"></span>
                  </span>
                  <span className="text-[10px] text-[#000080] dark:text-foreground font-bold uppercase tracking-widest drop-shadow-sm">Telemetry Active</span>
                </div>
              </div>
              
              <motion.div 
                className="w-full bg-[#040D1A] rounded-sm h-[280px] p-0 relative overflow-hidden border-2 border-[#000080]/30 dark:border-border shadow-inner"
                whileHover={{ rotateX: 2, rotateY: -2, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                 {/* High-Contrast Telemetry Grid */}
                 <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(to right, rgba(0, 150, 255, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 150, 255, 0.2) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                 <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(to right, rgba(0, 150, 255, 0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 150, 255, 0.5) 1px, transparent 1px)', backgroundSize: '160px 160px' }}></div>
                 
                 {/* Smooth Conic Radar Sweep (Greenish for classic radar feel) */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full border border-teal-500/20 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 rounded-full border border-teal-500/30 m-12"></div>
                    <div className="absolute inset-0 rounded-full border border-teal-500/40 m-24"></div>
                    {/* The sweeping gradient */}
                    <div 
                      className="absolute inset-0 rounded-full mix-blend-screen" 
                      style={{ 
                        background: 'conic-gradient(from 0deg, transparent 70%, rgba(20, 184, 166, 0.5) 100%)',
                        transform: `rotate(${scanDegree}deg)`
                      }}
                    ></div>
                    {/* The radar line */}
                    <div 
                      className="absolute top-0 bottom-1/2 left-1/2 w-[1.5px] bg-teal-400 shadow-[0_0_12px_#2dd4bf] origin-bottom"
                      style={{ transform: `rotate(${scanDegree}deg)` }}
                    ></div>
                 </div>

                 {/* Official Government Data Points with Telemetry Tags */}
                 {/* Point 1: Critical (Red) */}
                 <div className="absolute top-[30%] left-[35%] flex items-center gap-2 z-20 hover:scale-110 transition-transform cursor-default group">
                   <div className="relative flex h-2 w-2">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 border border-white/50 shadow-[0_0_8px_rgba(239,68,68,1)]"></span>
                   </div>
                   <div className="flex flex-col bg-red-950/80 border border-red-500/50 px-1.5 py-0.5 rounded-sm backdrop-blur-md opacity-80 group-hover:opacity-100">
                     <span className="text-[8px] font-mono font-bold text-red-400 leading-none">HZ-90A [CRIT]</span>
                     <span className="text-[7px] font-mono text-white/70 leading-none mt-0.5">SEV: 9.4 | STRUCTURAL</span>
                   </div>
                 </div>

                 {/* Point 2: Pending/Warning (Orange) */}
                 <div className="absolute top-[65%] left-[25%] flex items-center gap-2 z-20 hover:scale-110 transition-transform cursor-default group" style={{ animationDelay: '0.5s' }}>
                   <div className="relative flex h-2 w-2">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9933] opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF9933] border border-white/50 shadow-[0_0_8px_rgba(255,153,51,1)]"></span>
                   </div>
                   <div className="flex flex-col bg-orange-950/80 border border-orange-500/50 px-1.5 py-0.5 rounded-sm backdrop-blur-md opacity-80 group-hover:opacity-100">
                     <span className="text-[8px] font-mono font-bold text-orange-400 leading-none">HZ-11B [WARN]</span>
                     <span className="text-[7px] font-mono text-white/70 leading-none mt-0.5">SEV: 6.2 | POTHOLE</span>
                   </div>
                 </div>

                 {/* Point 3: Resolved/Clear (Green) */}
                 <div className="absolute top-[45%] left-[65%] flex items-center gap-2 z-20 hover:scale-110 transition-transform cursor-default group" style={{ animationDelay: '1s' }}>
                   <div className="relative flex h-2 w-2">
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-[#138808] border border-white/50 shadow-[0_0_8px_rgba(19,136,8,1)]"></span>
                   </div>
                   <div className="flex flex-col bg-green-950/80 border border-green-500/50 px-1.5 py-0.5 rounded-sm backdrop-blur-md opacity-60 group-hover:opacity-100">
                     <span className="text-[8px] font-mono font-bold text-green-400 leading-none">HZ-44C [CLR]</span>
                   </div>
                 </div>
                 
                 {/* Point 4: Pending (Orange) */}
                 <div className="absolute top-[75%] left-[60%] flex items-center gap-2 z-20 hover:scale-110 transition-transform cursor-default group" style={{ animationDelay: '0.2s' }}>
                   <div className="relative flex h-2 w-2">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9933] opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF9933] border border-white/50 shadow-[0_0_8px_rgba(255,153,51,1)]"></span>
                   </div>
                   <div className="flex flex-col bg-orange-950/80 border border-orange-500/50 px-1.5 py-0.5 rounded-sm backdrop-blur-md opacity-80 group-hover:opacity-100">
                     <span className="text-[8px] font-mono font-bold text-orange-400 leading-none">HZ-28X [WARN]</span>
                     <span className="text-[7px] font-mono text-white/70 leading-none mt-0.5">SEV: 5.5 | SIGNAGE</span>
                   </div>
                 </div>

                 {/* Overlay UI elements */}
                 <div className="absolute top-3 left-3 bg-[#040D1A]/90 border border-[#000080]/50 p-2.5 rounded-sm shadow-sm backdrop-blur-md z-30" style={{ transform: 'translateZ(20px)' }}>
                   <div className="text-[9px] font-mono text-teal-400 font-bold uppercase mb-2 tracking-widest flex items-center">
                     <Activity className="w-3 h-3 mr-1" /> Sector Analytics
                   </div>
                   <div className="flex gap-5">
                     <div>
                       <div className="text-sm font-black text-[#FF9933] font-mono leading-none">12</div>
                       <div className="text-[7px] uppercase text-slate-300 font-bold mt-1 tracking-wider">Pending</div>
                     </div>
                     <div>
                       <div className="text-sm font-black text-red-500 font-mono leading-none">4</div>
                       <div className="text-[7px] uppercase text-slate-300 font-bold mt-1 tracking-wider">Critical</div>
                     </div>
                     <div>
                       <div className="text-sm font-black text-[#138808] font-mono leading-none">89</div>
                       <div className="text-[7px] uppercase text-slate-300 font-bold mt-1 tracking-wider">Cleared</div>
                     </div>
                   </div>
                 </div>

                 <div className="absolute bottom-3 right-3 text-[9px] bg-black/80 px-3 py-1.5 border border-teal-500/40 rounded-sm text-teal-400 font-mono font-bold tracking-widest backdrop-blur-md shadow-sm z-30 flex items-center gap-2" style={{ transform: 'translateZ(10px)' }}>
                   <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                   NODE: IND-204-VX
                 </div>
              </motion.div>
             </div>

             {/* Dynamic AI Voice Command & Translation Simulation Panel */}
             <div className="bg-white/90 dark:bg-card/85 backdrop-blur-md border border-border shadow-lg p-5 rounded-sm mt-6">
               <div className="flex items-center justify-between border-b border-border pb-3 mb-5">
                 <h3 className="font-bold text-sm uppercase flex items-center text-[#000080] dark:text-primary tracking-wider">
                   🎙️ AI Multilingual Voice Command & NLP Translation
                 </h3>
                 <span className="text-[9px] bg-[#FF9933]/15 text-[#FF9933] border border-[#FF9933]/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                   Whisper & Gemini AI
                 </span>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                 {/* Voice control button & wave bars */}
                 <div className="md:col-span-4 flex flex-col items-center justify-center bg-slate-900/10 dark:bg-black/30 p-4 rounded border border-border">
                   <span className="text-[10px] uppercase font-bold text-slate-500 mb-2">Select Language</span>
                   <select 
                     value={voiceLang} 
                     onChange={(e) => setVoiceLang(e.target.value as any)}
                     disabled={voiceState === 'listening' || voiceState === 'transcribing'}
                     className="bg-background border border-border focus:border-primary text-xs font-bold px-3 py-1.5 rounded-sm mb-4 w-full focus:ring-1 focus:ring-primary text-foreground"
                   >
                     <option value="Hindi">Hindi (हिंदी)</option>
                     <option value="Spanish">Spanish (Español)</option>
                     <option value="German">German (Deutsch)</option>
                   </select>

                   {/* Mic button */}
                   <button
                     onClick={triggerVoiceDemo}
                     disabled={voiceState === 'listening' || voiceState === 'transcribing'}
                     className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg border transition-all duration-300 relative ${
                       voiceState === 'listening' 
                         ? 'bg-red-500 border-red-400 text-white animate-pulse scale-105' 
                         : voiceState === 'transcribing'
                         ? 'bg-yellow-500 border-yellow-400 text-white animate-pulse'
                         : 'bg-[#000080] hover:bg-[#000080]/90 text-white border-[#FF9933]'
                     }`}
                   >
                     <Mic className={`w-6 h-6 ${voiceState === 'listening' ? 'animate-bounce' : ''}`} />
                     {voiceState === 'listening' && (
                       <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-75"></span>
                     )}
                   </button>
                   
                   <span className="text-[9px] uppercase font-bold mt-3 text-muted-foreground">
                     {voiceState === 'listening' 
                       ? '🔴 Recording Speech...' 
                       : voiceState === 'transcribing'
                       ? '🔄 Whisper AI transcribing...' 
                       : 'Click to Speak'}
                   </span>

                   {/* Equalizer Frequency bars */}
                   <div className="flex items-end justify-center gap-1 h-10 mt-4">
                     {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                       <div 
                         key={bar} 
                         style={{ 
                           animationDelay: `${bar * 0.15}s`,
                           height: voiceState === 'listening' ? '30px' : '4px'
                         }}
                         className={`w-1.5 bg-[#FF9933] rounded-t-sm transition-all duration-300 ${
                           voiceState === 'listening' ? 'animate-wave-bar' : ''
                         }`}
                       ></div>
                     ))}
                   </div>
                 </div>

                 {/* Console Logs / Audio Transcript Terminal */}
                 <div className="md:col-span-8 space-y-3 font-mono">
                   <div className="bg-[#040D1A] text-slate-300 p-4 rounded-sm border border-border/80 text-[11px] leading-relaxed relative min-h-[170px] flex flex-col justify-between shadow-inner">
                     <div>
                       <span className="text-teal-400 font-bold flex items-center gap-1.5 text-2xs uppercase tracking-widest border-b border-[#000080] pb-1.5 mb-2">
                         <Server className="w-3.5 h-3.5" /> AI Real-Time Processing Console
                       </span>
                       
                       <p className="text-slate-400 mt-1">
                         <span className="text-teal-400 font-black">&gt;</span> SYSTEM STATE: <span className="font-extrabold text-white bg-slate-800 px-1.5 py-0.5 rounded text-xs">{voiceState.toUpperCase()}</span>
                       </p>

                       {transcriptText && (
                         <div className="mt-3">
                           <span className="text-[#FF9933] font-bold uppercase text-[9px] block">Transcribed Native Text:</span>
                           <p className="text-slate-100 text-xs mt-1 font-sans font-medium">{transcriptText}</p>
                         </div>
                       )}

                       {translatedText && (
                         <div className="mt-3 animate-fadeIn">
                           <span className="text-emerald-400 font-bold uppercase text-[9px] block">Gemini NLP Translated Output (English):</span>
                           <p className="text-white text-xs mt-1 font-sans font-semibold bg-emerald-950/40 p-2 rounded border border-emerald-500/20">{translatedText}</p>
                         </div>
                       )}
                     </div>

                     <div className="text-[9px] text-teal-500/80 font-bold uppercase text-right tracking-widest mt-4">
                       CONFIDENCE LEVEL: {voiceState === 'completed' ? '98.4%' : 'N/A'}
                     </div>
                   </div>
                 </div>

               </div>
             </div>

             {/* Proactive Satellite AI Sweep Panel */}
             <div className="bg-white/90 dark:bg-card/85 backdrop-blur-md border border-border shadow-lg p-5 rounded-sm mt-6">
               <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                 <h3 className="font-bold text-sm uppercase flex items-center text-[#000080] dark:text-primary tracking-wider">
                   🛰️ Proactive Orbit Satellite AI Sweep
                 </h3>
                 <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest">
                   Live Sentinel Nodes
                 </span>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-slate-900/10 dark:bg-black/30 p-3 rounded border border-border text-xs space-y-2">
                   <span className="text-2xs font-bold uppercase text-slate-500 tracking-wide">Scanning Region</span>
                   <div className="flex justify-between items-center bg-background/50 p-2 rounded border border-border/40">
                     <span className="font-bold">Interstate Corridor 95</span>
                     <span className="text-[10px] font-mono text-cyan-400">40.7128° N, 74.0060° W</span>
                   </div>
                   <div className="flex justify-between items-center bg-background/50 p-2 rounded border border-border/40">
                     <span className="font-bold">National Highway 4</span>
                     <span className="text-[10px] font-mono text-emerald-400">13.0827° N, 80.2707° E</span>
                   </div>
                 </div>

                 <div className="bg-slate-900/10 dark:bg-black/30 p-3 rounded border border-border text-xs space-y-2 flex flex-col justify-between">
                   <div>
                     <span className="text-2xs font-bold uppercase text-slate-500 tracking-wide">Orbital Telemetry Sweep Status</span>
                     <div className="flex items-center gap-2 mt-2">
                       <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
                       <span className="font-bold text-foreground">AI Scanning active: 94% complete</span>
                     </div>
                   </div>
                   <p className="text-[10px] text-muted-foreground">Preemptive wear-and-tear models are synced to municipal repair pipelines automatically.</p>
                 </div>
               </div>
             </div>
           </div>
           
           {/* Right Column: IRCTC-Style Dense Panels */}
          <div className="lg:col-span-4 flex flex-col gap-4 relative z-10">
            
            {/* Login Pane */}
            <div className="bg-white/95 dark:bg-card/95 backdrop-blur-md border-t-4 border-t-[#FF9933] border border-border shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.02)] rounded-sm overflow-hidden">
              <div className="bg-[#000080] dark:bg-slate-900 text-white py-3 px-5 flex justify-between items-center border-b border-border/50">
                <h2 className="font-black uppercase text-sm tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Access Portals</h2>
                <AlertTriangle className="w-4 h-4 text-[#FF9933]" />
              </div>
              
              <div className="p-5 space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center text-[#000080] dark:text-primary font-black text-sm uppercase border-b border-border pb-2 tracking-wider">
                    <UserCircle2 className="w-5 h-5 mr-2" />
                    For Citizens
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-tight">Log in to report road hazards, track municipal responses, and earn civic points.</p>
                  <Button size="sm" onClick={() => navigate('/login?role=citizen')} className="w-full h-9 font-black uppercase text-[11px] rounded-sm bg-[#FF9933] hover:bg-[#e68a2e] text-white shadow-md transition-all border-b-4 border-[#b45309] active:border-b-0 active:translate-y-1">
                    Citizen Login
                  </Button>
                </div>

                <div className="space-y-3 pt-3 border-t border-dashed border-border">
                  <div className="flex items-center text-[#000080] dark:text-primary font-black text-sm uppercase border-b border-border pb-2 tracking-wider">
                    <Building2 className="w-5 h-5 mr-2" />
                    For Officials
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-tight">Authorized login for municipal dispatchers and structural engineers.</p>
                  <Button size="sm" variant="outline" onClick={() => navigate('/login?role=authority')} className="w-full h-9 font-black uppercase text-[11px] rounded-sm border-2 border-[#000080] text-[#000080] dark:border-primary dark:text-primary hover:bg-[#000080] hover:text-white dark:hover:bg-primary dark:hover:text-primary-foreground shadow-sm transition-all">
                    Department Login
                  </Button>
                </div>
              </div>
              <div className="bg-slate-100 dark:bg-muted/50 p-2 border-t border-border text-[9px] text-center text-slate-600 dark:text-slate-400 uppercase font-black tracking-widest">
                Multi-Factor Verification Required
              </div>
            </div>

            {/* Helpline & Bulletins Box */}
            <div className="bg-white dark:bg-card border border-border shadow-sm rounded-sm overflow-hidden flex flex-col">
              <div className="flex">
                <div className="flex-1 border-r border-border p-3 hover:bg-slate-50 dark:hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div className="flex items-center text-[#000080] dark:text-primary font-bold text-[10px] uppercase mb-1 tracking-wider">
                    <PhoneCall className="w-3 h-3 mr-1.5" /> Helpline
                  </div>
                  <div className="font-black text-[#FF9933] text-sm group-hover:scale-105 origin-left transition-transform">1033</div>
                  <div className="text-[8px] text-slate-600 dark:text-slate-400 uppercase mt-0.5 font-bold">Toll-Free (24x7)</div>
                </div>
                <div className="flex-1 p-3 hover:bg-slate-50 dark:hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div className="flex items-center text-[#000080] dark:text-primary font-bold text-[10px] uppercase mb-1 tracking-wider">
                    <FileText className="w-3 h-3 mr-1.5" /> Circulars
                  </div>
                  <div className="font-bold text-xs group-hover:text-primary transition-colors truncate">Notice 4A/26</div>
                  <div className="text-[8px] text-slate-600 dark:text-slate-400 uppercase mt-0.5 font-bold">Updated Today</div>
                </div>
              </div>
              <div className="bg-[#fdf2e9] dark:bg-yellow-950/20 p-2 border-t border-[#FF9933]/30">
                <p className="text-[9px] text-center text-[#b45309] dark:text-yellow-500 font-bold uppercase tracking-wider">
                  ⚠️ Report suspicious activities to cyber cell
                </p>
              </div>
            </div>

            {/* Tabular System Status */}
            <div className="bg-white dark:bg-card border-t-2 border-t-[#138808] border-x border-b border-border rounded-sm shadow-sm overflow-hidden mt-auto">
              <div className="bg-slate-50 dark:bg-muted py-2 px-3 border-b border-border flex items-center">
                <Server className="w-3.5 h-3.5 mr-2 text-[#000080] dark:text-primary" />
                <h4 className="font-bold text-[11px] uppercase text-[#000080] dark:text-primary tracking-wider">Infrastructure Status</h4>
              </div>
              <table className="w-full text-left text-[10px] font-mono">
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400 font-bold uppercase bg-slate-50/50 dark:bg-muted/30 border-r border-border w-1/2">Core Server</td>
                    <td className="py-2 px-3 font-black text-success">ONLINE (99.98%)</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400 font-bold uppercase bg-slate-50/50 dark:bg-muted/30 border-r border-border">Active Nodes</td>
                    <td className="py-2 px-3 font-black text-foreground">4,208</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400 font-bold uppercase bg-slate-50/50 dark:bg-muted/30 border-r border-border">Last Sync</td>
                    <td className="py-2 px-3 font-bold text-foreground">14:02:45 IST</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </section>

      {/* Grid: Official Government Services List */}
      <section className="w-full bg-white dark:bg-card/50 border-t border-b border-border py-12 px-6 flex-1 transition-colors relative z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          
          <div className="mb-8 border-l-4 border-[#138808] pl-5">
            <h2 className="text-2xl font-black uppercase text-[#000080] dark:text-foreground tracking-tight">Available Digital Services</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-bold uppercase tracking-wider">Directory of Core Modules & Operations</p>
          </div>
          
          <div className="bg-white dark:bg-card border-t-4 border-t-[#000080] dark:border-t-primary border-x border-b border-border shadow-sm rounded-sm overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              
              {/* Left Column Services */}
              <div className="flex flex-col divide-y divide-border h-full">
                {features.slice(0, 3).map((f) => (
                  <div key={f.id} className="flex flex-col bg-white dark:bg-card transition-colors">
                    <div 
                      onClick={() => toggleService(f.id)}
                      className="flex items-stretch group hover:bg-slate-50 dark:hover:bg-muted/30 transition-colors cursor-pointer min-h-[80px]"
                    >
                      <div className="w-16 flex items-center justify-center bg-slate-50 dark:bg-muted/50 border-r border-border shrink-0 group-hover:bg-[#FF9933]/10 transition-colors">
                        <f.icon className="w-5 h-5 text-[#000080] dark:text-primary group-hover:text-[#FF9933] transition-colors" />
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-center">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-[13px] font-black uppercase text-[#000080] dark:text-foreground tracking-wider">{f.title}</h3>
                          <span className="text-[9px] font-mono text-slate-500 border border-border px-1 py-0.5 rounded-sm bg-white dark:bg-card shrink-0 ml-2">{f.code}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-xs font-medium leading-relaxed pr-2">{f.desc}</p>
                      </div>
                      <div className="w-10 border-l border-border/50 flex items-center justify-center bg-slate-50/50 dark:bg-muted/20 group-hover:bg-[#000080]/5 dark:group-hover:bg-primary/10 transition-colors shrink-0">
                         {expandedService === f.id ? (
                           <ChevronDown className="w-4 h-4 text-[#FF9933]" />
                         ) : (
                           <ChevronRight className="w-4 h-4 text-[#000080] dark:text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                         )}
                      </div>
                    </div>
                    <AnimatePresence>
                      {expandedService === f.id && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-[#fdf2e9] dark:bg-muted/80 border-t border-border"
                        >
                          <div className="p-4 pl-20 flex gap-3 text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                            <Info className="w-4 h-4 text-[#FF9933] shrink-0 mt-0.5" />
                            <p>{f.fullDesc}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {/* Right Column Services */}
              <div className="flex flex-col divide-y divide-border h-full">
                {features.slice(3, 6).map((f) => (
                  <div key={f.id} className="flex flex-col bg-white dark:bg-card transition-colors">
                    <div 
                      onClick={() => toggleService(f.id)}
                      className="flex items-stretch group hover:bg-slate-50 dark:hover:bg-muted/30 transition-colors cursor-pointer min-h-[80px]"
                    >
                      <div className="w-16 flex items-center justify-center bg-slate-50 dark:bg-muted/50 border-r border-border shrink-0 group-hover:bg-[#FF9933]/10 transition-colors">
                        <f.icon className="w-5 h-5 text-[#000080] dark:text-primary group-hover:text-[#FF9933] transition-colors" />
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-center">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-[13px] font-black uppercase text-[#000080] dark:text-foreground tracking-wider">{f.title}</h3>
                          <span className="text-[9px] font-mono text-slate-500 border border-border px-1 py-0.5 rounded-sm bg-white dark:bg-card shrink-0 ml-2">{f.code}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-xs font-medium leading-relaxed pr-2">{f.desc}</p>
                      </div>
                      <div className="w-10 border-l border-border/50 flex items-center justify-center bg-slate-50/50 dark:bg-muted/20 group-hover:bg-[#000080]/5 dark:group-hover:bg-primary/10 transition-colors shrink-0">
                         {expandedService === f.id ? (
                           <ChevronDown className="w-4 h-4 text-[#FF9933]" />
                         ) : (
                           <ChevronRight className="w-4 h-4 text-[#000080] dark:text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                         )}
                      </div>
                    </div>
                    <AnimatePresence>
                      {expandedService === f.id && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-[#fdf2e9] dark:bg-muted/80 border-t border-border"
                        >
                          <div className="p-4 pl-20 flex gap-3 text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                            <Info className="w-4 h-4 text-[#FF9933] shrink-0 mt-0.5" />
                            <p>{f.fullDesc}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

            </div>
            
            <div className="bg-slate-100 dark:bg-muted/50 p-3 border-t border-border flex justify-between items-center text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">
              <span>Showing 6 of 6 Active Modules</span>
              <span onClick={handleViewAll} className="flex items-center text-[#000080] dark:text-primary cursor-pointer hover:underline transition-colors">
                {expandedService !== null ? 'Close Expanded Module' : 'View All Services'} <ChevronRight className="w-3 h-3 ml-1" />
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* Official Footer */}
      <footer className="w-full bg-slate-950 text-white py-8 px-6 text-xs text-center border-t-4 border-[#000080] relative z-10">
        <p className="font-black uppercase tracking-widest mb-3 text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500">Government of India • Ministry of Road Transport & Highways</p>
        <p className="opacity-60 font-medium">&copy; 2026 National Road Safety Portal. All rights reserved.</p>
        <div className="flex justify-center gap-6 mt-5 opacity-50 font-bold uppercase tracking-wider text-[10px]">
          <span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
          <span>|</span>
          <span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span>
          <span>|</span>
          <span className="hover:text-white transition-colors cursor-pointer">Accessibility</span>
        </div>
      </footer>
    </div>
  );
};

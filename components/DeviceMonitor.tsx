
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts';
import { Mic, Play, Pause, Save, Activity, Wifi, Leaf, Volume2, MicOff, Send, Terminal, Cpu, Settings, Usb, ToggleLeft, ToggleRight, AlertCircle, VolumeX, Music, MessageCircle } from 'lucide-react';
import { generatePlantResponse } from '../services/geminiService';
import { PlantDataPoint, ChatMessage } from '../types';

// Extend Window interface for Web Speech API & Serial API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
  interface Navigator {
    serial: any;
  }
}

interface DeviceMonitorProps {
  onSaveSession: (data: PlantDataPoint[]) => void;
}

// Initial dummy data for the chart
const INITIAL_DATA = Array(50).fill(0).map((_, i) => ({ time: i, val: 0 }));

// --- BIO SYNTH ENGINE (Web Audio API) ---
// Replicates the logic from plant_piano_with_sliders.py
class BioSynth {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  
  // Oscillators
  oscFund: OscillatorNode | null = null;
  oscH2: OscillatorNode | null = null; // 2nd Harmonic
  oscH3: OscillatorNode | null = null; // 3rd Harmonic
  oscSub: OscillatorNode | null = null; // Sub Bass

  // Gains for mixing
  gainFund: GainNode | null = null;
  gainH2: GainNode | null = null;
  gainH3: GainNode | null = null;
  gainSub: GainNode | null = null;

  // Params (Matched to Python script defaults)
  params = {
    fmin: 110,
    fmax: 660,
    ampMax: 0.5, // Increased slightly for visibility
    sensitivity: 1.6,
    deadzone: 2.5,
    glide: 0.1, // Time constant for smoothing
    harmonics: 0.10,
    subLevel: 0.18
  };

  constructor() {}

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContext();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0; // Start silent
    this.masterGain.connect(this.ctx.destination);

    // Create Nodes
    this.oscFund = this.ctx.createOscillator();
    this.oscH2 = this.ctx.createOscillator();
    this.oscH3 = this.ctx.createOscillator();
    this.oscSub = this.ctx.createOscillator();

    this.gainFund = this.ctx.createGain();
    this.gainH2 = this.ctx.createGain();
    this.gainH3 = this.ctx.createGain();
    this.gainSub = this.ctx.createGain();

    // Wiring
    this.oscFund.connect(this.gainFund).connect(this.masterGain);
    this.oscH2.connect(this.gainH2).connect(this.masterGain);
    this.oscH3.connect(this.gainH3).connect(this.masterGain);
    this.oscSub.connect(this.gainSub).connect(this.masterGain);

    // Start Oscillators
    const now = this.ctx.currentTime;
    [this.oscFund, this.oscH2, this.oscH3, this.oscSub].forEach(osc => osc?.start(now));
  }

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  suspend() {
    if (this.ctx?.state === 'running') this.ctx.suspend();
  }

  update(deviation: number) {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const p = this.params;

    // 1. Calculate Target Amplitude based on Deadzone
    let targetAmp = 0;
    if (Math.abs(deviation) > p.deadzone) {
      // Map deviation to amp (0.0 to 1.0)
      const scaled = deviation * 0.8; // Sensitivity
      const norm = Math.min(1.0, Math.max(0, scaled / 50)); // Assume 50 is "max" touch
      targetAmp = norm * p.ampMax;
    }

    // 2. Calculate Frequency
    // Map deviation to frequency range
    // Python: fmin + norm * (fmax - fmin)
    const freqNorm = Math.min(1.0, Math.max(0, deviation / 80)); // 80 is raw max range approx
    const targetFreq = p.fmin + freqNorm * (p.fmax - p.fmin);

    // 3. Apply updates with Glide (setTargetAtTime)
    const timeConstant = p.glide;

    // Update Master Volume
    this.masterGain.gain.setTargetAtTime(targetAmp, now, timeConstant);

    // Update Frequencies
    if (targetAmp > 0.001) { // Only update pitch if audible to save CPU/complexity
        this.oscFund?.frequency.setTargetAtTime(targetFreq, now, timeConstant);
        this.oscH2?.frequency.setTargetAtTime(targetFreq * 2, now, timeConstant);
        this.oscH3?.frequency.setTargetAtTime(targetFreq * 3, now, timeConstant);
        this.oscSub?.frequency.setTargetAtTime(targetFreq * 0.5, now, timeConstant);
    }

    // Mix Levels (Based on Python harmonics logic)
    const harmScale = p.harmonics;
    
    this.gainFund?.gain.setTargetAtTime(1.0, now, timeConstant);
    this.gainH2?.gain.setTargetAtTime(harmScale, now, timeConstant);
    this.gainH3?.gain.setTargetAtTime(harmScale * 0.6, now, timeConstant);
    this.gainSub?.gain.setTargetAtTime(p.subLevel, now, timeConstant);
  }
  
  destroy() {
     this.ctx?.close();
  }
}


const DeviceMonitor: React.FC<DeviceMonitorProps> = ({ onSaveSession }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [chartData, setChartData] = useState(INITIAL_DATA);
  
  // Hardware Connection State
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Simulation State
  const [isSimulationEnabled, setIsSimulationEnabled] = useState(false);

  // MODES: TALK (AI Voice) vs MUSIC (BioSynth)
  const [interactionMode, setInteractionMode] = useState<'TALK' | 'MUSIC'>('TALK');
  const synthRef = useRef<BioSynth | null>(null);

  // Arduino specific variables based on user code
  const [arduinoState, setArduinoState] = useState({
    topPoint: 0,
    interpolated: 0,
    baseline: 0, 
    value: 0
  });
  
  // High-performance Ref for buffering incoming serial data without re-renders
  const hardwareBufferRef = useRef({
    topPoint: 0,
    interpolated: 0,
    baseline: 0, 
    value: 0,     
    raw: 0        
  });

  const [sessionData, setSessionData] = useState<PlantDataPoint[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Serial Monitor State
  const [rawSerialBuffer, setRawSerialBuffer] = useState<string[]>([]);
  const [rxActive, setRxActive] = useState(false);
  
  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // Refs
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  
  // Logic simulation refs (used only if not connected)
  const simulatedPeakRef = useRef(55); 
  const isTouchingRef = useRef(false);
  const isRecordingRef = useRef(isRecording);
  const valueRef = useRef(0);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Initialize Synth
  useEffect(() => {
    synthRef.current = new BioSynth();
    return () => {
      synthRef.current?.destroy();
      synthRef.current = null;
    }
  }, []);

  // Handle Mode Switching
  useEffect(() => {
    if (interactionMode === 'MUSIC') {
      // Init and start the audio context if not already
      if (!synthRef.current?.ctx) synthRef.current?.init();
      synthRef.current?.resume();
      window.speechSynthesis.cancel(); // Stop speaking
    } else {
      // Suspend audio context to mute music
      synthRef.current?.suspend();
    }
  }, [interactionMode]);

  // Sync Hardware Buffer to UI State (Throttled)
  useEffect(() => {
    if (!isConnected && !isSimulationEnabled) return;
    
    const syncInterval = setInterval(() => {
      // Auto-Calibration Logic
      const currentRaw = hardwareBufferRef.current.raw;
      const currentBaseline = hardwareBufferRef.current.baseline;
      
      if (currentBaseline === 0 && currentRaw > 0) {
         hardwareBufferRef.current.baseline = currentRaw;
      } else if (currentRaw > 0) {
         const diff = Math.abs(currentRaw - currentBaseline);
         if (diff < 10) {
             hardwareBufferRef.current.baseline = currentBaseline * 0.99 + currentRaw * 0.01;
         }
      }

      // Calculate Deviation
      const deviation = Math.abs(currentRaw - hardwareBufferRef.current.baseline);
      hardwareBufferRef.current.value = Math.floor(deviation);

      // Update Synth ONLY if in MUSIC Mode
      if (interactionMode === 'MUSIC') {
        synthRef.current?.update(hardwareBufferRef.current.value);
      }

      setArduinoState({ 
          topPoint: hardwareBufferRef.current.topPoint,
          interpolated: hardwareBufferRef.current.interpolated,
          baseline: Math.floor(hardwareBufferRef.current.baseline),
          value: hardwareBufferRef.current.value
      });
      valueRef.current = hardwareBufferRef.current.value;
      
      setChartData(prev => {
         const newData = prev.length > 50 ? prev.slice(1) : prev;
         return [...newData, { time: timeRef.current++, val: hardwareBufferRef.current.raw }];
      });
    }, 33);

    return () => {
        clearInterval(syncInterval);
        synthRef.current?.update(0);
    };
  }, [isConnected, isSimulationEnabled, interactionMode]);

  // Trigger interactions
  useEffect(() => {
    const touchThreshold = 15; 
    const isTouch = valueRef.current > touchThreshold;
    
    if (isTouch && !isTouchingRef.current) {
        handleTouchStart();
    } else if (!isTouch && isTouchingRef.current) {
        handleTouchEnd();
    }
  }, [arduinoState.value]);

  // Load Voices with Cleanup
  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // TTS Logic
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    // Only speak if in TALK mode
    if (interactionMode !== 'TALK') return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 1.0; 
    utterance.rate = 0.9;  
    utterance.volume = 0.9; 
    const preferredVoice = voices.find(v => 
      v.name.includes('Google US English') || 
      v.name.includes('Microsoft Zira') || 
      v.name.includes('Samantha')
    );
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [voices, interactionMode]);

  // Interaction Logic
  const processInteraction = async (text: string, type: 'USER' | 'SYSTEM' | 'TOUCH', overrideValue?: number) => {
    if (isProcessing && type !== 'SYSTEM') return;
    setIsProcessing(true);

    const currentValue = overrideValue ?? valueRef.current;
    const normalizedIntensity = Math.min(100, Math.max(0, (currentValue / 50) * 100));

    if (type === 'USER') {
      const newUserMsg: ChatMessage = { role: 'user', text };
      setMessages(prev => [...prev, newUserMsg]);
      if (isRecordingRef.current) {
        setSessionData(prev => [...prev, {
          timestamp: Date.now(),
          capacitance: currentValue,
          sentiment: 'User Input',
          userMessage: text
        }]);
      }
    }

    try {
      const historyForService = messages.map(m => ({ role: m.role, text: m.text }));
      let prompt = text;
      if (type === 'SYSTEM') prompt = `[SYSTEM EVENT: ${text}]`;
      if (type === 'TOUCH') prompt = `[SENSORY INPUT: User touched the plant. Sensor Deviation: ${currentValue}]`;

      // Always generate response for the log/script
      const responseText = await generatePlantResponse(prompt, normalizedIntensity, historyForService);
      
      const newModelMsg: ChatMessage = { role: 'model', text: responseText };
      setMessages(prev => [...prev, newModelMsg]);
      
      // Only Speak if in TALK mode
      if (interactionMode === 'TALK') {
        speak(responseText);
      }

      if (isRecordingRef.current) {
        setSessionData(prev => [...prev, {
          timestamp: Date.now(),
          capacitance: currentValue,
          sentiment: 'Plant Response',
          plantResponse: responseText
        }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSession = () => {
    if (!isRecording) {
      setIsRecording(true);
      setMessages(prev => [...prev, { role: 'user', text: "Session Activated" }]);
      setTimeout(() => {
        processInteraction("The user has just activated the session. Wake up gently.", 'SYSTEM');
      }, 500);
      
      // Ensure Audio Context is resumed on user gesture (Start Session)
      if (interactionMode === 'MUSIC' && synthRef.current) {
         synthRef.current.init();
         synthRef.current.resume();
      }

    } else {
      setIsRecording(false);
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      if (isListening) toggleListening();
      
      if (interactionMode === 'MUSIC') {
         synthRef.current?.suspend();
      }
    }
  };

  // --- WEB SERIAL & PARSING LOGIC (ASCII) ---
  const connectSerial = async () => {
    if (!navigator.serial) {
      setConnectionError("Web Serial API not supported. Use Chrome.");
      return;
    }
    try {
      setConnectionError(null);
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      portRef.current = port;
      setIsConnected(true);
      setIsSimulationEnabled(false); 
      readSerialLoop(port);
    } catch (err: any) {
      if (err.name === 'NotFoundError') setConnectionError("No device selected.");
      else setConnectionError("Connection failed (Port busy?).");
    }
  };

  const readSerialLoop = async (port: any) => {
    const reader = port.readable.getReader();
    readerRef.current = reader;
    const decoder = new TextDecoder();
    let bufferString = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          const text = decoder.decode(value, { stream: true });
          bufferString += text;
          let lines = bufferString.split('\n');
          bufferString = lines.pop() || "";
          for (const line of lines) if(line.trim()) parseSerialLine(line.trim());
        }
      }
    } catch (error) {
      console.error("Read error", error);
    } finally {
      reader.releaseLock();
      setIsConnected(false);
    }
  };

  const parseSerialLine = (line: string) => {
     setRxActive(true);
     setTimeout(() => setRxActive(false), 100);
     setRawSerialBuffer(prev => {
         const n = [...prev, line];
         return n.length > 8 ? n.slice(n.length - 8) : n;
     });
     const match = line.match(/TOP:([\-0-9.]+),VAL:([\-0-9.]+),INT:([\-0-9.]+)/);
     if (match) {
        const rawInt = parseFloat(match[3]);
        hardwareBufferRef.current.topPoint = parseFloat(match[1]);
        hardwareBufferRef.current.interpolated = rawInt;
        hardwareBufferRef.current.raw = rawInt; 
     }
  };

  // --- SIMULATION ENGINE (Fallback) ---
  useEffect(() => {
    if (isConnected || !isSimulationEnabled) return;
    const update = () => {
      const targetPeak = isTouchingRef.current ? 85 : 55; 
      simulatedPeakRef.current = simulatedPeakRef.current + (targetPeak - simulatedPeakRef.current) * 0.1;
      const noise = (Math.random() - 0.5) * 2; 
      const currentPeak = simulatedPeakRef.current + noise;
      const interpolated = Math.round(currentPeak * 10); 
      hardwareBufferRef.current.topPoint = Math.round(currentPeak);
      hardwareBufferRef.current.interpolated = interpolated;
      hardwareBufferRef.current.raw = interpolated;
      hardwareBufferRef.current.baseline = 550;
      
      if (Math.random() > 0.8) {
         const val = Math.max(0, interpolated - 550);
         const simLine = `TOP:${Math.floor(currentPeak)},VAL:${Math.floor(val)},INT:${interpolated/10}`;
         setRawSerialBuffer(prev => {
             const n = [...prev, simLine];
             return n.length > 8 ? n.slice(n.length - 8) : n;
         });
      }
      animationRef.current = requestAnimationFrame(update);
    };
    animationRef.current = requestAnimationFrame(update);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isConnected, isSimulationEnabled]);

  // Interaction Handlers
  const handleTouchStart = () => {
    isTouchingRef.current = true;
    if (isRecordingRef.current && !isProcessing) {
       setTimeout(() => {
         if (isTouchingRef.current) processInteraction("Touch", 'TOUCH', valueRef.current);
       }, 500);
    }
  };

  const handleTouchEnd = () => isTouchingRef.current = false;

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    processInteraction(text, 'USER');
  };

  const toggleListening = () => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      alert("Voice input not supported. Use Chrome.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.interimResults = false;
        recognitionRef.current.maxAlternatives = 1;
    }
    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) processInteraction(transcript, 'USER'); 
    };
    try { recognitionRef.current.start(); } catch (e) { console.error(e); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      
      {/* LEFT: Hardware Visualizer */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="bg-slate-900/50 border border-brand-accent/20 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md shadow-xl min-h-[320px]">
          
          {/* Top Bar */}
          <div className="flex justify-between items-center mb-4 relative z-10">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-accent" />
              <h2 className="text-lg font-mono text-brand-accent tracking-wider">CAPACITANCE SENSOR</h2>
            </div>
            <div className="flex items-center gap-3">
               {connectionError && (
                 <div className="flex items-center gap-1 text-xs text-red-400 font-mono bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                   <AlertCircle className="w-3 h-3" />
                   {connectionError}
                 </div>
               )}
               <button 
                 onClick={connectSerial}
                 disabled={isConnected}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono font-bold border transition-all cursor-pointer ${isConnected ? 'bg-brand-green/10 text-brand-green border-brand-green' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}
               >
                  {isConnected ? <Wifi className="w-3 h-3" /> : <Usb className="w-3 h-3" />}
                  {isConnected ? "CONNECTED" : "CONNECT DEVICE"}
               </button>
            </div>
          </div>
          
          {/* Graph */}
          <div className="h-64 w-full relative z-0">
             <div className="absolute top-0 left-0 z-10 text-[10px] font-mono text-slate-500 space-y-1 bg-slate-900/80 p-2 rounded border border-slate-800 pointer-events-none">
                <div>RAW_INT: <span className="text-brand-accent">{arduinoState.interpolated.toFixed(2)}</span></div>
                <div>BASELINE: <span className="text-slate-300">{arduinoState.baseline}</span></div>
                <div>MODE: <span className={interactionMode === 'MUSIC' ? 'text-brand-pink' : 'text-brand-accent'}>{interactionMode}</span></div>
             </div>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <YAxis domain={['auto', 'auto']} hide />
                <XAxis hide />
                <Tooltip 
                  contentStyle={{backgroundColor: '#1e293b', borderColor: '#334155'}} 
                  labelStyle={{display: 'none'}}
                  formatter={(value: number) => [`${value}`, 'Raw Value']}
                />
                <Line 
                  type="monotone" 
                  dataKey="val" 
                  stroke={arduinoState.value > 15 ? '#FFC0CB' : '#38BDF8'} 
                  strokeWidth={2} 
                  dot={false}
                  isAnimationActive={false} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Live Value */}
          <div className="absolute top-20 right-6 text-right pointer-events-none z-0">
             <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                LIVE DEVIATION
             </div>
             <div className={`text-4xl font-mono font-bold transition-colors ${arduinoState.value > 15 ? 'text-brand-pink drop-shadow-[0_0_10px_rgba(255,192,203,0.5)]' : 'text-white'}`}>
               {arduinoState.value}
             </div>
          </div>

          {/* Touch Status */}
          <div className="absolute bottom-4 right-4 left-4 h-20 rounded-xl border border-dashed border-slate-700 flex items-center justify-center pointer-events-none">
            <div className="text-center flex flex-col items-center">
              <Leaf className={`w-6 h-6 mb-1 transition-colors ${arduinoState.value > 15 ? 'text-brand-pink' : 'text-slate-500'}`} />
              <span className="text-[10px] font-mono text-slate-400">
                {arduinoState.value > 15 ? "INTERACTION DETECTED" : "WAITING FOR TOUCH"}
              </span>
            </div>
          </div>
        </div>

        {/* Serial & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                   <Cpu className="w-4 h-4 text-brand-green" />
                   <span className="font-mono text-xs font-bold text-white">DEVICE STATE</span>
                </div>
                {!isConnected && (
                   <button 
                     onClick={() => setIsSimulationEnabled(!isSimulationEnabled)}
                     className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-white"
                   >
                     {isSimulationEnabled ? <ToggleRight className="w-4 h-4 text-brand-pink" /> : <ToggleLeft className="w-4 h-4" />}
                     TEST MODE
                   </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                 <div className="text-slate-400">Connection:</div> 
                 <div className={`text-right ${isConnected ? 'text-brand-green' : 'text-slate-500'}`}>{isConnected ? 'USB SERIAL' : 'OFFLINE'}</div>
                 <div className="text-slate-400">Peak Lock:</div> 
                 <div className={`text-right ${arduinoState.value > 15 ? 'text-brand-pink' : 'text-brand-green'}`}>{arduinoState.value > 15 ? 'LOCKED' : 'SCANNING'}</div>
              </div>
           </div>

           <div className="bg-black p-4 rounded-xl border border-slate-800 font-mono text-[10px] relative overflow-hidden h-32 flex flex-col">
              <div className="flex items-center gap-2 text-slate-500 mb-2 z-10 bg-black/80 w-full justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3 h-3" />
                  <span>SERIAL MONITOR</span>
                </div>
                <div className={`w-2 h-2 rounded-full ${rxActive ? 'bg-brand-green' : 'bg-slate-700'}`}></div>
              </div>
              <div className="flex-1 overflow-hidden text-brand-green/70 leading-none opacity-70">
                 {rawSerialBuffer.map((line, i) => (
                   <span key={i} className="block border-b border-white/5 py-0.5">{line}</span>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* RIGHT: Chat / Interaction Interface */}
      <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl h-[600px] lg:h-auto relative">
        
        {/* Mode Switch Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/50">
           <div className="flex justify-between items-center mb-3">
              <h3 className="font-mono font-bold text-white flex items-center gap-2">
                PLANT INTERFACE
              </h3>
              
              <button 
                onClick={toggleSession}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1 transition-all ${
                isRecording 
                ? 'bg-red-500/10 text-red-400 border-red-500/50' 
                : 'bg-brand-green/10 text-brand-green border-brand-green/50'
                }`}
              >
                {isRecording ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {isRecording ? 'END SESSION' : 'START SESSION'}
              </button>
           </div>

           {/* Toggle Switch */}
           <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                 onClick={() => setInteractionMode('TALK')}
                 className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold transition-all ${interactionMode === 'TALK' ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                 <MessageCircle className="w-3 h-3" />
                 TALK MODE
              </button>
              <button
                 onClick={() => setInteractionMode('MUSIC')}
                 className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold transition-all ${interactionMode === 'MUSIC' ? 'bg-brand-pink text-brand-blue shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                 <Music className="w-3 h-3" />
                 MUSIC MODE
              </button>
           </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
           {/* Mint Button if Data exists */}
           {sessionData.length > 0 && (
              <button 
                onClick={() => onSaveSession(sessionData)}
                className="w-full py-2 mb-2 bg-brand-accent/10 text-brand-accent font-mono text-xs border border-brand-accent/20 rounded-lg hover:bg-brand-accent hover:text-brand-blue flex items-center justify-center gap-2"
              >
                <Save className="w-3 h-3" />
                MINT SESSION DATA TO WALRUS
              </button>
           )}
           
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
              {interactionMode === 'MUSIC' ? <Music className="w-12 h-12 mb-2 animate-pulse" /> : <Leaf className="w-12 h-12 mb-2" />}
              <p className="text-sm font-mono text-center">
                {interactionMode === 'MUSIC' ? "Touch plant to play music." : "Touch plant to chat."}
              </p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-brand-blue border border-slate-600 text-white rounded-tr-none' 
                  : 'bg-slate-800 border border-brand-pink/20 text-slate-200 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-950/50 border-t border-slate-800">
          {interactionMode === 'TALK' ? (
             <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={isListening ? "Listening..." : "Type message..."}
                  disabled={!isRecording || isListening}
                  className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none text-sm"
                />
                <button 
                  onClick={toggleListening}
                  disabled={!isRecording}
                  className={`p-2 rounded-lg transition-all border disabled:opacity-50 ${
                    isListening 
                    ? 'bg-red-500 text-white border-red-400 animate-pulse' 
                    : 'bg-slate-800 text-brand-pink border-slate-700'
                  }`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                {!isListening && (
                  <button onClick={handleSendMessage} disabled={!isRecording || !inputText.trim()} className="p-2 bg-brand-pink text-brand-blue rounded-lg">
                    <Send className="w-5 h-5" />
                  </button>
                )}
             </div>
          ) : (
             <div className="flex items-center justify-center text-brand-pink font-mono text-xs gap-2 py-2">
                <Music className="w-4 h-4 animate-bounce" />
                Bio-Sonification Active
             </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default DeviceMonitor;

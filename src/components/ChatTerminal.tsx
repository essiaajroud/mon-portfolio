import React, { useState, useEffect, useRef } from 'react';
import { Send, Terminal, Loader2, Mic, MicOff, Volume2, VolumeX, X, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';
import { sendMessageToAI } from '../services/geminiService';

interface ChatTerminalProps {
  lang: 'en' | 'fr';
  isSoundOn: boolean;
  onClose: () => void;
}

const ChatTerminal: React.FC<ChatTerminalProps> = ({ lang, isSoundOn, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize welcome message based on language
  useEffect(() => {
    setMessages([
      {
        id: 'init',
        role: 'model',
        text: lang === 'fr' 
          ? "Connexion établie. Assistant vocal IA en ligne. Cliquez sur le micro pour me parler ou tapez votre message."
          : "Connection established. AI Voice Assistant online. Click the microphone to speak with me or type your message.",
        timestamp: new Date()
      }
    ]);
  }, [lang]);

  // Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      
      // Update language when prop changes
      rec.lang = lang === 'fr' ? 'fr-FR' : 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          setInput(transcript);
          handleSend(transcript);
        }
      };

      recognitionRef.current = rec;
    } else {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [lang]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Handle Speech Synthesis (speaking AI text)
  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Strip markdown formatting and code snippets for clean natural speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, lang === 'fr' ? '[Code ignoré pour la lecture]' : '[Code skipped for reading]') // skip big code blocks
      .replace(/[*#`_\-]/g, '') // strip md symbols
      .replace(/\[.*?\]\(.*?\)/g, '') // strip markdown links
      .replace(/https?:\/\/\S+/g, ''); // strip web links

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang === 'fr' ? 'fr-FR' : 'en-US';

    // Find custom high-quality voice if possible
    const voices = window.speechSynthesis.getVoices();
    const voiceLang = lang === 'fr' ? 'fr' : 'en';
    const voice = voices.find(v => v.lang.startsWith(voiceLang));
    if (voice) {
      utterance.voice = voice;
    }

    window.speechSynthesis.speak(utterance);
  };

  // Cancel reading on unmount or when component shuts
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Stop speaking if sound gets muted
  useEffect(() => {
    if (!isSoundOn && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [isSoundOn]);

  const handleSend = async (textToSend: string) => {
    const finalMsg = textToSend || input;
    if (!finalMsg.trim() || loading) return;

    // Stop speaking if user interrupts with new query
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: finalMsg,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Send to AI service
      const responseText = await sendMessageToAI(finalMsg);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);
      setLoading(false);

      // Pronounce response if audio is toggled ON
      if (isSoundOn) {
        speakText(responseText);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // Cancel speech before listening
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  return (
    <div id="ai-voice-terminal" className="w-full h-full flex flex-col bg-slate-950/95 border border-cyan-500/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.25)] font-mono backdrop-blur-2xl">
      {/* Terminal Header */}
      <div className="bg-slate-900/90 p-4 border-b border-cyan-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-cyan-400">
          <Sparkles size={18} className="animate-pulse" />
          <span className="text-xs font-black tracking-widest uppercase">
            {lang === 'fr' ? "CORE_ASSISTANT // V.3" : "CORE_ASSISTANT // V.3"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Sound Mode Status */}
          <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1.5 uppercase">
            <span className={`w-1.5 h-1.5 rounded-full ${isSoundOn ? 'bg-green-500 animate-ping' : 'bg-red-500'}`}></span>
            {isSoundOn ? (lang === 'fr' ? 'Vocale Active' : 'Voice On') : (lang === 'fr' ? 'Muet' : 'Muted')}
          </span>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all"
            title={lang === 'fr' ? "Fermer" : "Close"}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed transition-all duration-300 ${
                msg.role === 'user' 
                  ? 'bg-cyan-900/20 border border-cyan-500/40 text-cyan-100 rounded-tr-none shadow-[0_0_15px_rgba(6,182,212,0.05)]' 
                  : 'bg-slate-900/60 border border-slate-800 text-slate-200 rounded-tl-none'
              }`}
            >
              <div className="text-[9px] opacity-40 mb-1 uppercase tracking-wider font-black flex justify-between items-center gap-4">
                <span>{msg.role === 'user' ? 'USER_VOICE' : 'NEURAL_SPEECH'}</span>
                {msg.role === 'model' && isSoundOn && (
                  <button 
                    onClick={() => speakText(msg.text)}
                    className="p-1 hover:bg-slate-800 rounded text-cyan-400 transition-all"
                    title={lang === 'fr' ? "Réécouter" : "Listen again"}
                  >
                    <Volume2 size={10} />
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-2 text-xs">
               <Loader2 className="animate-spin text-cyan-400" size={14} />
               <span className="text-slate-400">{lang === 'fr' ? "Calcul de la réponse..." : "Computing connection..."}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Info Bar for Speech Recognition status */}
      {isListening && (
        <div className="px-4 py-1.5 bg-cyan-950/30 border-t border-cyan-500/10 text-[9px] text-cyan-400 flex items-center gap-2 animate-pulse">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></div>
          <span>{lang === 'fr' ? "Microphone actif : Parlez maintenant..." : "Microphone active: Speak now..."}</span>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-slate-900/90 border-t border-cyan-500/20">
        <div className="flex gap-2.5 items-center">
          {/* Speech-To-Text Button */}
          {speechSupported ? (
            <button
              onClick={toggleListening}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-center relative ${
                isListening
                  ? 'bg-red-950/40 border-red-500 text-red-400 animate-pulse'
                  : 'bg-slate-950 hover:bg-slate-800 border-cyan-500/30 text-cyan-400 hover:text-cyan-300'
              }`}
              title={isListening ? (lang === 'fr' ? "Arrêter d'écouter" : "Stop listening") : (lang === 'fr' ? "Parler (Micro)" : "Speak (Microphone)")}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              {isListening && (
                <div className="absolute -inset-1 rounded-xl border border-red-500/30 animate-ping opacity-60"></div>
              )}
            </button>
          ) : (
            <button
              disabled
              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-600 cursor-not-allowed"
              title={lang === 'fr' ? "Micro non supporté" : "Mic not supported"}
            >
              <MicOff size={16} />
            </button>
          )}

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend('')}
            placeholder={isListening ? (lang === 'fr' ? "Écoute en cours..." : "Listening...") : (lang === 'fr' ? "Posez votre question..." : "Ask your question...")}
            className="flex-1 bg-slate-950 border border-cyan-500/20 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 font-mono outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(6,182,212,0.1)] transition-all"
            disabled={isListening}
          />

          <button 
            onClick={() => handleSend('')}
            disabled={loading || !input.trim() || isListening}
            className="p-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 rounded-xl text-slate-950 transition-all font-black flex items-center justify-center shadow-lg shadow-cyan-500/20"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatTerminal;

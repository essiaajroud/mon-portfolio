
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Github, 
  Linkedin, 
  Mail, 
  X,
  Award,
  Globe,
  Download,
  FileText,
  Volume2,
  VolumeX,
  Phone,
  Briefcase,
  ExternalLink
} from 'lucide-react';

import NeuralBackground from './components/NeuralBackground';
import AdminPanel from './components/AdminPanel';
import { 
  getNavConfig, 
  getTitles, 
  INITIAL_DATA
} from './constants';
import { SectionId, PortfolioData } from './types';

import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const TypewriterText = ({ text, delay = 0, className = "" }: { text: string, delay?: number, className?: string }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    setDisplayedText(""); 
    setShowCursor(false);
    const startTimeout = setTimeout(() => {
      setShowCursor(true);
      let index = 0;
      const intervalId = setInterval(() => {
        setDisplayedText(text.slice(0, index + 1));
        index++;
        if (index >= text.length) clearInterval(intervalId);
      }, 80);
      return () => clearInterval(intervalId);
    }, delay);
    return () => clearTimeout(startTimeout);
  }, [text, delay]);

  return (
    <span className={className}>
      {displayedText}
      {showCursor && <span className="animate-pulse ml-1 inline-block w-1 h-[1em] bg-cyan-500 align-middle"></span>}
    </span>
  );
};


const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const [rotation, setRotation] = useState(0);
  const [lang, setLang] = useState<'en' | 'fr'>('en');
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [selectedProjectCategory, setSelectedProjectCategory] = useState<string>('ALL');
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const clickCountRef = useRef(0);
  const clickTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const checkAdmin = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const isSecretParam = urlParams.get('vault') === 'neural' || urlParams.get('key') === 'neural';
      const isHashSecret = window.location.hash === '#vault';
      
      if (isSecretParam || isHashSecret) {
        setIsAdminRoute(true);
      } else if (window.location.pathname === '/admin') {
        // Concealment: silently redirect /admin to / so scanners/outsiders see normal portfolio
        window.history.replaceState({}, '', '/');
        setIsAdminRoute(false);
      }
    };
    checkAdmin();
    window.addEventListener('popstate', checkAdmin);
    return () => window.removeEventListener('popstate', checkAdmin);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Stealth combination: Ctrl + Shift + Alt + A or Cmd + Shift + Alt + A
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.altKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setIsAdminRoute(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAvatarClick = () => {
    clickCountRef.current += 1;
    if (clickCountRef.current >= 4) {
      clickCountRef.current = 0;
      setIsAdminRoute(true);
      return;
    }
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 1200);
  };

  const speak = React.useCallback((text: string) => {
    if (isAdminRoute || !isSoundOn || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'fr' ? 'fr-FR' : 'en-US';
    window.speechSynthesis.speak(utterance);
  }, [isAdminRoute, isSoundOn, lang]);

  useEffect(() => {
    if (!isLoading && portfolioData) {
      const welcomeMsg = lang === 'en' ? "Welcome to my portfolio" : "Bienvenue sur mon portfolio";
      const timeoutId = setTimeout(() => {
        speak(welcomeMsg);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [lang, isLoading, portfolioData, isSoundOn, speak]);

  useEffect(() => {
    // Read from local storage first for instantaneous offline load
    try {
      const cached = localStorage.getItem('portfolio_data_cache');
      if (cached) {
        setPortfolioData(JSON.parse(cached));
        setIsLoading(false);
      }
    } catch (e) {
      console.warn("Could not read local portfolio cache", e);
    }

    // Listen for portfolio data changes from Firestore
    try {
      const portfolioDocRef = doc(db, 'config', 'portfolio');
      const unsubscribeData = onSnapshot(portfolioDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const freshData = snapshot.data() as PortfolioData;
          setPortfolioData(freshData);
          try {
            localStorage.setItem('portfolio_data_cache', JSON.stringify(freshData));
          } catch {}
          setIsLoading(false);
        } else {
          setPortfolioData(prev => prev || INITIAL_DATA);
          setIsLoading(false);
        }
      }, (error) => {
        console.warn("Firestore onSnapshot error:", error);
        setPortfolioData(prev => prev || INITIAL_DATA);
        setIsLoading(false);
      });

      return () => {
        unsubscribeData();
      };
    } catch (err) {
      console.warn("Firestore doc initialization error:", err);
      setPortfolioData(prev => prev || INITIAL_DATA);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  useEffect(() => {
    if (activeSection !== null) return;
    const interval = setInterval(() => setRotation(r => (r + 0.1) % 360), 50);
    return () => clearInterval(interval);
  }, [activeSection]);

  if (isLoading || !portfolioData) {
    const isFr = typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('fr');
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-mono p-4 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 6 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-2 mb-6"
        >
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-cyan-400 text-sm font-bold tracking-[0.22em] uppercase">
              {isFr ? "Chargement du Portfolio" : "Loading Portfolio"}
            </span>
          </div>
          <span className="text-slate-400 text-xs tracking-wider uppercase">
            Essia Ajroud • AI & Data Engineering
          </span>
        </motion.div>
        <div className="w-64 h-1 bg-slate-900 rounded-full overflow-hidden border border-cyan-500/20">
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: "100%" }} 
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="h-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,1)]"
          />
        </div>
      </div>
    );
  }

  const navItems = getNavConfig(lang);
  const titles = getTitles(lang);
  const currentTitle = lang === 'en' ? portfolioData.identity.titles.en : portfolioData.identity.titles.fr;

  if (isAdminRoute) {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-950 text-slate-200">
        <NeuralBackground />
        <AdminPanel 
          data={portfolioData} 
          onUpdate={(d) => { setPortfolioData(d); }} 
          onClose={() => {
            setIsAdminRoute(false);
            window.history.pushState({}, '', '/');
          }} 
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-transparent text-slate-200">
      <NeuralBackground />
      
      <div className="fixed top-4 right-4 z-50">
        <button 
          onClick={() => setLang(l => l === 'en' ? 'fr' : 'en')} 
          className="px-4 py-1.5 bg-slate-900/80 border border-cyan-500/30 rounded-full text-cyan-400 font-mono text-xs backdrop-blur-sm hover:border-cyan-400 transition-all"
          onMouseEnter={() => speak(lang === 'en' ? 'Switch language' : 'Changer la langue')}
        >
          <Globe size={12} className="inline mr-2" />
          {lang.toUpperCase()}
        </button>
      </div>
      
      <div className="fixed bottom-16 right-4 z-[60]">
        <button 
          onClick={() => setIsSoundOn(!isSoundOn)} 
          className={`p-3 rounded-full border shadow-xl transition-all ${isSoundOn ? 'bg-cyan-900/50 border-cyan-400 text-cyan-400' : 'bg-slate-900/80 border-slate-700 text-slate-500'}`} 
          title={lang === 'fr' ? "Activer/Désactiver le son" : "Toggle Sound"}
        >
          {isSoundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>



      <div className="relative w-full h-full flex flex-col items-center justify-center z-10 p-4">
        <AnimatePresence>
          {!activeSection && (
            <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="z-20 text-center mb-8 pointer-events-none">
              <h1 
                className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tighter pointer-events-auto cursor-pointer select-none"
                onClick={() => speak(lang === 'en' ? "Welcome to my portfolio" : "Bienvenue sur mon portfolio")}
                onMouseEnter={() => speak(lang === 'en' ? "Welcome to my portfolio" : "Bienvenue sur mon portfolio")}
                title={lang === 'en' ? "Welcome to my portfolio" : "Bienvenue sur mon portfolio"}
              >
                <TypewriterText text={titles.welcome} />
                <span className="text-cyan-500 ml-2"><TypewriterText text={titles.portfolio} delay={1500} /></span>
              </h1>
              <div className="flex items-center justify-center gap-3 text-slate-300 font-mono text-xs md:text-sm pointer-events-auto">
                <span className="text-cyan-400 font-bold tracking-widest uppercase flex items-center gap-1.5">
                  {portfolioData.identity.name}
                </span>
                <span className="text-slate-700">|</span>
                <span className="opacity-80 uppercase tracking-wide">{currentTitle}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div 
          className={`relative flex items-center justify-center transition-all duration-700 ease-out ${
            activeSection 
              ? 'scale-[0.75] md:scale-[0.88] lg:scale-[0.95] xl:scale-100 md:translate-x-[-22vw] lg:translate-x-[-24vw] xl:translate-x-[-26vw]' 
              : 'scale-100'
          }`}
          style={{ width: '380px', height: '380px' }}
        >
          <div className="absolute inset-0 rounded-full border border-cyan-500/5 animate-[spin_30s_linear_infinite]"></div>
          <div 
            className="relative w-36 h-36 md:w-40 md:h-40 z-20 group cursor-pointer" 
            onClick={() => {
              setActiveSection(null);
              handleAvatarClick();
            }}
            onMouseEnter={() => speak("Essia Ajroud")}
            title={activeSection ? (lang === 'fr' ? 'Fermer et centrer' : 'Close and center') : portfolioData.identity.name}
          >
             <div className="relative w-full h-full rounded-full overflow-hidden border-[3px] border-cyan-500/50 bg-slate-900 shadow-[0_0_40px_rgba(6,182,212,0.15)] group-hover:shadow-[0_0_50px_rgba(6,182,212,0.3)] transition-all duration-500">
                <img 
                  src={portfolioData.media.profileImage || "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400"} 
                  alt={portfolioData.identity.name} 
                  className="w-full h-full object-cover opacity-90 transition-opacity" 
                  referrerPolicy="no-referrer"
                />
             </div>
          </div>

          {navItems.map((item) => {
            const angleRad = ((item.angle + rotation) * Math.PI) / 180;
            const radius = 135; 
            const x = Math.cos(angleRad) * radius;
            const y = Math.sin(angleRad) * radius;
            return (
              <motion.button 
                key={item.id} 
                className={`absolute w-14 h-14 rounded-full flex items-center justify-center border transition-all duration-500 z-30 shadow-md ${
                  activeSection === item.id 
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 scale-110 shadow-cyan-500/40 ring-4 ring-cyan-500/20' 
                    : 'bg-slate-900/90 text-cyan-400 border-cyan-500/20 hover:border-cyan-400 hover:scale-105'
                }`}
                style={{ transform: `translate(${x}px, ${y}px)` }} 
                onClick={() => setActiveSection(activeSection === item.id ? null : item.id)} 
                onMouseEnter={() => speak(item.label)}
                title={item.label}
              >
                <item.icon size={22} />
              </motion.button>
            );
          })}
        </div>
        
        <AnimatePresence>
          {activeSection && (
             <motion.div 
               initial={{ opacity: 0, x: 20 }} 
               animate={{ opacity: 1, x: 0 }} 
               exit={{ opacity: 0, x: 20 }}
               className="fixed left-4 right-4 md:left-auto md:right-6 lg:right-10 xl:right-14 top-16 md:top-20 w-auto md:w-[480px] lg:w-[540px] xl:w-[600px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-8rem)] md:max-h-[calc(100vh-9rem)] overflow-y-auto bg-slate-900/95 p-6 md:p-8 rounded-3xl border border-cyan-500/20 backdrop-blur-2xl z-50 scrollbar-thin shadow-[0_0_60px_rgba(0,0,0,0.6)]"
             >
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                      <div className="p-2 bg-cyan-950/30 rounded-lg border border-cyan-500/30">
                        {React.createElement(navItems.find(n => n.id === activeSection)?.icon || Briefcase, { size: 24, className: "text-cyan-400" })}
                      </div>
                      {navItems.find(n => n.id === activeSection)?.label}
                   </h2>
                   <button onClick={() => setActiveSection(null)} className="p-2 bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"><X size={20}/></button>
                </div>
                
                {activeSection === SectionId.ABOUT && (
                  <div className="space-y-8">
                    <div className="text-slate-300 leading-relaxed font-mono text-sm whitespace-pre-wrap">{portfolioData.about[lang]}</div>
                    <div className="pt-4 border-t border-slate-800/50">
                       <h3 className="text-cyan-400 font-bold text-xs uppercase tracking-widest mb-4 inline-block px-2 py-1 bg-cyan-900/20 rounded">
                         {lang === 'en' ? 'Technical_Expertise' : 'Expertise_Technique'}
                       </h3>
                       <div className="space-y-6">
                         {(() => {
                           const allCats = Array.from(
                             new Set(portfolioData.skills.map(s => s.category?.trim() || 'Other'))
                           );
                           return allCats.map(cat => {
                             const filteredSkills = portfolioData.skills.filter(s => (s.category?.trim() || 'Other') === cat);
                             if (filteredSkills.length === 0) return null;

                             let categoryLabel = cat;
                             if (cat.toLowerCase() === 'core') categoryLabel = lang === 'en' ? 'Core Skills' : 'Compétences Clés';
                             else if (cat.toLowerCase() === 'frameworks') categoryLabel = 'Frameworks & Libraries';
                             else if (cat.toLowerCase() === 'tools') categoryLabel = lang === 'en' ? 'Tools & Platforms' : 'Outils & Plateformes';

                             return (
                               <div key={cat} className="space-y-2">
                                 <h4 className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                                   <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                                   {categoryLabel}
                                 </h4>
                                 <div className="flex flex-wrap gap-2">
                                   {filteredSkills.map(skill => (
                                     <span 
                                       key={skill.name} 
                                       className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 hover:border-cyan-500/30 text-xs text-slate-300 rounded-xl transition-all cursor-pointer font-mono"
                                     >
                                       {skill.name}
                                     </span>
                                   ))}
                                 </div>
                               </div>
                             );
                           });
                         })()}
                       </div>
                    </div>
                  </div>
                )}
                
                {activeSection === SectionId.PROJECTS && (() => {
                  const projectList = portfolioData.projects[lang] || [];
                  const projectCategories = Array.from(
                    new Set(projectList.map(p => p.category?.trim()).filter(Boolean))
                  );
                  const filteredProjects = selectedProjectCategory === 'ALL'
                    ? projectList
                    : projectList.filter(p => p.category?.trim() === selectedProjectCategory);

                  return (
                    <div className="space-y-5">
                      {/* Filter by Category */}
                      {projectCategories.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-800/60">
                          <button
                            onClick={() => setSelectedProjectCategory('ALL')}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                              selectedProjectCategory === 'ALL'
                                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/30'
                                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                          >
                            {lang === 'en' ? 'All' : 'Tous'} ({projectList.length})
                          </button>
                          {projectCategories.map(cat => (
                            <button
                              key={cat}
                              onClick={() => setSelectedProjectCategory(cat)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                                selectedProjectCategory === cat
                                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/30'
                                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Projects List */}
                      {filteredProjects.map(project => (
                        <div 
                          key={project.id} 
                          className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-cyan-500/30 transition-all cursor-pointer group"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h3 className="text-cyan-400 font-bold group-hover:text-cyan-300 transition-colors">{project.title}</h3>
                            {project.category && (
                              <span className="shrink-0 px-2 py-0.5 bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 rounded text-[10px] uppercase font-mono tracking-wider">
                                {project.category}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-300 text-xs mb-3 leading-relaxed">{project.description}</p>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-1.5">
                              {project.techStack.map(tech => (
                                <span key={tech} className="px-2 py-0.5 bg-cyan-900/30 text-cyan-400 border border-cyan-500/20 rounded text-[10px] uppercase font-mono">{tech}</span>
                              ))}
                            </div>
                            <div className="flex items-center gap-3">
                              {project.githubUrl && (
                                <a 
                                  href={project.githubUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-slate-400 hover:text-cyan-400 transition-colors p-1" 
                                  title="Source Code"
                                >
                                  <Github size={14} />
                                </a>
                              )}
                              {project.demoUrl && (
                                <a 
                                  href={project.demoUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-slate-400 hover:text-cyan-400 transition-colors p-1" 
                                  title="Demo"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {activeSection === SectionId.EXPERIENCE && (
                   <div className="space-y-6">
                    {portfolioData.experiences[lang].map(exp => (
                      <div 
                        key={exp.id} 
                        className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-cyan-500/30 transition-all cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-cyan-400 font-bold">{exp.role}</h3>
                          <span className="text-[10px] text-slate-500 font-mono">{exp.period}</span>
                        </div>
                        <p className="text-white text-xs mb-2 font-mono">{exp.company}</p>
                        <p className="text-slate-400 text-xs">{exp.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeSection === SectionId.CERTIFICATIONS && (
                  <div className="space-y-4">
                    {portfolioData.certifications[lang].map(cert => (
                      <div 
                        key={cert.id} 
                        className="flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-cyan-500/30 transition-all cursor-pointer"
                      >
                        <Award className="text-cyan-400 shrink-0" size={32} />
                        <div>
                          <h3 className="text-white font-bold text-sm">{cert.name}</h3>
                          <p className="text-slate-500 text-xs">{cert.issuer} • {cert.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeSection === SectionId.CONTACT && (
                  <div className="space-y-6">
                    <p className="text-slate-400 text-sm font-mono">{"// ESTABLISHING_COMMS_CHANNEL..."}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <a 
                        href={`mailto:${portfolioData.socials.email}`} 
                        className="flex items-center gap-3 p-4 bg-slate-800/30 hover:bg-cyan-900/20 border border-slate-700 hover:border-cyan-500/50 rounded-xl transition-all"
                      >
                        <Mail className="text-cyan-400" size={20} />
                        <span className="text-xs text-slate-300 truncate">{portfolioData.socials.email}</span>
                      </a>
                      <a 
                        href={portfolioData.socials.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-3 p-4 bg-slate-800/30 hover:bg-cyan-900/20 border border-slate-700 hover:border-cyan-500/50 rounded-xl transition-all"
                      >
                        <Linkedin className="text-cyan-400" size={20} />
                        <span className="text-xs text-slate-300">LinkedIn Profile</span>
                      </a>
                      <a 
                        href={portfolioData.socials.github} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-3 p-4 bg-slate-800/30 hover:bg-cyan-900/20 border border-slate-700 hover:border-cyan-500/50 rounded-xl transition-all"
                      >
                        <Github className="text-cyan-400" size={20} />
                        <span className="text-xs text-slate-300">GitHub Lab</span>
                      </a>
                      <div 
                        className="flex items-center gap-3 p-4 bg-slate-800/30 border border-slate-700 rounded-xl hover:border-cyan-500/30 transition-all cursor-pointer"
                      >
                        <Phone className="text-cyan-400" size={20} />
                        <span className="text-xs text-slate-300">{portfolioData.socials.phone}</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === SectionId.HOME && (
                  <div className="space-y-6 text-center">
                    <div 
                      className="w-20 h-20 bg-cyan-900/20 rounded-full flex items-center justify-center mx-auto border border-cyan-500/30 hover:border-cyan-500/50 transition-all cursor-pointer"
                      onMouseEnter={() => speak(lang === 'en' ? 'Curriculum Vitae' : 'Curriculum Vitae')}
                    >
                      <FileText size={40} className="text-cyan-400" />
                    </div>
                    <h3 className="text-white font-bold">{lang === 'en' ? 'Curriculum Vitae' : 'Curriculum Vitae'}</h3>
                    <p className="text-slate-400 text-xs font-mono">
                      {lang === 'en' ? 'PDF format • Direct download' : 'Format PDF • Téléchargement direct'}
                    </p>
                    <a 
                      href={lang === 'en' ? portfolioData.resume.en : portfolioData.resume.fr} 
                      download
                      className="inline-flex items-center gap-2 px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black rounded-xl transition-all group shadow-lg shadow-cyan-500/20"
                      onMouseEnter={() => speak(titles.download)}
                    >
                      <Download size={18} />
                      {titles.download}
                    </a>
                  </div>
                )}
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="fixed bottom-0 left-0 w-full py-2.5 px-4 md:px-8 bg-slate-950/90 backdrop-blur-md border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-slate-400 z-50">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-slate-200 font-semibold">
            © {new Date().getFullYear()} {portfolioData.identity.name || "Essia Ajroud"}
          </span>
          <span className="text-slate-700">•</span>
          <span className="text-slate-400 text-[10px]">
            {lang === 'fr' ? 'Tous droits réservés' : 'All rights reserved'}
          </span>
        </div>

        <div className="flex items-center gap-4 text-[10px]">
          <a 
            href={`mailto:${portfolioData.socials.email}`} 
            className="hover:text-cyan-400 transition-colors tracking-wide text-slate-300"
          >
            {portfolioData.socials.email}
          </a>
          <span className="text-slate-700">|</span>
          <span className="text-cyan-500/90 tracking-wide font-medium">
            ESPRIT Engineering
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;

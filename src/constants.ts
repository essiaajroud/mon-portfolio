
import { SectionId, PortfolioData } from './types';
import { 
  BrainCircuit, 
  GraduationCap, 
  Mail, 
  Briefcase, 
  FileText,
  Award
} from 'lucide-react';

export const AVATAR_FALLBACK = "https://cdn-icons-png.flaticon.com/512/4394/4394628.png";

export const PROFILE_IMAGE = "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=400";
export const AVATAR_IMAGE = "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=400";

export const INITIAL_DATA: PortfolioData = {
  identity: {
    name: "ESSIA AJROUD",
    titles: {
      en: "AI ENGINEER & DATA SCIENTIST",
      fr: "INGÉNIEURE IA & DATA SCIENTIST"
    },
    phoneticNameEn: "Ess-ee-ah Ah-zh-rood",
    phoneticNameFr: "Ess-ya Aj-roude"
  },
  socials: {
    linkedin: "https://www.linkedin.com/in/essia-ajroud",
    github: "https://github.com/essia-ajroud",
    email: "essia@example.com",
    phone: "+216 00 000 000"
  },
  media: {
    profileImage: PROFILE_IMAGE,
    avatarImage: AVATAR_IMAGE
  },
  resume: {
    en: '/cv_en.pdf',
    fr: '/cv_fr.pdf'
  },
  skills: [
    { name: 'Python', level: 95, category: 'Core' },
    { name: 'TensorFlow/PyTorch', level: 90, category: 'Frameworks' },
    { name: 'NLP', level: 85, category: 'Core' },
    { name: 'Computer Vision', level: 80, category: 'Core' },
    { name: 'React/TS', level: 70, category: 'Frameworks' },
    { name: 'SQL/NoSQL', level: 85, category: 'Tools' },
  ],
  experiences: {
    en: [
      {
        id: '1',
        role: 'AI Engineer',
        company: 'Tech Solutions Inc.',
        period: '2023 - Present',
        description: 'Leading development of LLM-based customer support agents.'
      }
    ],
    fr: [
      {
        id: '1',
        role: 'Ingénieure IA',
        company: 'Tech Solutions Inc.',
        period: '2023 - Présent',
        description: 'Direction du développement d\'agents de support client.'
      }
    ]
  },
  projects: {
    en: [
      {
        id: '1',
        title: 'Neural Network Visualizer',
        description: 'A 3D interactive tool to visualize weight distributions in LLMs.',
        techStack: ['Python', 'Three.js', 'React'],
        category: 'GenAI',
        githubUrl: 'https://github.com/essia-ajroud/nn-viz'
      }
    ],
    fr: [
      {
        id: '1',
        title: 'Visualisateur de Réseaux de Neurones',
        description: 'Outil interactif 3D pour visualiser la distribution des poids.',
        techStack: ['Python', 'Three.js', 'React'],
        category: 'GenAI'
      }
    ]
  },
  certifications: {
    en: [
      { id: '1', name: 'TensorFlow Developer Certificate', issuer: 'Google', date: '2023' }
    ],
    fr: [
      { id: '1', name: 'Certificat Développeur TensorFlow', issuer: 'Google', date: '2023' }
    ]
  },
  about: {
    en: `I am Essia Ajroud, a passionate Data Science and AI Engineer.`,
    fr: `Je suis Essia Ajroud, ingénieure passionnée en Data Science et IA.`
  }
};

// Re-calculated angles for 6 items (360 / 6 = 60 degrees)
const NAV_ANGLES = {
  PROJECTS: -90,
  EXPERIENCE: -30,
  CERTIFICATIONS: 30,
  ABOUT: 90,
  CONTACT: 150,
  HOME: 210
};

export const getNavConfig = (lang: 'en' | 'fr') => {
  const isEn = lang === 'en';
  return [
      { id: SectionId.PROJECTS, label: isEn ? 'Projects' : 'Projets', icon: BrainCircuit, angle: NAV_ANGLES.PROJECTS },
      { id: SectionId.EXPERIENCE, label: isEn ? 'Experience' : 'Expérience', icon: Briefcase, angle: NAV_ANGLES.EXPERIENCE },
      { id: SectionId.CERTIFICATIONS, label: isEn ? 'Certifications' : 'Certifs', icon: Award, angle: NAV_ANGLES.CERTIFICATIONS },
      { id: SectionId.ABOUT, label: isEn ? 'About' : 'À propos', icon: GraduationCap, angle: NAV_ANGLES.ABOUT },
      { id: SectionId.CONTACT, label: 'Contact', icon: Mail, angle: NAV_ANGLES.CONTACT },
      { id: SectionId.HOME, label: 'Resume', icon: FileText, angle: NAV_ANGLES.HOME },
  ];
};

export const getTitles = (lang: 'en' | 'fr') => {
  const isEn = lang === 'en';
  return {
    welcome: isEn ? "WELCOME TO MY" : "BIENVENUE SUR MON",
    portfolio: "PORTFOLIO",
    connect: isEn ? "Let's Connect" : "Restons en Contact",
    collab: isEn ? "Open to collaborations and new opportunities." : "Ouverte aux collaborations.",
    download: isEn ? "Download CV" : "Télécharger CV",
    education: isEn ? "Education" : "Formation",
    skills: isEn ? "Technical Skills" : "Compétences Techniques",
    interact: isEn ? "Interact with my professional profile." : "Interagissez avec mon profil professionnel."
  };
};

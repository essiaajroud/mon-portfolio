
export interface Project {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  category: string;
  githubUrl?: string;
  demoUrl?: string;
}

export interface Experience {
  id: string;
  role: string;
  company: string;
  period: string;
  description: string;
}

export interface Skill {
  name: string;
  level: number;
  category: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  icon?: string;
}

export interface Diploma {
  id: string;
  degree: string;
  institution: string;
  period: string;
  description?: string;
}

// Added ChatMessage interface to resolve the import error in ChatTerminal.tsx
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface PortfolioData {
  identity: {
    name: string;
    titles: {
      en: string;
      fr: string;
    };
    phoneticNameEn: string;
    phoneticNameFr: string;
  };
  socials: {
    linkedin: string;
    github: string;
    email: string;
    phone: string;
  };
  media: {
    profileImage: string;
    avatarImage: string;
  };
  resume: {
    en: string;
    fr: string;
  };
  projects: {
    en: Project[];
    fr: Project[];
  };
  certifications: {
    en: Certification[];
    fr: Certification[];
  };
  diplomas?: {
    en: Diploma[];
    fr: Diploma[];
  };
  experiences: {
    en: Experience[];
    fr: Experience[];
  };
  skills: Skill[];
  about: {
    en: string;
    fr: string;
  };
  contactMessage?: {
    en: string;
    fr: string;
  };
}

export enum SectionId {
  HOME = 'HOME',
  PROJECTS = 'PROJECTS',
  EXPERIENCE = 'EXPERIENCE',
  CERTIFICATIONS = 'CERTIFICATIONS',
  ABOUT = 'ABOUT',
  CONTACT = 'CONTACT'
}

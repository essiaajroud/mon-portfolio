// Utility for robust local & client document persistence (PDF CVs)
// Uses IndexedDB to store files of any size without localStorage quota limits or Firestore 1MB restrictions.
import { jsPDF } from 'jspdf';
import { PortfolioData } from '../types';

const DB_NAME = 'neural_portfolio_documents';
const STORE_NAME = 'pdf_vault';

// In-memory blob cache for immediate zero-delay downloads
const memoryBlobCache = new Map<string, Blob>();

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB non disponible dans cet environnement'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface StoredDoc {
  blob: Blob;
  filename: string;
  size: number;
  updatedAt: number;
}

export async function storePdfDocument(
  key: string,
  blobOrFile: Blob | File,
  filename: string
): Promise<{ success: boolean; size: number }> {
  try {
    memoryBlobCache.set(key, blobOrFile);
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const data: StoredDoc = {
        blob: blobOrFile,
        filename,
        size: blobOrFile.size,
        updatedAt: Date.now()
      };
      const req = store.put(data, key);
      req.onsuccess = () => resolve({ success: true, size: blobOrFile.size });
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB store error:", err);
    return { success: false, size: 0 };
  }
}

export async function getStoredPdfDocument(key: string): Promise<StoredDoc | null> {
  if (memoryBlobCache.has(key)) {
    const cachedBlob = memoryBlobCache.get(key)!;
    return {
      blob: cachedBlob,
      filename: `${key}.pdf`,
      size: cachedBlob.size,
      updatedAt: Date.now()
    };
  }

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          memoryBlobCache.set(key, req.result.blob);
        }
        resolve(req.result || null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Generates an elegant, high-definition official PDF CV directly in client memory (~5ms).
 */
export function generateClientSidePdfCv(
  lang: 'en' | 'fr',
  portfolioData?: PortfolioData | null
): Blob {
  const isFr = lang === 'fr';
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [6, 182, 212]; // cyan-500
  const darkColor = [15, 23, 42]; // slate-900
  const grayColor = [100, 116, 139]; // slate-500

  // Header background banner
  doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.rect(0, 0, 210, 48, 'F');

  // Cyan accent line
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 48, 210, 2, 'F');

  // Name & Title
  const name = portfolioData?.identity?.name || 'ESSIA AJROUD';
  const title = portfolioData?.identity?.titles?.[lang] || (isFr ? 'INGÉNIEURE EN INTELLIGENCE ARTIFICIELLE & DATA SCIENCE' : 'AI ENGINEER & DATA SCIENTIST');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(name.toUpperCase(), 16, 20);

  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(title.toUpperCase(), 16, 28);

  // Contact info in header
  const email = portfolioData?.socials?.email || 'essia.ajroud@esprit.tn';
  const linkedin = (portfolioData?.socials?.linkedin || 'linkedin.com/in/essia-ajroud').replace(/^https?:\/\//, '');
  const github = (portfolioData?.socials?.github || 'github.com/essia-ajroud').replace(/^https?:\/\//, '');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Email: ${email}  |  LinkedIn: ${linkedin}  |  GitHub: ${github}`, 16, 38);

  let y = 60;

  function addSectionHeader(secTitle: string) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(secTitle.toUpperCase(), 16, y);

    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.6);
    doc.line(16, y + 2, 194, y + 2);

    y += 8;
  }

  // 1. Profil / Bio
  addSectionHeader(isFr ? 'Profil Professionnel' : 'Professional Summary');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  const bioText = portfolioData?.about?.[lang] || (isFr
    ? "Ingénieure passionnée spécialisée en Intelligence Artificielle, Machine Learning, Deep Learning et Data Science. Forte expertise dans la conception d'architectures d'IA générative (LLM, RAG), l'analyse prédictive et le déploiement de solutions d'IA scalables."
    : "Passionate AI and Data Science Engineer specializing in Machine Learning, Deep Learning, and Generative AI architectures (LLMs, RAG). Proven expertise in predictive analytics and deploying scalable production machine learning solutions.");

  const splitBio = doc.splitTextToSize(bioText, 178);
  doc.text(splitBio, 16, y);
  y += splitBio.length * 4.5 + 4;

  // 2. Formation / Diplômes
  addSectionHeader(isFr ? 'Diplômes & Formation Académique' : 'Education & Diplomas');
  const diplomas = (portfolioData?.diplomas?.[lang] && portfolioData.diplomas[lang].length > 0)
    ? portfolioData.diplomas[lang]
    : (isFr ? [
        {
          degree: "Diplôme National d'Ingénieur en Génie Informatique & Intelligence Artificielle",
          institution: "École Nationale des Sciences de l'Informatique (ENSI) / ESPRIT",
          period: "2020 - 2023",
          description: "Spécialisation : Intelligence Artificielle, Machine Learning, Deep Learning, Big Data et Systèmes Distribués."
        },
        {
          degree: "Cycle Préparatoire aux Études d'Ingénieurs (Mathématiques - Physique)",
          institution: "Institut Préparatoire aux Études d'Ingénieurs",
          period: "2018 - 2020",
          description: "Fondations solides en mathématiques appliquées, statistiques, algèbre linéaire et modélisation algorithmique."
        }
      ] : [
        {
          degree: "National Engineering Diploma in Computer Science & Artificial Intelligence",
          institution: "National School of Computer Sciences (ENSI) / ESPRIT",
          period: "2020 - 2023",
          description: "Specialization: Artificial Intelligence, Machine Learning, Deep Learning, Big Data & Distributed Systems."
        },
        {
          degree: "Preparatory Cycle for Engineering Studies (Mathematics - Physics)",
          institution: "Preparatory Institute for Engineering Studies",
          period: "2018 - 2020",
          description: "Rigorous training in advanced calculus, linear algebra, probability, and algorithmic problem-solving."
        }
      ]);

  diplomas.forEach(dip => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(dip.degree, 16, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(dip.period, 194, y, { align: 'right' });
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text(dip.institution, 16, y);
    y += 4;

    if (dip.description) {
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const splitDesc = doc.splitTextToSize(dip.description, 178);
      doc.text(splitDesc, 16, y);
      y += splitDesc.length * 3.8 + 3;
    }
  });

  y += 2;

  // 3. Expériences
  addSectionHeader(isFr ? 'Expérience Professionnelle' : 'Work Experience');
  const experiences = (portfolioData?.experiences?.[lang] && portfolioData.experiences[lang].length > 0)
    ? portfolioData.experiences[lang]
    : (isFr ? [
        {
          role: "Ingénieure Intelligence Artificielle & Data Science",
          company: "Tech Solutions Inc.",
          period: "2023 - Présent",
          description: "Direction et développement de solutions d'IA basées sur de grands modèles de langage (LLMs) et architectures RAG. Fine-tuning de modèles deep learning et déploiement en production."
        }
      ] : [
        {
          role: "AI & Data Science Engineer",
          company: "Tech Solutions Inc.",
          period: "2023 - Present",
          description: "Leading development of LLM-based intelligent systems and RAG architectures. Fine-tuning deep learning models and scaling ML inference pipelines."
        }
      ]);

  experiences.forEach(exp => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(exp.role, 16, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(exp.period, 194, y, { align: 'right' });
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.text(exp.company, 16, y);
    y += 4;

    if (exp.description) {
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const splitDesc = doc.splitTextToSize(exp.description, 178);
      doc.text(splitDesc, 16, y);
      y += splitDesc.length * 3.8 + 3;
    }
  });

  // 4. Compétences
  addSectionHeader(isFr ? 'Compétences Techniques & Certifications' : 'Technical Skills & Certifications');
  const skills = portfolioData?.skills?.map(s => s.name).join(', ') || 'Python, PyTorch, TensorFlow, Scikit-learn, LangChain, RAG, NLP, Computer Vision, SQL, Docker, React, TypeScript';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const splitSkills = doc.splitTextToSize(skills, 178);
  doc.text(splitSkills, 16, y);

  return doc.output('blob');
}

/**
 * Initiates an ultra-fast, zero-latency download of the requested CV.
 */
export async function triggerPdfDownload(
  key: string,
  fallbackUrl: string,
  defaultFilename: string,
  portfolioData?: PortfolioData | null
): Promise<void> {
  const lang = key.includes('fr') ? 'fr' : 'en';

  // 1. Check custom uploaded document in IndexedDB / cache
  try {
    const doc = await getStoredPdfDocument(key);
    if (doc && doc.blob && doc.blob.size > 0) {
      const blobUrl = URL.createObjectURL(doc.blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = doc.filename || defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return;
    }
  } catch (e) {
    console.warn("IndexedDB check error, falling back to instant generator:", e);
  }

  // 2. If fallbackUrl is an external link (http/https and not local path), open it directly
  if (fallbackUrl && (fallbackUrl.startsWith('http://') || fallbackUrl.startsWith('https://'))) {
    const a = document.createElement('a');
    a.href = fallbackUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // 3. Instant client-side generation (~5ms in browser memory, 0ms network latency)
  try {
    const pdfBlob = generateClientSidePdfCv(lang, portfolioData);
    const blobUrl = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    return;
  } catch (err) {
    console.warn("Client-side PDF generation error, falling back to static URL:", err);
  }

  // 4. Static fallback to /public/cv_*.pdf
  const a = document.createElement('a');
  a.href = fallbackUrl || `/cv_${lang}.pdf`;
  a.download = defaultFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

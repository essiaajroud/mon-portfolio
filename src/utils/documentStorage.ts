// Utility for robust local & client document persistence (PDF CVs)
// Uses IndexedDB to store files of any size without localStorage quota limits or Firestore 1MB restrictions.
// Completely zero-dependency: NO external npm packages needed (runs without jspdf or third-party binaries).
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
 * Escapes characters for PDF literal text strings
 */
function escapePdfText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' '); // Clean control chars
}

/**
 * Generates an elegant, high-definition official PDF CV directly in client memory (~1ms)
 * completely zero-dependency (Standard PDF 1.4 specification).
 */
export function generateClientSidePdfCv(
  lang: 'en' | 'fr',
  portfolioData?: PortfolioData | null
): Blob {
  const isFr = lang === 'fr';
  const name = (portfolioData?.identity?.name || 'ESSIA AJROUD').toUpperCase();
  const title = (portfolioData?.identity?.titles?.[lang] || (isFr ? 'INGÉNIEURE IA & DATA SCIENTIST' : 'AI ENGINEER & DATA SCIENTIST')).toUpperCase();
  const email = portfolioData?.socials?.email || 'essia.ajroud@esprit.tn';
  const linkedin = (portfolioData?.socials?.linkedin || 'linkedin.com/in/essia-ajroud').replace(/^https?:\/\//, '');
  const github = (portfolioData?.socials?.github || 'github.com/essia-ajroud').replace(/^https?:\/\//, '');
  const contact = `Email: ${email}  |  LinkedIn: ${linkedin}  |  GitHub: ${github}`;

  const bioText = portfolioData?.about?.[lang] || (isFr
    ? "Ingénieure spécialisée en Intelligence Artificielle, Machine Learning, Deep Learning et Data Science. Forte expertise dans la conception d'architectures d'IA générative (LLM, RAG), l'analyse prédictive et le déploiement de solutions d'IA scalables."
    : "Passionate AI and Data Science Engineer specializing in Machine Learning, Deep Learning, and Generative AI architectures (LLMs, RAG). Proven expertise in predictive analytics and deploying production-ready machine learning solutions.");

  const diplomas = (portfolioData?.diplomas?.[lang] && portfolioData.diplomas[lang].length > 0)
    ? portfolioData.diplomas[lang]
    : (isFr ? [
        {
          degree: "Diplôme National d'Ingénieur en Informatique & Intelligence Artificielle",
          institution: "École Nationale des Sciences de l'Informatique (ENSI) / ESPRIT",
          period: "2020 - 2023",
          description: "Spécialisation : Intelligence Artificielle, Machine Learning, Deep Learning, Big Data et Systèmes Distribués."
        },
        {
          degree: "Cycle Préparatoire aux Études d'Ingénieurs (Mathématiques - Physique)",
          institution: "Institut Préparatoire aux Études d'Ingénieurs",
          period: "2018 - 2020",
          description: "Fondations en mathématiques appliquées, statistiques, algèbre linéaire et modélisation algorithmique."
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
          description: "Intensive training in advanced calculus, linear algebra, probability, and algorithmic problem-solving."
        }
      ]);

  const experiences = (portfolioData?.experiences?.[lang] && portfolioData.experiences[lang].length > 0)
    ? portfolioData.experiences[lang]
    : (isFr ? [
        {
          role: "Ingénieure Intelligence Artificielle & Data Science",
          company: "Tech Solutions Inc.",
          period: "2023 - Présent",
          description: "Direction et développement de solutions d'IA basées sur les LLMs et architectures RAG. Fine-tuning de modèles deep learning et déploiement en production."
        }
      ] : [
        {
          role: "AI & Data Science Engineer",
          company: "Tech Solutions Inc.",
          period: "2023 - Present",
          description: "Leading development of LLM-based intelligent systems and RAG architectures. Fine-tuning deep learning models and scaling ML inference pipelines."
        }
      ]);

  const skills = portfolioData?.skills?.map(s => s.name).join(', ') || 'Python, PyTorch, TensorFlow, Scikit-learn, LangChain, RAG, NLP, Computer Vision, SQL, Docker, React, TypeScript';

  // Build PDF 1.4 stream commands
  const lines: string[] = [];

  // Top Dark Banner
  lines.push('q');
  lines.push('0.059 0.09 0.165 rg'); // Dark navy (#0f172a)
  lines.push('0 720 595.28 122 re f');
  // Cyan Accent Line
  lines.push('0.024 0.714 0.831 rg'); // Cyan (#06b6d4)
  lines.push('0 716 595.28 4 re f');

  // Header Texts
  lines.push('BT /F2 20 Tf 1 1 1 rg 40 790 Td (' + escapePdfText(name) + ') Tj ET');
  lines.push('BT /F2 11 Tf 0.024 0.714 0.831 rg 40 768 Td (' + escapePdfText(title) + ') Tj ET');
  lines.push('BT /F1 8.5 Tf 0.8 0.84 0.88 rg 40 742 Td (' + escapePdfText(contact) + ') Tj ET');

  let curY = 680;

  const renderSectionHeader = (secTitle: string) => {
    lines.push('BT /F2 11 Tf 0.059 0.09 0.165 rg 40 ' + curY + ' Td (' + escapePdfText(secTitle.toUpperCase()) + ') Tj ET');
    lines.push('q 0.024 0.714 0.831 RG 0.8 w 40 ' + (curY - 3) + ' m 555 ' + (curY - 3) + ' l S Q');
    curY -= 18;
  };

  const renderParagraph = (text: string, maxLen = 95) => {
    const words = text.split(' ');
    let line = '';
    for (const w of words) {
      if ((line + ' ' + w).length > maxLen) {
        lines.push('BT /F1 8.5 Tf 0.25 0.3 0.38 rg 40 ' + curY + ' Td (' + escapePdfText(line.trim()) + ') Tj ET');
        curY -= 11;
        line = w;
      } else {
        line += (line ? ' ' : '') + w;
      }
    }
    if (line.trim()) {
      lines.push('BT /F1 8.5 Tf 0.25 0.3 0.38 rg 40 ' + curY + ' Td (' + escapePdfText(line.trim()) + ') Tj ET');
      curY -= 11;
    }
    curY -= 4;
  };

  // 1. Profil
  renderSectionHeader(isFr ? 'Profil Professionnel' : 'Professional Summary');
  renderParagraph(bioText);

  // 2. Diplomas
  renderSectionHeader(isFr ? 'Diplômes & Formation Académique' : 'Education & Diplomas');
  diplomas.forEach(dip => {
    lines.push('BT /F2 9.5 Tf 0.06 0.09 0.16 rg 40 ' + curY + ' Td (' + escapePdfText(dip.degree) + ') Tj ET');
    lines.push('BT /F2 8.5 Tf 0.024 0.714 0.831 rg 480 ' + curY + ' Td (' + escapePdfText(dip.period) + ') Tj ET');
    curY -= 12;
    lines.push('BT /F1 8.5 Tf 0.4 0.45 0.55 rg 40 ' + curY + ' Td (' + escapePdfText(dip.institution) + ') Tj ET');
    curY -= 12;
    if (dip.description) {
      renderParagraph(dip.description, 100);
    }
  });

  // 3. Experiences
  renderSectionHeader(isFr ? 'Expérience Professionnelle' : 'Work Experience');
  experiences.forEach(exp => {
    lines.push('BT /F2 9.5 Tf 0.06 0.09 0.16 rg 40 ' + curY + ' Td (' + escapePdfText(exp.role) + ') Tj ET');
    lines.push('BT /F2 8.5 Tf 0.024 0.714 0.831 rg 480 ' + curY + ' Td (' + escapePdfText(exp.period) + ') Tj ET');
    curY -= 12;
    lines.push('BT /F1 8.5 Tf 0.4 0.45 0.55 rg 40 ' + curY + ' Td (' + escapePdfText(exp.company) + ') Tj ET');
    curY -= 12;
    if (exp.description) {
      renderParagraph(exp.description, 100);
    }
  });

  // 4. Skills
  renderSectionHeader(isFr ? 'Compétences Techniques & Certifications' : 'Technical Skills & Certifications');
  renderParagraph(skills, 100);

  lines.push('Q');
  const streamBody = lines.join('\n');
  const encoder = new TextEncoder();
  const streamBytes = encoder.encode(streamBody);

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n',
    `6 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${streamBody}\nendstream\nendobj\n`
  ];

  let offset = 0;
  const header = '%PDF-1.4\n';
  offset += encoder.encode(header).length;

  const xref = ['xref\n0 7\n0000000000 65535 f \n'];
  const objBuffers: string[] = [];

  for (let i = 0; i < objects.length; i++) {
    const padded = ('0000000000' + offset).slice(-10);
    xref.push(padded + ' 00000 n \n');
    const objStr = objects[i];
    objBuffers.push(objStr);
    offset += encoder.encode(objStr).length;
  }

  const startxref = offset;
  const trailer = `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;
  const fullPdfStr = header + objBuffers.join('') + xref.join('') + trailer;

  return new Blob([encoder.encode(fullPdfStr)], { type: 'application/pdf' });
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

  // 1. Check custom uploaded document in IndexedDB / memory cache
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
    console.warn("IndexedDB check error:", e);
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

  // 3. Ultra-fast download using static pre-rendered PDF in /public (instant zero-delay)
  const targetUrl = fallbackUrl || `/cv_${lang}.pdf`;
  try {
    const res = await fetch(targetUrl);
    if (res.ok) {
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return;
    }
  } catch {
    // If offline or fetch fails, proceed to instant in-memory generator
  }

  // 4. Instant client-side generation (0ms network, pure zero-dependency TypeScript)
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
    console.warn("Client-side PDF generation error, direct fallback:", err);
  }

  // 5. Final fallback directly via browser navigation
  const a = document.createElement('a');
  a.href = targetUrl;
  a.download = defaultFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

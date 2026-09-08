import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

function createResume(lang = 'fr') {
  const isFr = lang === 'fr';
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [6, 182, 212]; // cyan-500
  const darkColor = [15, 23, 42]; // slate-900
  const grayColor = [100, 116, 139]; // slate-500
  const lightBg = [248, 250, 252];

  // Header background banner
  doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.rect(0, 0, 210, 48, 'F');

  // Cyan accent line
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 48, 210, 2, 'F');

  // Name & Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('ESSIA AJROUD', 16, 20);

  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(
    isFr ? 'INGÉNIEURE EN INTELLIGENCE ARTIFICIELLE & DATA SCIENCE' : 'AI ENGINEER & DATA SCIENTIST',
    16,
    28
  );

  // Contact info in header
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text('Email: essia.ajroud@esprit.tn  |  LinkedIn: linkedin.com/in/essia-ajroud  |  GitHub: github.com/essia-ajroud', 16, 38);

  let y = 60;

  function addSectionHeader(title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(title.toUpperCase(), 16, y);

    // Decorative line
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.6);
    doc.line(16, y + 2, 194, y + 2);

    y += 8;
  }

  // 1. Profil / Summary
  addSectionHeader(isFr ? 'Profil Professionnel' : 'Professional Summary');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const bioText = isFr
    ? "Ingénieure passionnée spécialisée en Intelligence Artificielle, Machine Learning, Deep Learning et Data Science. Forte expertise dans la conception d'architectures d'IA générative (LLM, RAG), l'analyse prédictive et le développement de solutions intelligentes scalables à fort impact métier."
    : "Passionate AI and Data Science Engineer specializing in Machine Learning, Deep Learning, and Generative AI architectures (LLMs, RAG). Proven expertise in developing end-to-end intelligent systems, predictive analytics, and deploying production-ready machine learning solutions.";
  
  const splitBio = doc.splitTextToSize(bioText, 178);
  doc.text(splitBio, 16, y);
  y += splitBio.length * 4.5 + 4;

  // 2. Formation / Diplômes
  addSectionHeader(isFr ? 'Diplômes & Formation Académique' : 'Education & Diplomas');
  
  const diplomas = isFr ? [
    {
      degree: "Diplôme National d'Ingénieur en Génie Informatique & Intelligence Artificielle",
      school: "École Nationale des Sciences de l'Informatique (ENSI) / ESPRIT",
      period: "2020 - 2023",
      desc: "Spécialisation : Intelligence Artificielle, Machine Learning, Deep Learning, Big Data, Vision par Ordinateur et Systèmes Distribués."
    },
    {
      degree: "Cycle Préparatoire aux Études d'Ingénieurs (Mathématiques - Physique)",
      school: "Institut Préparatoire aux Études d'Ingénieurs",
      period: "2018 - 2020",
      desc: "Fondations rigoureuses en mathématiques appliquées, statistiques, algèbre linéaire et modélisation algorithmique."
    }
  ] : [
    {
      degree: "National Engineering Diploma in Computer Science & Artificial Intelligence",
      school: "National School of Computer Sciences (ENSI) / ESPRIT",
      period: "2020 - 2023",
      desc: "Specialization: Artificial Intelligence, Machine Learning, Deep Learning, Computer Vision, Big Data & Distributed Systems."
    },
    {
      degree: "Preparatory Cycle for Engineering Studies (Mathematics - Physics)",
      school: "Preparatory Institute for Engineering Studies",
      period: "2018 - 2020",
      desc: "Intensive preparation in advanced calculus, linear algebra, probability theory, statistics, and algorithmic problem-solving."
    }
  ];

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
    doc.text(dip.school, 16, y);
    y += 4;

    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const splitDesc = doc.splitTextToSize(dip.desc, 178);
    doc.text(splitDesc, 16, y);
    y += splitDesc.length * 3.8 + 3;
  });

  y += 2;

  // 3. Expérience Professionnelle
  addSectionHeader(isFr ? 'Expérience Professionnelle' : 'Work Experience');
  const experiences = isFr ? [
    {
      role: "Ingénieure Intelligence Artificielle & Data Science",
      company: "Tech Solutions Inc.",
      period: "2023 - Présent",
      desc: "• Conception et déploiement d'agents conversationnels intelligents basés sur de grands modèles de langage (LLMs) et architectures RAG.\n• Optimisation de pipelines de données volumineuses et fine-tuning de modèles d'apprentissage profond pour la production.\n• Collaboration étroite avec les équipes produit pour intégrer l'IA dans les workflows métiers critiques."
    }
  ] : [
    {
      role: "AI & Data Science Engineer",
      company: "Tech Solutions Inc.",
      period: "2023 - Present",
      desc: "• Architected and deployed intelligent agentic pipelines leveraging Large Language Models (LLMs) and Retrieval-Augmented Generation (RAG).\n• Fine-tuned open-weight deep learning models and orchestrated end-to-end scalable ML pipelines for production inference.\n• Partnered with cross-functional engineering teams to integrate state-of-the-art AI into customer-facing applications."
    }
  ];

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

    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const splitDesc = doc.splitTextToSize(exp.desc, 178);
    doc.text(splitDesc, 16, y);
    y += splitDesc.length * 3.8 + 4;
  });

  // 4. Compétences & Technologies
  addSectionHeader(isFr ? 'Compétences Techniques & Technologies' : 'Technical Skills & Technologies');
  
  const skillsList = isFr ? [
    { label: "Langages & Outils", items: "Python, SQL, R, TypeScript, Git, Docker, Bash" },
    { label: "Machine Learning & IA", items: "PyTorch, TensorFlow, Scikit-learn, HuggingFace, Transformers, LangChain, RAG" },
    { label: "Data Science & Vision", items: "Pandas, NumPy, OpenCV, Data Visualization, Deep Learning, NLP" },
    { label: "Certifications", items: "Google TensorFlow Developer Certificate, Data Science & GenAI Certifications" }
  ] : [
    { label: "Languages & Tools", items: "Python, SQL, R, TypeScript, Git, Docker, Linux, Bash" },
    { label: "Machine Learning & AI", items: "PyTorch, TensorFlow, Scikit-Learn, Hugging Face, Transformers, LangChain, RAG" },
    { label: "Data Science & Vision", items: "Pandas, NumPy, OpenCV, Matplotlib, Deep Learning, NLP, LLM Fine-tuning" },
    { label: "Certifications", items: "Google TensorFlow Developer Certificate, Deep Learning & GenAI Certified" }
  ];

  skillsList.forEach(s => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(`• ${s.label} :`, 16, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const textW = doc.getTextWidth(`• ${s.label} : `);
    doc.text(s.items, 16 + textW, y);
    y += 4.5;
  });

  return doc;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const docEn = createResume('en');
fs.writeFileSync(path.join(publicDir, 'cv_en.pdf'), Buffer.from(docEn.output('arraybuffer')));
console.log('Successfully generated public/cv_en.pdf');

const docFr = createResume('fr');
fs.writeFileSync(path.join(publicDir, 'cv_fr.pdf'), Buffer.from(docFr.output('arraybuffer')));
console.log('Successfully generated public/cv_fr.pdf');

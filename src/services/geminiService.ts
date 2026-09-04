/**
 * Autonomous and intelligent knowledge base for Essia Ajroud.
 * Works 100% offline and standalone without requiring any external API (Gemini or other).
 */

const getAutonomousResponse = (userPrompt: string): string => {
  const query = userPrompt.toLowerCase().trim();

  // French detection
  const isFrench = /[éèêàâôûîïç]|bonjour|salut|qui|quel|projet|competence|stage|etude|formation|contact|cv/i.test(query);

  if (isFrench) {
    if (/bonjour|salut|coucou|hello|bonsoir/i.test(query)) {
      return "Bonjour ! Je suis l'assistant virtuel d'Essia Ajroud. Comment puis-je vous aider aujourd'hui ? Vous pouvez me poser des questions sur son parcours, ses projets en IA et Data, ses compétences techniques ou comment la contacter.";
    }
    if (/qui (es-tu|est essia)|parcours|presentation|présentation|profil|etudiant|étudiant|esprit/i.test(query)) {
      return "Essia Ajroud est étudiante ingénieure à ESPRIT (Tunisie), spécialisée en Ingénierie des Données (Data Engineering), Intelligence Artificielle et Développement Logiciel. Passionnée par la conception de systèmes scalables et intelligents, elle combine de solides compétences en data science, machine learning et architecture logicielle moderne.";
    }
    if (/projet|réalisation|portfolio|github/i.test(query)) {
      return "Essia a développé plusieurs projets phares : des pipelines de données et modèles de Machine Learning / Deep Learning pour l'analyse prédictive, des solutions de traitement du langage naturel (NLP), ainsi que des applications web complètes avec React et TypeScript. Vous pouvez explorer la section 'Projets' au centre de l'écran ou visiter son profil GitHub.";
    }
    if (/compétence|competence|techno|stack|skill|python|react|langage/i.test(query)) {
      return "Les compétences clés d'Essia comprennent : \n• Langages : Python, TypeScript, JavaScript, SQL, C++\n• Data & IA : Machine Learning, Deep Learning (PyTorch, TensorFlow, Scikit-learn), Pandas, Spark\n• Web & Cloud : React, Node.js, Docker, Git, CI/CD, bases de données relationnelles et NoSQL.";
    }
    if (/contact|email|mail|joindre|recruter|linkedin/i.test(query)) {
      return "Vous pouvez contacter Essia directement par email à seouldream903@gmail.com ou via son profil LinkedIn. Elle est ouverte aux opportunités de stage, d'alternance et de collaboration technique !";
    }
    if (/cv|resume|curriculum|télécharger|telecharger/i.test(query)) {
      return "Vous pouvez télécharger le CV d'Essia (versions française et anglaise) directement via le bouton 'Curriculum Vitae' présent dans le menu central.";
    }
    if (/merci|super|parfait|au revoir|bye/i.test(query)) {
      return "Je vous en prie ! N'hésitez pas si vous avez d'autres questions ou si vous souhaitez entrer en contact avec Essia. Très bonne visite de son portfolio !";
    }

    return "Je suis l'assistant dédié au portfolio d'Essia Ajroud. N'hésitez pas à me questionner sur ses études à ESPRIT, ses projets en IA, ses compétences en Data Engineering, son CV ou ses coordonnées de contact.";
  } else {
    // English responses
    if (/hello|hi|hey|greetings|good morning|good evening/i.test(query)) {
      return "Hello! I am Essia Ajroud's virtual portfolio assistant. How can I assist you today? Feel free to ask about Essia's background, AI and Data projects, technical stack, or how to get in touch.";
    }
    if (/who (are you|is essia)|background|bio|about|education|student|esprit/i.test(query)) {
      return "Essia Ajroud is an engineering student at ESPRIT, specializing in Data Engineering, Artificial Intelligence, and Software Architecture. She is passionate about crafting scalable data pipelines, machine learning models, and high-performance modern web platforms.";
    }
    if (/project|portfolio|work|github/i.test(query)) {
      return "Essia has built impactful projects across machine learning, computer vision, NLP, and full-stack software development. You can explore the interactive 'Projects' node on screen or view the code directly on GitHub.";
    }
    if (/skill|stack|tech|technolog|python|react|tool/i.test(query)) {
      return "Essia's primary toolkit includes:\n• Languages: Python, TypeScript, JavaScript, SQL\n• AI & Data: PyTorch, TensorFlow, Scikit-learn, Data Pipelines, Pandas\n• Fullstack & DevOps: React, Node.js, Docker, Git, REST APIs, CI/CD.";
    }
    if (/contact|email|reach|hire|linkedin/i.test(query)) {
      return "You can reach Essia directly via email at seouldream903@gmail.com or connect through her LinkedIn profile. She is eager to explore new challenges, internships, and engineering opportunities!";
    }
    if (/resume|cv|download/i.test(query)) {
      return "You can download Essia's Resume (both English and French versions) directly from the 'Curriculum Vitae' card in the main orbital menu.";
    }
    if (/thank|great|awesome|bye|goodbye/i.test(query)) {
      return "You are very welcome! Feel free to reach out anytime. Enjoy exploring Essia's portfolio!";
    }

    return "I am Essia Ajroud's portfolio assistant. You can ask me about her background, AI engineering projects, technical stack, resume, or contact details.";
  }
};

/**
 * Translates text (with built-in instant fallback).
 */
export const translateText = async (text: string, targetLang: 'en' | 'fr'): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.text) return data.text;
    }
  } catch {
    // Offline/static fallback
  }
  return text;
};

/**
 * Sends a chat message. If an external API is available, it uses it;
 * otherwise it seamlessly delivers an accurate, autonomous response without external dependency.
 */
export const sendMessageToAI = async (message: string): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.text && !data.text.includes("SYSTEM_WARNING") && !data.text.includes("SYSTEM_ERROR")) {
        return data.text;
      }
    }
  } catch {
    // Silent fallback to local autonomous response
  }

  // 100% autonomous local intelligence response (zero external API required)
  return getAutonomousResponse(message);
};


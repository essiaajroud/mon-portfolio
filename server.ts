import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { GoogleGenAI, Type } from "@google/genai";
import { spawn } from 'child_process';

const app = express();
app.use(express.json({ limit: '10mb' }));

// Secure local data directory for persistent encrypted storage
const DATA_DIR = path.resolve('data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// -------------------------------------------------------------
// HIGH-SECURITY SERVER-SIDE ADMIN AUTHENTICATION
// -------------------------------------------------------------
const AUTH_FILE = path.join(DATA_DIR, 'admin_auth.json');
const DATA_FILE = path.join(DATA_DIR, 'portfolio_data.json');

// Default initial master passkey: "EssiaNeural2026!"
function hashSecret(secret: string, salt: string): string {
  return crypto.pbkdf2Sync(secret, salt, 100000, 64, 'sha512').toString('hex');
}

function getStoredAuth(): { salt: string; hash: string } {
  if (fs.existsSync(AUTH_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    } catch (e) {
      console.warn("Error reading admin_auth.json, recreating");
    }
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const defaultPass = process.env.ADMIN_PASSPHRASE || 'EssiaNeural2026!';
  const hash = hashSecret(defaultPass, salt);
  const authData = { salt, hash };
  fs.writeFileSync(AUTH_FILE, JSON.stringify(authData, null, 2));
  return authData;
}

// Brute-force protection: Max 5 failed attempts per IP with 15-minute cooldown
interface AttemptRecord {
  count: number;
  lockedUntil: number;
}
const loginAttempts = new Map<string, AttemptRecord>();
const activeSessions = new Map<string, { createdAt: number; expiresAt: number }>();

// Clean expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of activeSessions.entries()) {
    if (session.expiresAt <= now) {
      activeSessions.delete(token);
    }
  }
  for (const [ip, attempt] of loginAttempts.entries()) {
    if (attempt.lockedUntil <= now && attempt.count === 0) {
      loginAttempts.delete(ip);
    }
  }
}, 60000);

// Endpoint: Secure Master Login
app.post('/api/admin/auth', async (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  const record = loginAttempts.get(clientIp) || { count: 0, lockedUntil: 0 };
  if (record.lockedUntil > now) {
    const minutesLeft = Math.ceil((record.lockedUntil - now) / 60000);
    return res.status(429).json({
      error: `Trop de tentatives infructueuses. Accès verrouillé pendant encore ${minutesLeft} minute(s).`
    });
  }

  const { passphrase } = req.body;
  if (!passphrase || typeof passphrase !== 'string') {
    return res.status(400).json({ error: "Code d'accès requis" });
  }

  // Artificial delay to eliminate timing attack side-channels
  await new Promise(resolve => setTimeout(resolve, 600));

  const authData = getStoredAuth();
  const calculatedHash = hashSecret(passphrase, authData.salt);

  const isMatch = crypto.timingSafeEqual(
    Buffer.from(calculatedHash, 'hex'),
    Buffer.from(authData.hash, 'hex')
  );

  if (!isMatch) {
    record.count += 1;
    if (record.count >= 5) {
      record.lockedUntil = now + 15 * 60 * 1000; // 15-minute lock
      loginAttempts.set(clientIp, record);
      return res.status(429).json({
        error: "Code d'accès incorrect. 5 échecs détectés. Système verrouillé pendant 15 minutes."
      });
    }
    loginAttempts.set(clientIp, record);
    const remaining = 5 - record.count;
    return res.status(401).json({
      error: `Code d'accès incorrect. Tentatives restantes avant verrouillage : ${remaining}`
    });
  }

  // Reset failed attempts upon successful authentication
  loginAttempts.delete(clientIp);

  // Generate a cryptographically random session token (valid for 3 hours)
  const sessionToken = crypto.randomBytes(32).toString('hex');
  activeSessions.set(sessionToken, {
    createdAt: now,
    expiresAt: now + 3 * 60 * 60 * 1000
  });

  return res.json({
    success: true,
    token: sessionToken,
    expiresIn: 3 * 3600
  });
});

// Middleware to verify session token
const verifyAdminToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Non autorisé: Jeton manquant" });
  }
  const token = authHeader.split(' ')[1];
  const session = activeSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    activeSessions.delete(token);
    return res.status(401).json({ error: "Session expirée ou invalide. Veuillez vous reconnecter." });
  }
  next();
};

// Endpoint: Verify Session Token
app.get('/api/admin/verify', verifyAdminToken, (req, res) => {
  res.json({ valid: true });
});

// Endpoint: Change Master Passphrase (requires active session)
app.post('/api/admin/change-passphrase', verifyAdminToken, (req, res) => {
  const { newPassphrase } = req.body;
  if (!newPassphrase || typeof newPassphrase !== 'string' || newPassphrase.length < 8) {
    return res.status(400).json({ error: "Le nouveau code doit contenir au moins 8 caractères." });
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashSecret(newPassphrase, salt);
  fs.writeFileSync(AUTH_FILE, JSON.stringify({ salt, hash }, null, 2));
  res.json({ success: true, message: "Code d'accès maître mis à jour avec succès." });
});

// Endpoint: Secure Save Portfolio Data (requires active session)
app.post('/api/admin/save-data', verifyAdminToken, (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: "Données requises" });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true, message: "Données enregistrées et sécurisées sur le serveur." });
  } catch (err: any) {
    console.error("Save Data Error:", err);
    res.status(500).json({ error: "Erreur lors de la sauvegarde sur le serveur" });
  }
});

// Ensure public/media directory exists for uploaded assets
const PUBLIC_MEDIA_DIR = path.resolve('public/media');
if (!fs.existsSync(PUBLIC_MEDIA_DIR)) {
  fs.mkdirSync(PUBLIC_MEDIA_DIR, { recursive: true });
}
app.use('/media', express.static(PUBLIC_MEDIA_DIR));

// Endpoint: Secure Upload Media/Profile Image
app.post('/api/admin/upload-image', verifyAdminToken, (req, res) => {
  try {
    const { imageBase64, filename } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: "Données d'image requises" });
    }

    // Determine extension and clean base64 data
    const matches = imageBase64.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    let ext = 'jpg';
    let rawData = imageBase64;
    
    if (matches && matches.length === 3) {
      ext = matches[1] === 'jpeg' ? 'jpg' : matches[1].replace(/[^a-zA-Z0-9]/g, '');
      rawData = matches[2];
    } else if (imageBase64.includes(';base64,')) {
      rawData = imageBase64.split(';base64,')[1];
    }

    const buffer = Buffer.from(rawData, 'base64');
    
    // Generate clean, deterministic professional filename
    const cleanPrefix = filename ? filename.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase().slice(0, 30) : 'profile';
    const timestamp = Date.now();
    const finalFilename = `${cleanPrefix}_${timestamp}.${ext}`;
    const filePath = path.join(PUBLIC_MEDIA_DIR, finalFilename);

    fs.writeFileSync(filePath, buffer);

    // Also sync to build/media if production build exists
    const buildMediaDir = path.resolve('build/media');
    if (fs.existsSync(buildMediaDir)) {
      fs.writeFileSync(path.join(buildMediaDir, finalFilename), buffer);
    }

    // Clean professional URL with NO api path
    const professionalUrl = `/media/${finalFilename}`;
    res.json({ success: true, url: professionalUrl });
  } catch (err: any) {
    console.error("Upload Image Error:", err);
    res.status(500).json({ error: "Erreur lors du traitement de l'image" });
  }
});

// Endpoint: Secure Upload Document / Resume PDF
app.post('/api/admin/upload-file', verifyAdminToken, (req, res) => {
  try {
    const { fileBase64, targetName } = req.body;
    if (!fileBase64 || typeof fileBase64 !== 'string') {
      return res.status(400).json({ error: "Données du fichier requises" });
    }

    let rawData = fileBase64;
    if (fileBase64.includes(';base64,')) {
      rawData = fileBase64.split(';base64,')[1];
    }
    const buffer = Buffer.from(rawData, 'base64');

    const cleanFilename = targetName ? targetName.replace(/[^a-zA-Z0-9_.-]/g, '') : 'document.pdf';
    const filePath = path.join(path.resolve('public'), cleanFilename);
    fs.writeFileSync(filePath, buffer);

    const buildPath = path.resolve('build');
    if (fs.existsSync(buildPath)) {
      fs.writeFileSync(path.join(buildPath, cleanFilename), buffer);
    }

    const professionalUrl = `/${cleanFilename}`;
    res.json({ success: true, url: professionalUrl });
  } catch (err: any) {
    console.error("Upload File Error:", err);
    res.status(500).json({ error: "Erreur lors de l'enregistrement du fichier" });
  }
});

// Endpoint: Retrieve latest saved portfolio data
app.get('/api/portfolio/data', (req, res) => {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      return res.json(data);
    } catch (e) {
      console.warn("Could not read portfolio_data.json");
    }
  }
  res.status(404).json({ error: "No custom data found" });
});

// Endpoint: Logout / Invalidate Token
app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    activeSessions.delete(token);
  }
  res.json({ success: true });
});

// Initialize Gemini client on the server where API_KEY is available
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
  console.log("Gemini API client successfully initialized on the server.");
} else {
  console.warn("Warning: GEMINI_API_KEY or API_KEY environment variable is not defined.");
}

// Endpoint for sending message to AI
app.post('/api/gemini/message', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    
    if (!ai) {
      return res.status(503).json({ error: "Gemini API client is not initialized. Please configure API_KEY in Settings." });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: message,
      config: {
        systemInstruction: "You are the 'Neural Link' AI assistant for Essia Ajroud's professional portfolio. Your task is to respond to user queries about Essia's work as an AI Engineer and Data Scientist. Maintain a sleek, futuristic, and highly professional terminal-style persona. Keep responses concise.",
      },
    });

    res.json({ text: response.text?.trim() || "SYSTEM_ERROR: NO_CARRIER_DETECTED" });
  } catch (error: any) {
    console.error("GenAI Error:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// Endpoint for translating text
app.post('/api/gemini/translate', async (req, res) => {
  try {
    const { text, targetLang } = req.body;
    if (!text || !targetLang) {
      return res.status(400).json({ error: "text and targetLang are required" });
    }

    if (!ai) {
      return res.status(503).json({ error: "Gemini API client is not initialized. Please configure API_KEY in Settings." });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Translate the following text to ${targetLang === 'en' ? 'English' : 'French'}. Return only the translated text, no extra commentary:\n\n${text}`,
    });

    res.json({ text: response.text?.trim() || text });
  } catch (error: any) {
    console.error("Translation Error:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// Endpoint for generating full portfolio content from a prompt
app.post('/api/gemini/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    if (!ai) {
      return res.status(503).json({ error: "Gemini API client is not initialized. Please configure API_KEY in Settings." });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `You are an expert portfolio generator. Given the user's description of themselves, generate a complete, rich, highly professional and realistic portfolio dataset in both English and French. Ensure all roles, descriptions, dates, and projects are fully filled out (do not use placeholders or 'TODO' text).
      
      User description: ${prompt}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            identity: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                titles: {
                  type: Type.OBJECT,
                  properties: {
                    en: { type: Type.STRING },
                    fr: { type: Type.STRING }
                  },
                  required: ['en', 'fr']
                },
                phoneticNameEn: { type: Type.STRING },
                phoneticNameFr: { type: Type.STRING }
              },
              required: ['name', 'titles', 'phoneticNameEn', 'phoneticNameFr']
            },
            socials: {
              type: Type.OBJECT,
              properties: {
                linkedin: { type: Type.STRING },
                github: { type: Type.STRING },
                email: { type: Type.STRING },
                phone: { type: Type.STRING }
              },
              required: ['linkedin', 'github', 'email', 'phone']
            },
            media: {
              type: Type.OBJECT,
              properties: {
                profileImage: { type: Type.STRING },
                avatarImage: { type: Type.STRING }
              },
              required: ['profileImage', 'avatarImage']
            },
            resume: {
              type: Type.OBJECT,
              properties: {
                en: { type: Type.STRING },
                fr: { type: Type.STRING }
              },
              required: ['en', 'fr']
            },
            projects: {
              type: Type.OBJECT,
              properties: {
                en: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
                      category: { type: Type.STRING, description: "Must be one of: 'NLP', 'Computer Vision', 'Data Science', 'GenAI'" },
                      githubUrl: { type: Type.STRING },
                      demoUrl: { type: Type.STRING }
                    },
                    required: ['id', 'title', 'description', 'techStack', 'category']
                  }
                },
                fr: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
                      category: { type: Type.STRING, description: "Must be one of: 'NLP', 'Computer Vision', 'Data Science', 'GenAI'" },
                      githubUrl: { type: Type.STRING },
                      demoUrl: { type: Type.STRING }
                    },
                    required: ['id', 'title', 'description', 'techStack', 'category']
                  }
                }
              },
              required: ['en', 'fr']
            },
            certifications: {
              type: Type.OBJECT,
              properties: {
                en: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      issuer: { type: Type.STRING },
                      date: { type: Type.STRING }
                    },
                    required: ['id', 'name', 'issuer', 'date']
                  }
                },
                fr: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      issuer: { type: Type.STRING },
                      date: { type: Type.STRING }
                    },
                    required: ['id', 'name', 'issuer', 'date']
                  }
                }
              },
              required: ['en', 'fr']
            },
            experiences: {
              type: Type.OBJECT,
              properties: {
                en: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      role: { type: Type.STRING },
                      company: { type: Type.STRING },
                      period: { type: Type.STRING },
                      description: { type: Type.STRING }
                    },
                    required: ['id', 'role', 'company', 'period', 'description']
                  }
                },
                fr: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      role: { type: Type.STRING },
                      company: { type: Type.STRING },
                      period: { type: Type.STRING },
                      description: { type: Type.STRING }
                    },
                    required: ['id', 'role', 'company', 'period', 'description']
                  }
                }
              },
              required: ['en', 'fr']
            },
            skills: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  level: { type: Type.INTEGER },
                  category: { type: Type.STRING, description: "Must be one of 'Core', 'Tools', 'Frameworks'" }
                },
                required: ['name', 'level', 'category']
              }
            },
            about: {
              type: Type.OBJECT,
              properties: {
                en: { type: Type.STRING },
                fr: { type: Type.STRING }
              },
              required: ['en', 'fr']
            }
          },
          required: ['identity', 'socials', 'media', 'resume', 'projects', 'certifications', 'experiences', 'skills', 'about']
        }
      }
    });

    const text = response.text?.trim() || "";
    const parsedData = JSON.parse(text);
    res.json(parsedData);
  } catch (error: any) {
    console.error("Generation Error:", error);
    res.status(500).json({ error: error?.message || "Internal server error" });
  }
});

// Serve static assets in production
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

if (NODE_ENV === 'production') {
  // Express serves build output
  const buildPath = path.resolve('build');
  app.use(express.static(buildPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });

  const serverPort = PORT;
  app.listen(serverPort, () => {
    console.log(`Server is running in ${NODE_ENV} mode on port ${serverPort}`);
  });
} else {
  // Express runs on port 3001 in dev mode, proxied by CRA on port 3000
  const serverPort = 3001;
  app.listen(serverPort, () => {
    console.log(`API server is running in development mode on port ${serverPort}`);
  });

  // Spawn Create React App development server on port 3000
  console.log("Spawning React development server on port 3000...");
  const child = spawn('npx', ['react-scripts', 'start'], {
    env: { ...process.env, PORT: '3000', BROWSER: 'none', DANGEROUSLY_DISABLE_HOST_CHECK: 'true' },
    stdio: 'inherit',
    shell: true
  });

  child.on('close', (code) => {
    console.log(`React development server exited with code ${code}`);
  });
}

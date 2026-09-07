// Utility for robust local & client document persistence (PDF CVs)
// Uses IndexedDB to store files of any size without localStorage quota limits or Firestore 1MB restrictions.

const DB_NAME = 'neural_portfolio_documents';
const STORE_NAME = 'pdf_vault';

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
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function triggerPdfDownload(
  key: string,
  fallbackUrl: string,
  defaultFilename: string
): Promise<void> {
  try {
    const doc = await getStoredPdfDocument(key);
    if (doc && doc.blob) {
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
    console.warn("IndexedDB retrieve error, falling back to URL:", e);
  }

  // Fallback to static or external URL
  const a = document.createElement('a');
  a.href = fallbackUrl;
  a.download = defaultFilename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

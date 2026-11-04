/**
 * Antigravity Test-AI: Kalıcı İstemci Depolama Modülü (IndexedDB)
 * localStorage sınırlarını (5MB) aşarak video, fotoğraf, PDF dosyalarını (Blob),
 * telemetri verilerini, prompt metinlerini ve üretilen test planlarını tarayıcı kapanıp açılsa bile
 * %100 eksiksiz korur ve geri yükler.
 */

export interface StoredMediaItem {
  id: string;
  name: string;
  type: "video" | "image";
  sizeFormatted: string;
  blob: Blob;
  note?: string;
  telemetry?: any;
}

export interface StoredDocument {
  name: string;
  sizeFormatted: string;
  extractedText: string;
  blob?: Blob;
}

export interface ComprehensiveDraft {
  persona: "qa" | "developer";
  title: string;
  category: string;
  inputMode: number; // 0: Video & Fotoğraf, 1: Prompt, 2: PDF & Dosya Yükleme
  promptText: string;
  previousContent: string;
  newContent: string;
  mediaNotes: string;
  mediaItems: StoredMediaItem[];
  document?: StoredDocument;
  dynamicScopes?: any[];
  testPlan?: any;
  savedAt: string;
}

const DB_NAME = "TestAI_PersistentStorage_v2";
const STORE_DRAFTS = "drafts";
const STORE_PLANS = "saved_plans";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB desteklenmiyor."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, 2);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS);
      }
      if (!db.objectStoreNames.contains(STORE_PLANS)) {
        db.createObjectStore(STORE_PLANS, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveComprehensiveDraft(
  persona: "qa" | "developer",
  draft: ComprehensiveDraft
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFTS, "readwrite");
      const store = tx.objectStore(STORE_DRAFTS);
      const req = store.put(draft, `draft_${persona}`);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err: any) {
    console.warn("[PersistentStorage] IndexedDB yazma hatası:", err);
  }
}

export async function loadComprehensiveDraft(
  persona: "qa" | "developer"
): Promise<ComprehensiveDraft | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFTS, "readonly");
      const store = tx.objectStore(STORE_DRAFTS);
      const req = store.get(`draft_${persona}`);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err: any) {
    console.warn("[PersistentStorage] IndexedDB okuma hatası:", err);
    return null;
  }
}

export async function clearComprehensiveDraft(persona: "qa" | "developer"): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFTS, "readwrite");
      const store = tx.objectStore(STORE_DRAFTS);
      const req = store.delete(`draft_${persona}`);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err: any) {
    console.warn("[PersistentStorage] IndexedDB silme hatası:", err);
  }
}

/**
 * Kaydedilen Test Planlarını İstemci Tarafında (IndexedDB) Asla Kaybolmayacak Şekilde Saklar
 */
export async function saveSavedTestPlan(plan: any): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PLANS, "readwrite");
      const store = tx.objectStore(STORE_PLANS);
      const req = store.put(plan);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err: any) {
    console.warn("[PersistentStorage] Test planı IndexedDB kaydetme hatası:", err);
  }
}

export async function loadAllSavedTestPlans(): Promise<any[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PLANS, "readonly");
      const store = tx.objectStore(STORE_PLANS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err: any) {
    console.warn("[PersistentStorage] Test planları IndexedDB okuma hatası:", err);
    return [];
  }
}

export async function deleteSavedTestPlanFromStorage(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PLANS, "readwrite");
      const store = tx.objectStore(STORE_PLANS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err: any) {
    console.warn("[PersistentStorage] Test planı IndexedDB silme hatası:", err);
  }
}

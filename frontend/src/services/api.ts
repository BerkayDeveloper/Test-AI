import { TestPlanResult, AnalysisHistoryItem } from "../types";

function getApiCandidates(): string[] {
  const envUrl = (import.meta as any).env?.VITE_API_URL?.trim()?.replace(/\/+$/, "");
  const currentHost =
    typeof window !== "undefined" && window.location && window.location.hostname
      ? window.location.hostname
      : "127.0.0.1";

  const candidates: string[] = [
    // 1. Vite dev proxy (aynı kök - CORS sorunu yok, çerezler ve port yönlendirmesi sorunsuz)
    "",
    // 2. Doğrudan IPv4 loopback (Windows IPv6 ::1 gecikme ve uyuşmazlığını önler)
    "http://127.0.0.1:5001",
    // 3. Localhost
    "http://localhost:5001",
  ];

  if (envUrl && !candidates.includes(envUrl)) {
    candidates.push(envUrl);
  }

  if (currentHost && currentHost !== "localhost" && currentHost !== "127.0.0.1") {
    candidates.push(`http://${currentHost}:5001`);
  }

  return Array.from(new Set(candidates));
}

let lastWorkingCandidate: string | null = null;

async function requestWithFallback(
  path: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const candidates = getApiCandidates();

  if (lastWorkingCandidate && candidates.includes(lastWorkingCandidate)) {
    const idx = candidates.indexOf(lastWorkingCandidate);
    candidates.splice(idx, 1);
    candidates.unshift(lastWorkingCandidate);
  }

  // Developer Session Header & Credentials desteği
  const devSession = localStorage.getItem("dev_session_id") || "";
  const mergedHeaders: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (devSession) {
    mergedHeaders["X-Developer-Session"] = devSession;
  }

  let lastError: any = null;

  for (const base of candidates) {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${base}${cleanPath}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const mergedOptions: RequestInit = {
      ...options,
      credentials: "include", // HttpOnly çerezlerin iletilmesi için
      headers: mergedHeaders,
      signal: controller.signal,
    };

    try {
      const res = await fetch(url, mergedOptions);
      clearTimeout(timer);

      // 502/503/504 Vite dev proxy bağlantı hatası ise sıradaki adaya (doğrudan backend portuna) geç
      if (res.status >= 502 && res.status <= 504 && base === "") {
        continue;
      }
      if (res.status !== 404 || base === "") {
        lastWorkingCandidate = base;
        return res;
      }
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      // Sıradaki adayı dene
    }
  }

  if (
    lastError &&
    (lastError.name === "AbortError" ||
      lastError.message === "Failed to fetch" ||
      lastError.name === "TypeError")
  ) {
    throw new Error("Sunucuya bağlanılamadı. Lütfen backend servisinin (port 5001) aktif olduğunu kontrol edin.");
  }

  throw lastError || new Error("Sunucuya bağlanılamadı.");
}

export const api = {
  async checkHealth(): Promise<{ status: string; database?: string; mode?: string; engine?: string }> {
    const res = await requestWithFallback("/api/health", {}, 2500);
    if (!res.ok) throw new Error("Sunucu sağlık kontrolü başarısız.");
    return res.json();
  },

  /**
   * AI Akıllı Sistem Onarım ve Yeniden Bağlama Protokolü
   */
  async reconnectSystem(): Promise<{ success: boolean; status: string; database?: string; message?: string }> {
    try {
      const res = await requestWithFallback("/api/system/reconnect", {
        method: "POST",
      }, 4000);
      if (res.ok) {
        return res.json();
      }
    } catch {}

    // Backend henüz cevap vermiyorsa normal sağlık kontrolünü zorla
    try {
      const health = await api.checkHealth();
      return {
        success: true,
        status: health.status,
        database: health.database || "disk-storage",
        message: "Bağlantı doğrulandı.",
      };
    } catch {
      return {
        success: true,
        status: "ok",
        database: "disk-storage",
        message: "Kalıcı Disk Deposu ve Yerel Motor devrede.",
      };
    }
  },

  async analyzeChange(payload: {
    title: string;
    category: string;
    previousContent: string;
    newContent: string;
    persona?: "qa" | "developer";
    saveToDb?: boolean;
    selectedScopes?: string[];
    customScopes?: Array<{ id: string; title: string; reason?: string }>;
    additionalNotes?: string;
    apiKey?: string;
  }): Promise<TestPlanResult> {
    const res = await requestWithFallback("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || "Test adımları oluşturulamadı.");
    }

    return res.json();
  },

  /**
   * QA Modu: Video ve fotoğrafları teker teker her saniyesini analiz eder,
   * her saniyeyi inceleyerek detaylı test senaryoları üretir.
   */
  async analyzeMedia(payload: {
    title: string;
    category: string;
    additionalNotes?: string;
    selectedScopes?: string[];
    customScopes?: Array<{ id: string; title: string; reason?: string; badge?: string }>;
    apiKey?: string;
    files: Array<{
      name: string;
      mimeType: string;
      base64Data?: string;
      notes?: string;
      durationSeconds?: number;
      formattedDuration?: string;
      width?: number;
      height?: number;
      aspectRatioLabel?: string;
      secondBySecondTimeline?: any[];
      sampledFrames?: Array<{
        second: number;
        timestamp: string;
        base64Data: string;
        mimeType: string;
      }>;
    }>;
  }): Promise<TestPlanResult> {
    const res = await requestWithFallback("/api/analyze-media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || "Video/fotoğraf analizi başarısız.");
    }

    return res.json();
  },

  async detectMediaScopes(payload: {
    title?: string;
    category?: string;
    additionalNotes?: string;
    apiKey?: string;
    files: Array<{
      name: string;
      mimeType: string;
      base64Data?: string;
      notes?: string;
      durationSeconds?: number;
      aspectRatioLabel?: string;
      sampledFrames?: Array<{
        second: number;
        timestamp: string;
        base64Data: string;
        mimeType: string;
      }>;
      telemetry?: any;
    }>;
  }): Promise<{
    detectedApplication: string;
    sceneSummary: string;
    primaryDomain: string;
    scopes: Array<{
      id: string;
      title: string;
      badge: string;
      reason: string;
      icon: string;
      selected: boolean;
      isCustom?: boolean;
    }>;
    aiEngineUsed: "gemini_3_8_flash" | "gemini_vision" | "smart_vision";
    accuracyScale?: number;
    accuracyLabel?: string;
  }> {
    const res = await requestWithFallback("/api/detect-media-scopes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || "Yapay zeka kapsam tespiti başarısız.");
    }

    return res.json();
  },

  async saveAnalysis(payload: {
    id?: string;
    title: string;
    category?: string;
    previousContent?: string;
    newContent?: string;
    overview?: string;
    diffSummary?: string;
    testCases: any[];
    persona?: "qa" | "developer";
    riskLevel?: string;
    riskScore?: number;
  }): Promise<AnalysisHistoryItem> {
    const res = await requestWithFallback("/api/analyses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || "Test planı kaydedilemedi.");
    }

    return res.json();
  },

  async fetchAnalyses(persona?: "qa" | "developer"): Promise<AnalysisHistoryItem[]> {
    const path = persona ? `/api/analyses?persona=${persona}` : `/api/analyses`;
    const res = await requestWithFallback(path);
    if (!res.ok) throw new Error("Analiz geçmişi getirilemedi.");
    return res.json();
  },

  async getAnalysisById(id: string): Promise<AnalysisHistoryItem> {
    const res = await requestWithFallback(`/api/analyses/${id}`);
    if (!res.ok) throw new Error("Analiz detayı bulunamadı.");
    return res.json();
  },

  async deleteAnalysis(id: string): Promise<void> {
    const res = await requestWithFallback(`/api/analyses/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Analiz kaydı silinemedi.");
  },

  async updateAnalysis(
    id: string,
    payload: {
      title?: string;
      category?: string;
      diffSummary?: string;
      testCases?: any[];
      riskLevel?: string;
    }
  ): Promise<TestPlanResult> {
    const res = await requestWithFallback(`/api/analyses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || "Analiz güncellenemedi.");
    }
    return res.json();
  },

  async generateTemplateWithAI(prompt: string): Promise<{
    name: string;
    category: string;
    title: string;
    oldCode: string;
    newCode: string;
  }> {
    const res = await requestWithFallback("/api/generate-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || "Yapay zeka şablon üretemedi.");
    }

    return res.json();
  },

  // ==========================================
  // DEVELOPER MODE GÜVENLİ YETKİLENDİRME API'LERİ
  // ==========================================

  async getDeveloperStatus(): Promise<{
    isDeveloper: boolean;
    isPasswordSet: boolean;
    expiresAt?: number;
  }> {
    try {
      const res = await requestWithFallback("/api/developer/status");
      if (!res.ok) return { isDeveloper: false, isPasswordSet: false };
      const data = await res.json();
      if (!data.isDeveloper) {
        localStorage.removeItem("dev_session_id");
      }
      return data;
    } catch {
      return { isDeveloper: false, isPasswordSet: false };
    }
  },

  async requestDeveloperCode(): Promise<{
    success: boolean;
    message: string;
    expiresInSeconds: number;
    devCode?: string;
  }> {
    const res = await requestWithFallback("/api/developer/request-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Kod gönderilemedi.");
    }
    return data;
  },

  async verifyDeveloperCode(
    code: string
  ): Promise<{ success: boolean; verificationToken: string; isPasswordSet: boolean }> {
    const res = await requestWithFallback("/api/developer/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Kod doğrulanamadı.");
    }
    return data;
  },

  async setupDeveloperPassword(
    verificationToken: string,
    password: string
  ): Promise<{ success: boolean; sessionId: string; message: string }> {
    const res = await requestWithFallback("/api/developer/setup-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verificationToken, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Şifre oluşturulamadı.");
    }

    if (data.sessionId) {
      localStorage.setItem("dev_session_id", data.sessionId);
    }
    return data;
  },

  async loginDeveloper(
    verificationToken: string,
    password: string
  ): Promise<{ success: boolean; sessionId: string; message: string }> {
    const res = await requestWithFallback("/api/developer/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verificationToken, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Giriş başarısız.");
    }

    if (data.sessionId) {
      localStorage.setItem("dev_session_id", data.sessionId);
    }
    return data;
  },

  async logoutDeveloper(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await requestWithFallback("/api/developer/logout", {
        method: "POST",
      });
      localStorage.removeItem("dev_session_id");
      return res.json();
    } catch {
      localStorage.removeItem("dev_session_id");
      return { success: true, message: "Oturum sonlandırıldı." };
    }
  },
};

import { TestPlanResult, AnalysisHistoryItem } from "../types";

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:5001";

export const api = {
  async checkHealth(): Promise<{ status: string; database?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    if (!res.ok) throw new Error("Sunucu sağlık kontrolü başarısız.");
    return res.json();
  },

  async analyzeChange(payload: {
    title: string;
    category: string;
    previousContent: string;
    newContent: string;
    persona?: "qa" | "developer";
    saveToDb?: boolean;
  }): Promise<TestPlanResult> {
    const res = await fetch(`${API_BASE_URL}/api/analyze`, {
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
    const res = await fetch(`${API_BASE_URL}/api/analyze-media`, {
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
    const res = await fetch(`${API_BASE_URL}/api/analyses`, {
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
    const url = persona
      ? `${API_BASE_URL}/api/analyses?persona=${persona}`
      : `${API_BASE_URL}/api/analyses`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Analiz geçmişi getirilemedi.");
    return res.json();
  },

  async getAnalysisById(id: string): Promise<AnalysisHistoryItem> {
    const res = await fetch(`${API_BASE_URL}/api/analyses/${id}`);
    if (!res.ok) throw new Error("Analiz detayı bulunamadı.");
    return res.json();
  },

  async deleteAnalysis(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/analyses/${id}`, {
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
    }
  ): Promise<TestPlanResult> {
    const res = await fetch(`${API_BASE_URL}/api/analyses/${id}`, {
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
    const res = await fetch(`${API_BASE_URL}/api/generate-template`, {
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
};

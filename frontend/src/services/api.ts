import { TestPlanResult, AnalysisHistoryItem } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

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
  }): Promise<TestPlanResult> {
    const res = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Test adımları oluşturulamadı.");
    }

    return res.json();
  },

  async fetchAnalyses(): Promise<AnalysisHistoryItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/analyses`);
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
      throw new Error(err.error || "Analiz güncellenemedi.");
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
      throw new Error(err.error || "Yapay zeka şablon üretemedi.");
    }

    return res.json();
  },
};

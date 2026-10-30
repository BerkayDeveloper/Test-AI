import { Request, Response } from "express";
import { generateUniversalTestPlan } from "../services/testPlanGenerator";
import { dbService } from "../services/dbService";

export const analysisController = {
  // POST /api/analyze
  async analyzeChange(req: Request, res: Response) {
    try {
      const { title, category, previousContent, newContent, persona } = req.body;

      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ error: "Lütfen bir değişiklik veya görev başlığı girin." });
      }

      if (!newContent || typeof newContent !== "string" || newContent.trim().length === 0) {
        return res.status(400).json({ error: "Lütfen değişiklik içeriğini (kod, prompt veya yüklenen doküman metni) girin." });
      }

      const safeOldText = typeof previousContent === "string" ? previousContent : "";
      const safeNewText = newContent;
      const safeCategory = typeof category === "string" && category.trim() ? category : "code";
      const safePersona = persona === "developer" ? "developer" : "qa";

      // Test Adımları Motorunu Çalıştır
      const testPlan = generateUniversalTestPlan(title, safeCategory, safeOldText, safeNewText, safePersona);

      // Veritabanına kaydet (previousContent ve newContent TAM OLARAK saklanır)
      const id = `analysis-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const riskLevel =
        testPlan.criticalTestCount >= 4 ? "CRITICAL" : testPlan.criticalTestCount >= 2 ? "HIGH" : "MEDIUM";
      const riskScore = Math.min(testPlan.criticalTestCount * 15 + 25, 95);

      const saved = await dbService.createAnalysis({
        id,
        title,
        category: safeCategory,
        previousContent: safeOldText,
        newContent: safeNewText,
        diffSummary: testPlan.overview,
        riskLevel,
        riskScore,
        impactAreas: JSON.stringify(testPlan.testCases.map((t) => t.title)),
        recommendations: JSON.stringify(testPlan.testCases),
      });

      return res.json({
        id: saved.id,
        title,
        category: safeCategory,
        createdAt: saved.createdAt.toISOString(),
        previousContent: safeOldText,
        newContent: safeNewText,
        ...testPlan,
      });
    } catch (error: any) {
      console.error("Test adımları üretim hatası:", error);
      return res.status(500).json({ error: "Test adımları üretilirken hata oluştu: " + error.message });
    }
  },

  // GET /api/analyses
  async getAnalyses(_req: Request, res: Response) {
    try {
      const records = await dbService.getAllAnalyses();
      const formatted = records.map((r) => {
        let testCases = [];
        try {
          testCases = JSON.parse(r.recommendations);
        } catch {}

        let impactAreas = [];
        try {
          impactAreas = JSON.parse(r.impactAreas);
        } catch {}

        return {
          id: r.id,
          title: r.title,
          category: r.category,
          diffSummary: r.diffSummary,
          riskLevel: r.riskLevel,
          riskScore: r.riskScore,
          previousContent: r.previousContent,
          newContent: r.newContent,
          createdAt: r.createdAt.toISOString(),
          testCases,
          impactAreas,
          totalTestCount: testCases.length,
        };
      });

      return res.json(formatted);
    } catch (error: any) {
      console.error("Analiz listeleme hatası:", error);
      return res.status(500).json({ error: "Analiz geçmişi getirilirken hata oluştu: " + error.message });
    }
  },

  // GET /api/analyses/:id
  async getAnalysisById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const record = await dbService.getAnalysisById(id);

      if (!record) {
        return res.status(404).json({ error: "Belirtilen analiz kaydı bulunamadı." });
      }

      let testCases = [];
      try {
        testCases = JSON.parse(record.recommendations);
      } catch {}

      return res.json({
        id: record.id,
        title: record.title,
        category: record.category,
        diffSummary: record.diffSummary,
        riskLevel: record.riskLevel,
        riskScore: record.riskScore,
        previousContent: record.previousContent,
        newContent: record.newContent,
        createdAt: record.createdAt.toISOString(),
        testCases,
        totalTestCount: testCases.length,
      });
    } catch (error: any) {
      return res.status(500).json({ error: "Analiz detayı alınamadı: " + error.message });
    }
  },

  // DELETE /api/analyses/:id
  async deleteAnalysis(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const success = await dbService.deleteAnalysis(id);
      if (!success) {
        return res.status(404).json({ error: "Silinecek kayıt bulunamadı." });
      }
      return res.json({ message: "Analiz kaydı başarıyla silindi.", id });
    } catch (error: any) {
      return res.status(500).json({ error: "Analiz silinemedi: " + error.message });
    }
  },

  // PUT /api/analyses/:id
  async updateAnalysis(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, category, diffSummary, testCases } = req.body;

      const updateData: any = {};
      if (typeof title === "string") updateData.title = title;
      if (typeof category === "string") updateData.category = category;
      if (typeof diffSummary === "string") updateData.diffSummary = diffSummary;

      if (Array.isArray(testCases)) {
        updateData.recommendations = JSON.stringify(testCases);
        updateData.impactAreas = JSON.stringify(testCases.map((t: any) => t.title || ""));
        const criticalCount = testCases.filter((t: any) => t.priority?.includes("P1") || t.priority?.includes("P2")).length;
        updateData.riskLevel = criticalCount >= 4 ? "CRITICAL" : criticalCount >= 2 ? "HIGH" : "MEDIUM";
        updateData.riskScore = Math.min(criticalCount * 15 + 25, 95);
      }

      const updated = await dbService.updateAnalysis(id, updateData);
      if (!updated) {
        return res.status(404).json({ error: "Güncellenecek kayıt bulunamadı." });
      }

      let parsedCases = [];
      try {
        parsedCases = JSON.parse(updated.recommendations);
      } catch {}

      return res.json({
        id: updated.id,
        title: updated.title,
        category: updated.category,
        diffSummary: updated.diffSummary,
        riskLevel: updated.riskLevel,
        riskScore: updated.riskScore,
        previousContent: updated.previousContent,
        newContent: updated.newContent,
        createdAt: updated.createdAt.toISOString(),
        testCases: parsedCases,
        totalTestCount: parsedCases.length,
      });
    } catch (error: any) {
      return res.status(500).json({ error: "Analiz güncellenemedi: " + error.message });
    }
  },
};

import { Request, Response } from "express";
import { generateUniversalTestPlan } from "../services/testPlanGenerator";
import { dbService } from "../services/dbService";
import { cleanTitle, cleanTestCase, cleanStepText } from "../utils/titleCleaner";

export const analysisController = {
  // POST /api/analyze
  async analyzeChange(req: Request, res: Response) {
    try {
      const { title, category, previousContent, newContent, persona, saveToDb } = req.body;

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
      testPlan.testCases = testPlan.testCases.map((tc) => cleanTestCase(tc, true));

      const id = `analysis-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const riskLevel =
        testPlan.criticalTestCount >= 4 ? "CRITICAL" : testPlan.criticalTestCount >= 2 ? "HIGH" : "MEDIUM";
      const riskScore = Math.min(testPlan.criticalTestCount * 15 + 25, 95);

      // Yalnızca saveToDb açıkça true olarak gönderilmişse veritabanına otomatik ekle
      if (saveToDb === true) {
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
          persona: safePersona,
        });

        return res.json({
          id: saved.id,
          title,
          category: safeCategory,
          createdAt: saved.createdAt.toISOString(),
          previousContent: safeOldText,
          newContent: safeNewText,
          persona: safePersona,
          riskLevel,
          riskScore,
          ...testPlan,
        });
      }

      // Varsayılan: Doğrudan test planlarına eklemeden önizleme için sonucu döndür
      return res.json({
        id,
        title,
        category: safeCategory,
        createdAt: new Date().toISOString(),
        previousContent: safeOldText,
        newContent: safeNewText,
        persona: safePersona,
        riskLevel,
        riskScore,
        ...testPlan,
      });
    } catch (error: any) {
      console.error("Test adımları üretim hatası:", error);
      return res.status(500).json({ error: "Test adımları üretilirken hata oluştu: " + error.message });
    }
  },

  // POST /api/analyses (Oluşturulan test planını arşive/veritabanına kaydet)
  async saveAnalysis(req: Request, res: Response) {
    try {
      const {
        id,
        title,
        category,
        previousContent,
        newContent,
        overview,
        diffSummary,
        testCases,
        persona,
        riskLevel: customRiskLevel,
        riskScore: customRiskScore,
      } = req.body;

      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ error: "Lütfen bir test planı başlığı girin." });
      }

      const safeId =
        id && typeof id === "string" && id.trim().length > 0
          ? id
          : `analysis-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const safeOldText = typeof previousContent === "string" ? previousContent : "";
      const safeNewText = typeof newContent === "string" ? newContent : "";
      const safeCategory = typeof category === "string" && category.trim() ? category : "code";
      const safePersona: "qa" | "developer" = persona === "developer" ? "developer" : "qa";
      const cases = Array.isArray(testCases)
        ? testCases.map((tc: any) => cleanTestCase(tc, true))
        : [];

      const criticalCount = cases.filter(
        (t: any) =>
          t.priority?.includes("Kritik") ||
          t.priority?.includes("Yüksek") ||
          t.priority?.includes("P1") ||
          t.priority?.includes("P2")
      ).length;

      const riskLevel =
        customRiskLevel || (criticalCount >= 4 ? "CRITICAL" : criticalCount >= 2 ? "HIGH" : "MEDIUM");
      const riskScore = customRiskScore ?? Math.min(criticalCount * 15 + 25, 95);
      const summary = diffSummary || overview || "Oluşturulan Test Planı";

      const saved = await dbService.createAnalysis({
        id: safeId,
        title,
        category: safeCategory,
        previousContent: safeOldText,
        newContent: safeNewText,
        diffSummary: summary,
        riskLevel,
        riskScore,
        impactAreas: JSON.stringify(cases.map((t: any) => cleanTitle(t.title || ""))),
        recommendations: JSON.stringify(cases),
        persona: safePersona,
      });

      return res.status(201).json({
        id: saved.id,
        title: saved.title,
        category: saved.category,
        diffSummary: saved.diffSummary,
        overview: saved.diffSummary,
        riskLevel: saved.riskLevel,
        riskScore: saved.riskScore,
        previousContent: saved.previousContent,
        newContent: saved.newContent,
        createdAt: saved.createdAt.toISOString(),
        testCases: cases,
        totalTestCount: cases.length,
        criticalTestCount: criticalCount,
        persona: saved.persona || safePersona,
      });
    } catch (error: any) {
      console.error("Test planı kaydetme hatası:", error);
      return res.status(500).json({ error: "Test planı kaydedilirken hata oluştu: " + error.message });
    }
  },

  // GET /api/analyses
  async getAnalyses(req: Request, res: Response) {
    try {
      const records = await dbService.getAllAnalyses();
      const formatted = records.map((r) => {
        let testCases: any[] = [];
        try {
          testCases = JSON.parse(r.recommendations);
        } catch {}

        testCases = testCases.map((tc) => cleanTestCase(tc, true));

        const impactAreas = testCases.map((t) => t.title);

        // Persona belirleme: Eğer kayıtta yoksa diffSummary veya overview içeriğindeki etiketten çıkar
        const resolvedPersona: "qa" | "developer" =
          r.persona ||
          (r.diffSummary.includes("[QA") || r.diffSummary.includes("Tester") ? "qa" : "developer");

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
          persona: resolvedPersona,
        };
      });

      // İsteğe bağlı query filtresi: /api/analyses?persona=qa
      const { persona } = req.query;
      const result =
        persona && (persona === "qa" || persona === "developer")
          ? formatted.filter((item) => item.persona === persona)
          : formatted;

      return res.json(result);
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

      let testCases: any[] = [];
      try {
        testCases = JSON.parse(record.recommendations);
      } catch {}

      testCases = testCases.map((tc) => cleanTestCase(tc, true));

      const resolvedPersona: "qa" | "developer" =
        record.persona ||
        (record.diffSummary.includes("[QA") || record.diffSummary.includes("Tester") ? "qa" : "developer");

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
        persona: resolvedPersona,
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
        const cleanedCases = testCases.map((tc: any) => cleanTestCase(tc, true));
        updateData.recommendations = JSON.stringify(cleanedCases);
        updateData.impactAreas = JSON.stringify(cleanedCases.map((t: any) => t.title || ""));
        const criticalCount = cleanedCases.filter(
          (t: any) =>
            t.priority?.includes("Kritik") ||
            t.priority?.includes("Yüksek") ||
            t.priority?.includes("P1") ||
            t.priority?.includes("P2")
        ).length;
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
        persona: updated.persona || (updated.diffSummary.includes("[QA") ? "qa" : "developer"),
      });
    } catch (error: any) {
      return res.status(500).json({ error: "Analiz güncellenemedi: " + error.message });
    }
  },
};

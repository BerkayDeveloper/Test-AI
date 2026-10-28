import { Request, Response } from "express";
import { aiService } from "../services/aiService";

export const templateController = {
  // POST /api/generate-template
  async generateTemplate(req: Request, res: Response) {
    try {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
        return res.status(400).json({ error: "Lütfen bir prompt (senaryo açıklaması) yazın." });
      }

      const template = await aiService.generateCodeTemplate(prompt.trim());
      return res.json(template);
    } catch (error: any) {
      console.error("Şablon üretim hatası:", error);
      return res.status(500).json({ error: "Şablon üretilirken hata oluştu: " + error.message });
    }
  },
};

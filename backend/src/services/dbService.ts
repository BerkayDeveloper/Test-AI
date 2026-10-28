import { PrismaClient } from "@prisma/client";
import { AnalysisRecord } from "../types";

const prisma = new PrismaClient();

// In-memory fallback deposu (Veritabanı bağlantısı koparsa sistemin çalışmaya devam etmesi için)
const inMemoryAnalyses: Map<string, AnalysisRecord> = new Map();
let isPrismaAvailable = false;

// İlk bağlantı kontrolü
prisma.$connect()
  .then(() => {
    isPrismaAvailable = true;
    console.log("✅ PostgreSQL veritabanına başarıyla bağlanıldı.");
  })
  .catch((err) => {
    isPrismaAvailable = false;
    console.warn("⚠️ PostgreSQL bağlantısı kurulamadı (In-Memory depolama devrede):", err.message);
  });

export const dbService = {
  async createAnalysis(data: {
    id: string;
    title: string;
    category: string;
    previousContent: string;
    newContent: string;
    diffSummary: string;
    riskLevel: string;
    riskScore: number;
    impactAreas: string;
    recommendations: string;
  }): Promise<AnalysisRecord> {
    const record: AnalysisRecord = {
      id: data.id,
      title: data.title,
      category: data.category,
      previousContent: data.previousContent,
      newContent: data.newContent,
      diffSummary: data.diffSummary,
      riskLevel: data.riskLevel,
      riskScore: data.riskScore,
      impactAreas: data.impactAreas,
      recommendations: data.recommendations,
      createdAt: new Date(),
    };

    if (isPrismaAvailable) {
      try {
        const saved = await prisma.analysis.create({
          data: {
            id: record.id,
            title: record.title,
            category: record.category,
            previousContent: record.previousContent,
            newContent: record.newContent,
            diffSummary: record.diffSummary,
            riskLevel: record.riskLevel,
            riskScore: record.riskScore,
            impactAreas: record.impactAreas,
            recommendations: record.recommendations,
          },
        });
        return saved;
      } catch (err: any) {
        console.warn("Prisma kaydı başarısız oldu, in-memory depoya yazılıyor:", err.message);
      }
    }

    inMemoryAnalyses.set(record.id, record);
    return record;
  },

  async getAllAnalyses(): Promise<AnalysisRecord[]> {
    if (isPrismaAvailable) {
      try {
        return await prisma.analysis.findMany({
          orderBy: { createdAt: "desc" },
        });
      } catch (err: any) {
        console.warn("Prisma sorgusu başarısız, in-memory depodan okunuyor:", err.message);
      }
    }

    return Array.from(inMemoryAnalyses.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  },

  async getAnalysisById(id: string): Promise<AnalysisRecord | null> {
    if (isPrismaAvailable) {
      try {
        const record = await prisma.analysis.findUnique({ where: { id } });
        if (record) return record;
      } catch (err: any) {
        console.warn("Prisma tekil sorgu hatası:", err.message);
      }
    }

    return inMemoryAnalyses.get(id) || null;
  },

  async deleteAnalysis(id: string): Promise<boolean> {
    if (isPrismaAvailable) {
      try {
        await prisma.analysis.delete({ where: { id } });
        return true;
      } catch (err: any) {
        console.warn("Prisma silme hatası:", err.message);
      }
    }

    return inMemoryAnalyses.delete(id);
  },

  async isHealthy(): Promise<boolean> {
    if (!isPrismaAvailable) return false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  },
};

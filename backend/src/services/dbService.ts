import { PrismaClient } from "@prisma/client";
import { AnalysisRecord, TestExecutionRecord, TestCaseExecutionStateItem } from "../types";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// Kalıcı yerel disk dosya deposu (PostgreSQL bağlantısı kesilse veya kapansa bile verilerin asla kaybolmaması için)
const DATA_DIR = path.join(__dirname, "../../data");
const DISK_FILE = path.join(DATA_DIR, "analyses_db.json");
const EXECUTIONS_DISK_FILE = path.join(DATA_DIR, "executions_db.json");

const inMemoryAnalyses: Map<string, AnalysisRecord> = new Map();
const inMemoryExecutions: Map<string, TestExecutionRecord> = new Map();
let isPrismaAvailable = false;

// Diskten mevcut kayıtları yükle
function loadFromDisk(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DISK_FILE)) {
      const raw = fs.readFileSync(DISK_FILE, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach((item: any) => {
          inMemoryAnalyses.set(item.id, {
            ...item,
            createdAt: new Date(item.createdAt),
          });
        });
        console.log(`📂 Yerel disk deposundan ${list.length} adet analiz kaydı yüklendi.`);
      }
    }

    if (fs.existsSync(EXECUTIONS_DISK_FILE)) {
      const rawExec = fs.readFileSync(EXECUTIONS_DISK_FILE, "utf-8");
      const execList = JSON.parse(rawExec);
      if (Array.isArray(execList)) {
        execList.forEach((item: TestExecutionRecord) => {
          inMemoryExecutions.set(item.analysisId, item);
        });
        console.log(`📂 Yerel disk deposundan ${execList.length} adet test koşum (execution) kaydı yüklendi.`);
      }
    }
  } catch (err: any) {
    console.warn("Yerel disk deposu okunurken hata:", err.message);
  }
}

// Diske kaydet
function saveToDisk(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const list = Array.from(inMemoryAnalyses.values());
    fs.writeFileSync(DISK_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err: any) {
    console.warn("Yerel diske analizler kaydedilirken hata:", err.message);
  }
}

function saveExecutionsToDisk(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const list = Array.from(inMemoryExecutions.values());
    fs.writeFileSync(EXECUTIONS_DISK_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err: any) {
    console.warn("Yerel diske test koşumları kaydedilirken hata:", err.message);
  }
}

loadFromDisk();

async function ensureSchema(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Analysis" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "category" TEXT NOT NULL DEFAULT 'code',
        "previousContent" TEXT NOT NULL DEFAULT '',
        "newContent" TEXT NOT NULL DEFAULT '',
        "diffSummary" TEXT NOT NULL,
        "riskLevel" TEXT NOT NULL,
        "riskScore" INTEGER NOT NULL,
        "impactAreas" TEXT NOT NULL,
        "recommendations" TEXT NOT NULL,
        "persona" TEXT NOT NULL DEFAULT 'qa',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Analysis" ADD COLUMN IF NOT EXISTS "persona" TEXT DEFAULT 'qa'
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TestExecution" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "analysisId" TEXT NOT NULL UNIQUE,
        "executionState" TEXT NOT NULL,
        "overallStatus" TEXT NOT NULL DEFAULT 'in_progress',
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ PostgreSQL şeması ve tablolar doğrulandı.");
  } catch (err: any) {
    console.warn("PostgreSQL şema kontrolü uyarısı:", err.message);
  }
}

// İlk bağlantı kontrolü ve dayanıklı bağlantı yöneticisi
let isConnecting = false;
let lastPrismaConnectAttempt = 0;
const PRISMA_CONNECT_COOLDOWN_MS = 30000; // 30 saniye boyunca tekrar tekrar prisma.$connect çağırıp sistemi kilitleme

// Zaman aşımlı Prisma bağlantı denemesi (asla Express veya HTTP isteklerini kilitlemez)
async function tryConnectPrisma(timeoutMs = 1500): Promise<boolean> {
  if (isPrismaAvailable) return true;
  if (isConnecting) return false;

  isConnecting = true;
  lastPrismaConnectAttempt = Date.now();

  try {
    const connectPromise = (async () => {
      await prisma.$connect();
      isPrismaAvailable = true;
      await ensureSchema();
      console.log("✅ PostgreSQL veritabanına başarıyla bağlanıldı.");
      return true;
    })();

    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error("PostgreSQL bağlantı zaman aşımı")), timeoutMs);
    });

    const res = await Promise.race([connectPromise, timeoutPromise]);
    isConnecting = false;
    return Boolean(res);
  } catch (err: any) {
    isPrismaAvailable = false;
    isConnecting = false;
    return false;
  }
}

// Sunucu başlangıcında arka planda hızlı tek seferlik kontrol (1500ms limitli)
tryConnectPrisma(1500).then((connected) => {
  if (!connected) {
    console.log("📂 PostgreSQL çevrimdışı. Kalıcı yerel disk deposu (JSON Store) kesintisiz ve aktif.");
  }
});

async function getActivePrisma(): Promise<PrismaClient | null> {
  if (isPrismaAvailable) return prisma;

  // Son denemeden bu yana 30 saniye geçmediyse veya şu an zaten bağlanılıyorsa,
  // HTTP isteğini ASLA BLOKE ETME! Anında null dön ve kalıcı yerel disk deposunu kullan.
  const now = Date.now();
  if (now - lastPrismaConnectAttempt < PRISMA_CONNECT_COOLDOWN_MS || isConnecting) {
    return null;
  }

  // Süre dolmuşsa arka planda sessizce bağlanmayı dene, mevcut isteği geciktirme
  tryConnectPrisma(1500).catch(() => {});
  return null;
}

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
    persona?: "qa" | "developer";
  }): Promise<AnalysisRecord> {
    const persona = data.persona || "qa";
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
      persona,
    };

    // Kalıcı yerel belleğe ve diske hemen yaz (Garanti koruma)
    inMemoryAnalyses.set(record.id, record);
    saveToDisk();

    const p = await getActivePrisma();
    if (p) {
      try {
        const saved = await p.analysis.upsert({
          where: { id: record.id },
          create: {
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
            persona,
          },
          update: {
            title: record.title,
            category: record.category,
            diffSummary: record.diffSummary,
            riskLevel: record.riskLevel,
            riskScore: record.riskScore,
            impactAreas: record.impactAreas,
            recommendations: record.recommendations,
            persona,
          },
        });
        console.log("✅ Analiz PostgreSQL veritabanına başarıyla kaydedildi:", saved.id);
        return { ...saved, persona: (saved.persona || persona) as any };
      } catch (err: any) {
        console.warn("PostgreSQL Prisma kaydı başarısız oldu, kalıcı disk deposu korundu:", err.message);
      }
    }

    return record;
  },

  async getAllAnalyses(): Promise<AnalysisRecord[]> {
    const p = await getActivePrisma();
    if (p) {
      try {
        const rows = await p.analysis.findMany({
          orderBy: { createdAt: "desc" },
        });
        if (rows && rows.length > 0) {
          // PostgreSQL'deki verileri yerel diske de senkronize et
          rows.forEach((r) => {
            inMemoryAnalyses.set(r.id, {
              ...r,
              persona: (r.persona || "qa") as any,
            });
          });
          saveToDisk();
          return rows.map((r) => ({
            ...r,
            persona: (r.persona || "qa") as any,
          }));
        }
      } catch (err: any) {
        console.warn("PostgreSQL Prisma sorgusu başarısız, yerel depodan okunuyor:", err.message);
      }
    }

    return Array.from(inMemoryAnalyses.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  },

  async getAnalysisById(id: string): Promise<AnalysisRecord | null> {
    const p = await getActivePrisma();
    if (p) {
      try {
        const record = await p.analysis.findUnique({ where: { id } });
        if (record) {
          return {
            ...record,
            persona: (record.persona || "qa") as any,
          };
        }
      } catch (err: any) {
        console.warn("PostgreSQL tekil sorgu hatası:", err.message);
      }
    }

    return inMemoryAnalyses.get(id) || null;
  },

  async deleteAnalysis(id: string): Promise<boolean> {
    const p = await getActivePrisma();
    if (p) {
      try {
        await p.analysis.delete({ where: { id } });
      } catch (err: any) {
        console.warn("PostgreSQL silme hatası:", err.message);
      }
    }

    const deleted = inMemoryAnalyses.delete(id);
    saveToDisk();
    return deleted;
  },

  async updateAnalysis(
    id: string,
    data: Partial<Omit<AnalysisRecord, "id" | "createdAt">>
  ): Promise<AnalysisRecord | null> {
    const p = await getActivePrisma();
    if (p) {
      try {
        const updated = await p.analysis.update({
          where: { id },
          data: {
            title: data.title,
            category: data.category,
            diffSummary: data.diffSummary,
            riskLevel: data.riskLevel,
            riskScore: data.riskScore,
            impactAreas: data.impactAreas,
            recommendations: data.recommendations,
            persona: data.persona,
          },
        });
        const full = { ...updated, persona: (updated.persona || data.persona || "qa") as any };
        inMemoryAnalyses.set(id, full);
        saveToDisk();
        return full;
      } catch (err: any) {
        console.warn("PostgreSQL güncelleme hatası, yerel disk güncelleniyor:", err.message);
      }
    }

    const existing = inMemoryAnalyses.get(id);
    if (!existing) return null;
    const updatedRecord: AnalysisRecord = {
      ...existing,
      ...data,
    };
    inMemoryAnalyses.set(id, updatedRecord);
    saveToDisk();
    return updatedRecord;
  },

  async getExecution(analysisId: string): Promise<TestExecutionRecord | null> {
    if (isPrismaAvailable) {
      try {
        const rows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "TestExecution" WHERE "analysisId" = $1 LIMIT 1`,
          analysisId
        );
        if (rows && rows.length > 0) {
          const row = rows[0];
          return {
            id: row.id,
            analysisId: row.analysisId,
            executionState: typeof row.executionState === "string" ? JSON.parse(row.executionState) : row.executionState,
            overallStatus: row.overallStatus,
            updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
          };
        }
      } catch (err: any) {
        console.warn("PostgreSQL getExecution hatası, yerel diske bakılıyor:", err.message);
      }
    }

    return inMemoryExecutions.get(analysisId) || null;
  },

  async saveExecution(
    analysisId: string,
    executionState: Record<string, TestCaseExecutionStateItem>,
    overallStatus: "pending" | "in_progress" | "passed" | "failed" = "in_progress"
  ): Promise<TestExecutionRecord> {
    const updatedAt = new Date().toISOString();
    const existing = inMemoryExecutions.get(analysisId);
    const id = existing?.id || `exec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const record: TestExecutionRecord = {
      id,
      analysisId,
      executionState,
      overallStatus,
      updatedAt,
    };

    inMemoryExecutions.set(analysisId, record);
    saveExecutionsToDisk();

    if (isPrismaAvailable) {
      try {
        const jsonState = JSON.stringify(executionState);
        await prisma.$executeRawUnsafe(
          `INSERT INTO "TestExecution" ("id", "analysisId", "executionState", "overallStatus", "updatedAt", "createdAt")
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT ("analysisId") DO UPDATE 
           SET "executionState" = $3, "overallStatus" = $4, "updatedAt" = CURRENT_TIMESTAMP`,
          id,
          analysisId,
          jsonState,
          overallStatus
        );
      } catch (err: any) {
        console.warn("PostgreSQL saveExecution hatası, yerel diske yazıldı:", err.message);
      }
    }

    return record;
  },

  async isHealthy(): Promise<boolean> {
    if (!isPrismaAvailable) return false;
    try {
      const queryPromise = prisma.$queryRaw`SELECT 1`;
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Query timeout")), 1000)
      );
      await Promise.race([queryPromise, timeoutPromise]);
      return true;
    } catch {
      isPrismaAvailable = false;
      return false;
    }
  },

  async getHealthStatus(): Promise<{
    healthy: boolean;
    postgresHealthy: boolean;
    database: "connected" | "disk-storage";
    mode: "postgresql" | "disk";
    recordCount: number;
  }> {
    const isPostgresOk = isPrismaAvailable ? await dbService.isHealthy() : false;
    return {
      healthy: true, // Sistem daima sağlıklıdır çünkü disk deposu devrededir
      postgresHealthy: isPostgresOk,
      database: isPostgresOk ? "connected" : "disk-storage",
      mode: isPostgresOk ? "postgresql" : "disk",
      recordCount: inMemoryAnalyses.size,
    };
  },

  async reconnect(force = false): Promise<{ success: boolean; mode: "postgresql" | "disk"; message: string }> {
    if (force) {
      lastPrismaConnectAttempt = 0; // Cooldown süresini sıfırla
    }
    const connected = await tryConnectPrisma(2000);
    if (connected) {
      return {
        success: true,
        mode: "postgresql",
        message: "PostgreSQL veritabanına ve tablolara başarıyla yeniden bağlanıldı.",
      };
    } else {
      isPrismaAvailable = false;
      loadFromDisk();
      return {
        success: true,
        mode: "disk",
        message: "PostgreSQL yanıt vermiyor. Kalıcı yerel disk deposu (JSON Store) kesintisiz ve aktif.",
      };
    }
  },
};

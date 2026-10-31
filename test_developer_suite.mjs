import http from "http";

function sendAnalysisRequest(payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const options = {
      hostname: "localhost",
      port: 4000,
      path: "/api/analyze",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data, error: e.message });
        }
      });
    });

    req.on("error", (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

const testSuites = [
  // 1. ÇOK BASİT - DOKÜMAN / PROMPT
  {
    level: "1. Çok Basit (Doküman/Prompt)",
    name: "Basit Yaş Doğrulama Kuralı",
    payload: {
      title: "Kayıt Yaş Doğrulaması",
      category: "security",
      persona: "developer",
      newContent: "Kullanıcı yaş doğrulama kuralı: 18 yaşından küçük kullanıcılar sisteme üye olamaz. Hatalı yaş girildiğinde AgeRestrictionException fırlatılmalıdır.",
      previousContent: "",
    },
  },
  // 2. ÇOK BASİT - KOD (Tekil Python Fonksiyonu)
  {
    level: "1. Çok Basit (Kod - Python)",
    name: "Basit İndirim Hesaplama Fonksiyonu",
    payload: {
      title: "İndirim Hesaplama Fonksiyonu",
      category: "code",
      persona: "developer",
      newContent: `def calculate_discount(price: float, discount_percent: float) -> float:
    if price < 0 or discount_percent < 0 or discount_percent > 100:
        raise ValueError("Geçersiz fiyat veya indirim oranı")
    return price * (1 - discount_percent / 100)`,
      previousContent: "",
    },
  },
  // 3. ORTA - DOKÜMAN / PROMPT (E-Ticaret Kupon & Sepet)
  {
    level: "2. Orta (Doküman/Prompt)",
    name: "Sepet İndirim Kuponu Doğrulama ve Uygulama",
    payload: {
      title: "Sepet İndirim Kuponu Doğrulama ve Uygulama",
      category: "code",
      persona: "developer",
      newContent: `1. Minimum sepet tutarı 150 TL olmalıdır.
2. İndirim kuponu sepet tutarının maksimum %20'si kadar indirim sağlayabilir.
3. Kupon kodu tek kullanımlıktır ve 15 dakika içinde tamamlanmalıdır.
4. Geçersiz veya kullanılmış kupon girildiğinde CouponInvalidException fırlatılmalıdır.
5. Başarılı işlemde sepet toplamı ve indirim tutarı veritabanı audit loguna yazılmalıdır.`,
      previousContent: "",
    },
  },
  // 4. ORTA - KOD (TypeScript AuthService Sınıfı)
  {
    level: "2. Orta (Kod - TypeScript Sınıfı)",
    name: "JWT Kimlik Doğrulama Servisi",
    payload: {
      title: "JWT Tabanlı Kimlik Doğrulama Servisi",
      category: "security",
      persona: "developer",
      newContent: `export class AuthenticationService {
    private readonly secretKey: string;
    private activeSessions: Map<string, Date> = new Map();

    constructor(secretKey: string) {
        if (!secretKey || secretKey.length < 16) {
            throw new Error("Secret key yetersiz uzunlukta: en az 16 karakter olmalıdır.");
        }
        this.secretKey = secretKey;
    }

    public async authenticateUser(username: string, passwordHash: string): Promise<string> {
        if (!username || !passwordHash) {
            throw new Error("Kullanıcı adı ve şifre hash boş olamaz.");
        }
        return "jwt_token_sample_123";
    }

    public revokeToken(token: string): boolean {
        return this.activeSessions.delete(token);
    }
}`,
      previousContent: "",
    },
  },
  // 5. ORTA - KOD DEĞİŞİKLİĞİ (Diff Karşılaştırması - Unity C#)
  {
    level: "2. Orta (Diff - Unity C#)",
    name: "Karakter Can Yenilenmesi ve Zırh Katsayısı",
    payload: {
      title: "Karakter Can Yenilenmesi ve Zırh Katsayısı Güncellemesi",
      category: "game",
      persona: "developer",
      previousContent: `public class PlayerCombat {
    public int Health = 100;
    public void TakeDamage(int damage) {
        Health -= damage;
    }
}`,
      newContent: `using UnityEngine;

public class PlayerCombat : MonoBehaviour {
    [SerializeField] private int maxHealth = 150;
    [SerializeField] private float armorFactor = 0.25f;
    public int CurrentHealth { get; private set; }

    public void TakeDamage(int damage) {
        if (damage <= 0) return;
        int effectiveDamage = Mathf.RoundToInt(damage * (1f - armorFactor));
        CurrentHealth = Mathf.Max(0, CurrentHealth - effectiveDamage);
    }

    public void Heal(int amount) {
        if (amount <= 0) return;
        CurrentHealth = Mathf.Min(maxHealth, CurrentHealth + amount);
    }
}`,
    },
  },
  // 6. ÇOK KARMAŞIK - DOKÜMAN (Enterprise Dağıtık Ödeme ve Mutabakat Şartnamesi)
  {
    level: "3. Çok Karmaşık (Doküman/Prompt)",
    name: "Çok Kanallı Dağıtık Ödeme ve Mutabakat Sistemi",
    payload: {
      title: "Çok Kanallı Dağıtık Ödeme ve Mutabakat Sistemi Spesifikasyonu",
      category: "security",
      persona: "developer",
      newContent: `1. Tüm ödeme istekleri istemci tarafından iletilen benzersiz X-Idempotency-Key (UUID v4) başlığı ile doğrulanmalıdır; mükerrer anahtarlarda önceki işlem sonucu HTTP 200 ile dönülmelidir.
2. Dağıtık sistemde race condition ve çift çekim riskine karşı Redis tabanlı Redlock dağıtık kilit mekanizması 5000 ms TTL ile devreye alınmalıdır.
3. 3D-Secure doğrulama adımı için azami bekleme süresi 180 saniye olarak tanımlanmıştır; süre aşımında işlem otomatik CANCELLED durumuna çekilmelidir.
4. Ödeme onaylandığında işlem tutarı, POS komisyon oranı (örneğin %1.85 + 0.45 TL) ve net hakediş kuruş hassasiyetinde hesaplanıp Ledger tablosuna çift kayıtlı muhasebe (Double-Entry Bookkeeping) formatında yazılmalıdır.
5. Veritabanı deadlock veya harici gateway zaman aşımı durumunda işlem kuyruğuna (Dead Letter Queue) fırlatılmalı ve 3 kademeli (1s, 5s, 15s) exponential backoff ile tekrar denenmelidir.
6. Kısmi iade (partial refund) işlemlerinde toplam iade tutarı hiçbir koşulda orijinal sipariş tutarını aşamaz; aşması halinde OverRefundLimitException fırlatılmalıdır.`,
      previousContent: "",
    },
  },
  // 7. ÇOK KARMAŞIK - KOD (Çok Sınıflı Dağıtık Sipariş Motoru)
  {
    level: "3. Çok Karmaşık (Kod - Çok Sınıflı / TS)",
    name: "Dağıtık Sipariş ve Stok Rezervasyon Motoru",
    payload: {
      title: "Dağıtık Sipariş İşleme ve Stok Rezervasyon Motoru",
      category: "backend",
      persona: "developer",
      newContent: `import { EventEmitter } from "events";

export interface OrderItem {
    sku: string;
    quantity: number;
    unitPrice: number;
}

export class InventoryCoordinator {
    private stockLevels: Map<string, number> = new Map();

    constructor(initialStock: Record<string, number>) {
        for (const [sku, qty] of Object.entries(initialStock)) {
            this.stockLevels.set(sku, qty);
        }
    }

    public reserveStock(sku: string, qty: number): boolean {
        const current = this.stockLevels.get(sku) || 0;
        if (current < qty || qty <= 0) return false;
        this.stockLevels.set(sku, current - qty);
        return true;
    }

    public releaseStock(sku: string, qty: number): void {
        const current = this.stockLevels.get(sku) || 0;
        this.stockLevels.set(sku, current + qty);
    }
}

export class OrderProcessingEngine {
    private readonly inventory: InventoryCoordinator;
    private readonly eventBus: EventEmitter;
    private isLocked: boolean = false;

    constructor(inventory: InventoryCoordinator, eventBus: EventEmitter) {
        this.inventory = inventory;
        this.eventBus = eventBus;
    }

    public async processOrder(orderId: string, items: OrderItem[]): Promise<boolean> {
        if (!orderId || items.length === 0) {
            throw new Error("Geçersiz sipariş verisi");
        }
        if (this.isLocked) {
            throw new Error("Sistem şu anda meşgul, işlem kuyruğa alınamadı");
        }

        const reservedItems: OrderItem[] = [];
        try {
            for (const item of items) {
                const ok = this.inventory.reserveStock(item.sku, item.quantity);
                if (!ok) {
                    throw new Error("Stok yetersiz: " + item.sku);
                }
                reservedItems.push(item);
            }
            this.eventBus.emit("order.processed", { orderId, items });
            return true;
        } catch (err) {
            for (const item of reservedItems) {
                this.inventory.releaseStock(item.sku, item.quantity);
            }
            throw err;
        }
    }
}`,
      previousContent: "",
    },
  },
  // 8. ÇOK KARMAŞIK - DIFF (Legacy Monolitik Koddan Asenkron Kilitli Saga Mimarisine Geçiş)
  {
    level: "3. Çok Karmaşık (Diff - Refactoring)",
    name: "Sipariş Akışı Dağıtık Kilit & Idempotency Refactor",
    payload: {
      title: "Sipariş Servisi Dağıtık Kilit ve Idempotency Refactor",
      category: "backend",
      persona: "developer",
      previousContent: `export class OrderService {
    public processOrder(orderId: string, amount: number): boolean {
        console.log("Processing order " + orderId);
        return true;
    }
}`,
      newContent: `export class OrderService {
    private readonly redisClient: any;
    private readonly auditLogger: any;
    private readonly idempotencyCache: Set<string> = new Set();

    constructor(redisClient: any, auditLogger: any) {
        this.redisClient = redisClient;
        this.auditLogger = auditLogger;
    }

    public async processOrder(orderId: string, idempotencyKey: string, amount: number): Promise<boolean> {
        if (!idempotencyKey) throw new Error("Idempotency key zorunludur.");
        if (amount <= 0) throw new Error("Tutar pozitif olmalıdır.");
        if (this.idempotencyCache.has(idempotencyKey)) {
            return true; // Mükerrer çağrı engellendi
        }

        const lockAcquired = await this.redisClient.acquireLock("order:" + orderId, 5000);
        if (!lockAcquired) {
            throw new Error("Lock alınamadı, eşzamanlı işlem algılandı.");
        }

        try {
            this.idempotencyCache.add(idempotencyKey);
            await this.auditLogger.logTransaction(orderId, amount, "COMPLETED");
            return true;
        } finally {
            await this.redisClient.releaseLock("order:" + orderId);
        }
    }

    public async rollbackTransaction(orderId: string): Promise<void> {
        await this.auditLogger.logTransaction(orderId, 0, "ROLLED_BACK");
    }
}`,
    },
  },
];

async function runAll() {
  console.log("=== DEVELOPER PERSONA KAPSAMLI TEST KOŞUMU BAŞLATILIYOR ===");
  const results = [];

  for (const t of testSuites) {
    console.log(`\n--- Koşuluyor: [${t.level}] ${t.name} ---`);
    const start = Date.now();
    try {
      const response = await sendAnalysisRequest(t.payload);
      const elapsed = Date.now() - start;
      console.log(`Durum Kodu: ${response.status} (Süre: ${elapsed}ms)`);
      if (response.status === 200) {
        const d = response.data;
        console.log(`Özet: ${d.overview}`);
        console.log(`Tespit Edilen Dil / Tip: ${d.detectedLanguage}`);
        console.log(`Toplam Test Senaryosu: ${d.totalTestCount} (Kritik: ${d.criticalTestCount})`);
        console.log(`Test Senaryoları Başlıkları:`);
        d.testCases.forEach((tc, i) => {
          console.log(`  [${tc.id}] (${tc.priority}) [${tc.targetComponent}] ${tc.title}`);
          console.log(`      Adım Sayısı: ${tc.steps.length}`);
          console.log(`      Örnek Adım 1: ${tc.steps[0]}`);
          console.log(`      Beklenen Sonuç: ${tc.expectedResult}`);
        });

        results.push({
          level: t.level,
          name: t.name,
          status: "SUCCESS",
          elapsed,
          detectedLanguage: d.detectedLanguage,
          totalTestCount: d.totalTestCount,
          criticalTestCount: d.criticalTestCount,
          testCases: d.testCases,
          overview: d.overview,
        });
      } else {
        console.error("HATA YANITI:", response);
        results.push({
          level: t.level,
          name: t.name,
          status: "FAIL",
          error: response.data || response.raw,
        });
      }
    } catch (err) {
      console.error("İstek Hatası:", err);
      results.push({
        level: t.level,
        name: t.name,
        status: "ERROR",
        error: err.message,
      });
    }
  }

  console.log("\n=================== ÖZET SONUÇLAR ===================");
  console.log(JSON.stringify(results.map(r => ({
    level: r.level,
    name: r.name,
    status: r.status,
    lang: r.detectedLanguage,
    testCount: r.totalTestCount,
    criticalCount: r.criticalTestCount
  })), null, 2));

  // Sonuçları JSON olarak kaydet
  import("fs").then(fs => {
    fs.writeFileSync("./developer_test_results.json", JSON.stringify(results, null, 2), "utf-8");
    console.log("Detaylı sonuçlar developer_test_results.json dosyasına yazıldı.");
  });
}

runAll();


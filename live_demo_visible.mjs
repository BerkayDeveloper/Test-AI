import puppeteer from "puppeteer-core";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function showBanner(page, text, icon = "🚀") {
  await page.evaluate((msg, ico) => {
    let banner = document.getElementById("live-demo-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "live-demo-banner";
      banner.style.position = "fixed";
      banner.style.top = "18px";
      banner.style.left = "50%";
      banner.style.transform = "translateX(-50%)";
      banner.style.zIndex = "9999999";
      banner.style.background = "linear-gradient(135deg, #0f172a, #1e293b)";
      banner.style.border = "2px solid #10b981";
      banner.style.color = "#ffffff";
      banner.style.padding = "12px 28px";
      banner.style.borderRadius = "30px";
      banner.style.boxShadow = "0 10px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(16, 185, 129, 0.4)";
      banner.style.fontSize = "16px";
      banner.style.fontWeight = "700";
      banner.style.fontFamily = "sans-serif";
      banner.style.display = "flex";
      banner.style.alignItems = "center";
      banner.style.gap = "12px";
      banner.style.transition = "all 0.3s ease-in-out";
      document.body.appendChild(banner);
    }
    banner.innerHTML = `<span style="font-size: 22px;">${ico}</span> <span>${msg}</span>`;
  }, text, icon);
}

async function runLiveVisibleDemo() {
  console.log("===============================================================");
  console.log("🖥️  GÖRSEL & CANLI DEVELOPER MODU DEMOSU BAŞLATILIYOR...");
  console.log("    (Kullanıcının ekranında Chrome penceresi açılacaktır)");
  console.log("===============================================================");

  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: false,
    defaultViewport: null,
    args: [
      "--start-maximized",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-infobars",
    ],
  });

  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  try {
    // 1. Sayfayı Aç
    await page.goto("http://localhost:3000", { waitUntil: "networkidle0" });
    await sleep(1500);

    await showBanner(page, "1/5: Canlı Sistem ve Veritabanı Bağlantısı Kontrol Edildi", "🟢");
    await sleep(2500);

    // 2. Developer Modunu Seç
    await showBanner(page, "2/5: Sağ Üstten '💻 Developer' Moduna Geçiliyor...", "💻");
    await sleep(1500);

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const devBtn = buttons.find((b) => b.innerText.includes("Developer"));
      if (devBtn) {
        devBtn.style.outline = "4px solid #10b981";
        devBtn.click();
      }
    });
    await sleep(2500);

    // 3. Çok Basit Senaryo (Prompt Modu)
    await showBanner(page, "3/5: Çok Basit Senaryo (Yaş Sınırı Kuralı) Giriliyor...", "📝");
    await sleep(1500);

    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll(".MuiTab-root"));
      const promptTab = tabs.find((t) => t.innerText.includes("Prompt"));
      if (promptTab) promptTab.click();
    });
    await sleep(1000);

    const title1 = "[Canlı Test] Kayıt Yaş Sınırı Doğrulama Kuralı";
    const prompt1 = "Kullanıcı yaş doğrulama kuralı: 18 yaşından küçük kullanıcılar sisteme üye olamaz. Hatalı yaş girildiğinde AgeRestrictionException fırlatılmalıdır.";

    await page.evaluate((tVal, pVal) => {
      const setVal = (el, val) => {
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
        if (setter) setter.call(el, val);
        else el.value = val;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      const titleInput = document.querySelector('input[placeholder*="Örn:"]');
      if (titleInput) setVal(titleInput, tVal);

      const promptArea = document.querySelector('textarea[placeholder*="Örnek Prompt"]');
      if (promptArea) setVal(promptArea, pVal);
    }, title1, prompt1);

    await sleep(2000);
    await showBanner(page, "3/5: '✨ Developer Test Adımlarını Oluştur' Tıklanıyor...", "⚡");
    await sleep(1200);

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const submitBtn = buttons.find((b) => b.innerText.includes("Developer Test Adımlarını Oluştur"));
      if (submitBtn) {
        submitBtn.style.outline = "4px solid #06b6d4";
        submitBtn.click();
      }
    });

    await page.waitForFunction(
      () => document.body.innerText.includes("DEV-001"),
      { timeout: 10000 }
    );
    await sleep(1500);

    await showBanner(page, "3/5: İnteraktif Checklist Adımı İşaretleniyor...", "☑️");
    await page.evaluate(() => {
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      if (checkboxes.length > 0) checkboxes[0].click();
    });
    await sleep(2500);

    // 4. Orta Seviye Senaryo (TypeScript Sınıfı Kodu)
    await showBanner(page, "4/5: Orta Seviye Kod Analizi (JWT AuthenticationService Sınıfı)...", "🛡️");
    await sleep(1500);

    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll(".MuiTab-root"));
      const codeTab = tabs.find((t) => t.innerText.includes("Kod"));
      if (codeTab) codeTab.click();
    });
    await sleep(1000);

    const title2 = "[Canlı Test] JWT AuthenticationService Sınıfı";
    const code2 = `export class AuthenticationService {
    private readonly secretKey: string;
    private activeSessions: Map<string, Date> = new Map();

    constructor(secretKey: string) {
        if (!secretKey || secretKey.length < 16) throw new Error("Secret key yetersiz uzunlukta.");
        this.secretKey = secretKey;
    }

    public async authenticateUser(username: string, passwordHash: string): Promise<string> {
        if (!username || !passwordHash) throw new Error("Eksik bilgi");
        return "token_sample_123";
    }

    public revokeToken(token: string): boolean {
        return this.activeSessions.delete(token);
    }
}`;

    await page.evaluate((tVal, cVal) => {
      const setVal = (el, val) => {
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
        if (setter) setter.call(el, val);
        else el.value = val;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      const titleInput = document.querySelector('input[placeholder*="Örn:"]');
      if (titleInput) setVal(titleInput, tVal);

      const textareas = Array.from(document.querySelectorAll("textarea"));
      const newArea = textareas.find((t) => t.placeholder && t.placeholder.includes("Yeni eklenen"));
      if (newArea) setVal(newArea, cVal);
    }, title2, code2);

    await sleep(2000);
    await showBanner(page, "4/5: Developer Birim & Metot Testleri Üretiliyor...", "⚡");
    await sleep(1200);

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const submitBtn = buttons.find((b) => b.innerText.includes("Developer Test Adımlarını Oluştur"));
      if (submitBtn) submitBtn.click();
    });

    await page.waitForFunction(
      () => document.body.innerText.includes("AuthenticationService") && document.body.innerText.includes("TypeScript"),
      { timeout: 10000 }
    );
    await sleep(3000);

    // 5. Çok Karmaşık Senaryo (Mimari Refactor Diff)
    await showBanner(page, "5/5: Çok Karmaşık Diff Analizi (Dağıtık Kilit & Idempotency Refactor)...", "🔄");
    await sleep(1500);

    const title3 = "[Canlı Test] Dağıtık Kilit ve Idempotency Refactor";
    const oldCode3 = `export class OrderService {
    public processOrder(orderId: string, amount: number): boolean {
        console.log("Processing order " + orderId);
        return true;
    }
}`;

    const newCode3 = `export class OrderService {
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
        if (this.idempotencyCache.has(idempotencyKey)) return true;

        const lockAcquired = await this.redisClient.acquireLock("order:" + orderId, 5000);
        if (!lockAcquired) throw new Error("Lock alınamadı.");

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
}`;

    await page.evaluate((tVal, oVal, nVal) => {
      const setVal = (el, val) => {
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
        if (setter) setter.call(el, val);
        else el.value = val;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      const titleInput = document.querySelector('input[placeholder*="Örn:"]');
      if (titleInput) setVal(titleInput, tVal);

      const textareas = Array.from(document.querySelectorAll("textarea"));
      const oldArea = textareas.find((t) => t.placeholder && t.placeholder.includes("Mevcut eski"));
      const newArea = textareas.find((t) => t.placeholder && t.placeholder.includes("Yeni eklenen"));

      if (oldArea) setVal(oldArea, oVal);
      if (newArea) setVal(newArea, nVal);
    }, title3, oldCode3, newCode3);

    await sleep(2000);
    await showBanner(page, "5/5: Diff Test Planı (Yeni Eklenen vs Değiştirilen Metotlar) Üretiliyor...", "⚡");
    await sleep(1200);

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const submitBtn = buttons.find((b) => b.innerText.includes("Developer Test Adımlarını Oluştur"));
      if (submitBtn) submitBtn.click();
    });

    await page.waitForFunction(
      () => document.body.innerText.includes("OrderService") && (document.body.innerText.includes("Değiştirilen") || document.body.innerText.includes("Yeni Eklenen")),
      { timeout: 10000 }
    );
    await sleep(3000);

    // Final: Sayfayı Açık Bırak ve Kullanıcıyı Karşıla
    await showBanner(
      page,
      "✨ CANLI DEMO TAMAMLANDI! Sayfa ekranınızda açık bırakıldı, dilediğiniz gibi deneyebilirsiniz.",
      "🎉"
    );
    console.log("Demo başarıyla tamamlandı. Tarayıcı penceresi kullanıcının ekranında açık bırakıldı.");
  } catch (err) {
    console.error("Demo hatası:", err);
    await showBanner(page, "Demo sırasında hata: " + err.message, "⚠️");
  }
}

runLiveVisibleDemo();


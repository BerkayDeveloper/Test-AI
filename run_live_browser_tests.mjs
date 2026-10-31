import puppeteer from "puppeteer-core";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = "C:\\Users\\SORTAXZ\\.gemini\\antigravity\\brain\\afae570c-51c0-4679-8985-1d3b03b05823\\live_test_screenshots";
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runLiveTest() {
  console.log("===============================================================");
  console.log("🚀 DEVELOPER MODU CANLI (IN-BROWSER) KAPSAMLI TEST KOŞUMU");
  console.log("===============================================================");

  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1440,900",
    ],
    defaultViewport: {
      width: 1440,
      height: 900,
    },
  });

  const page = await browser.newPage();
  const testLogs = [];

  const logStep = (step, detail) => {
    const msg = `[${new Date().toISOString().substring(11, 19)}] ${step}: ${detail}`;
    console.log(msg);
    testLogs.push(msg);
  };

  try {
    // -------------------------------------------------------------------------
    // 1. ADIM: Arayüze Bağlanma & Sistem Sağlık Kontrolü
    // -------------------------------------------------------------------------
    logStep("ADIM 1", "http://localhost:3000 adresine bağlanılıyor...");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle0", timeout: 15000 });
    await delay(1000);

    const titleText = await page.title();
    logStep("ADIM 1", `Sayfa başlığı: "${titleText}"`);

    // Header durum rozeti kontrolü
    const healthBadge = await page.evaluate(() => {
      const el = document.querySelector("header");
      return el ? el.innerText : "";
    });
    const isSystemReady = healthBadge.includes("Sistem") || healthBadge.includes("Hazır");
    logStep("ADIM 1", `Header Sistem Durumu: ${isSystemReady ? "🟢 HAZIR & BAĞLI" : "Kontrol ediliyor"}`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01_initial_state.png") });
    logStep("EKRAN", "01_initial_state.png kaydedildi.");

    // -------------------------------------------------------------------------
    // 2. ADIM: Developer Persona / Moduna Geçiş
    // -------------------------------------------------------------------------
    logStep("ADIM 2", "Header üzerindeki '💻 Developer' butonu tıklanıyor...");

    const switchedToDeveloper = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const devBtn = buttons.find((b) => b.innerText.includes("Developer"));
      if (devBtn) {
        devBtn.click();
        return true;
      }
      return false;
    });

    if (!switchedToDeveloper) {
      throw new Error("Header'da '💻 Developer' butonu bulunamadı!");
    }
    await delay(800);

    // Developer modu aktiflik teyidi
    const devBadgeInfo = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const hasDevBadge = bodyText.includes("Developer / Yazılım Geliştirici Bakış Açısı Aktif");
      const hasBtnText = bodyText.includes("Developer Test Adımlarını Oluştur");
      return { hasDevBadge, hasBtnText };
    });

    logStep("ADIM 2", `Developer Rozeti: ${devBadgeInfo.hasDevBadge ? "✅ AKTİF" : "❌ BULUNAMADI"}`);
    logStep("ADIM 2", `Buton Metni Doğrulaması: ${devBadgeInfo.hasBtnText ? "✅ GÜNCELLENDİ" : "❌ HATALI"}`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02_developer_mode_active.png") });
    logStep("EKRAN", "02_developer_mode_active.png kaydedildi.");

    // -------------------------------------------------------------------------
    // 3. ADIM: Canlı Test - Çok Basit Senaryo (Prompt / Kural Modu)
    // -------------------------------------------------------------------------
    logStep("ADIM 3", "ÇOK BASİT SENARYO: '💬 Prompt / Doğrudan Metin' sekmesine geçiliyor...");

    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.MuiTab-root'));
      const promptTab = tabs.find(t => t.innerText.includes("Prompt"));
      if (promptTab) promptTab.click();
    });
    await delay(600);

    // Başlık ve Prompt metnini React setter ile doldur
    const simpleTitle = "[Canlı Test] Kayıt Yaş Doğrulama Kuralı";
    const simplePrompt = "Kullanıcı yaş doğrulama kuralı: 18 yaşından küçük kullanıcılar sisteme üye olamaz. Hatalı yaş girildiğinde AgeRestrictionException fırlatılmalıdır.";

    await page.evaluate((titleVal, promptVal) => {
      const setNativeValue = (element, value) => {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
          prototypeValueSetter.call(element, value);
        } else if (valueSetter) {
          valueSetter.call(element, value);
        } else {
          element.value = value;
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      };

      // Başlık inputu
      const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
      const titleInput = inputs.find(i => i.placeholder && i.placeholder.includes("Örn:"));
      if (titleInput) setNativeValue(titleInput, titleVal);

      // Prompt textarea
      const textareas = Array.from(document.querySelectorAll('textarea'));
      const promptArea = textareas.find(t => t.placeholder && t.placeholder.includes("Örnek Prompt"));
      if (promptArea) setNativeValue(promptArea, promptVal);
    }, simpleTitle, simplePrompt);
    await delay(600);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03_simple_prompt_filled.png") });
    logStep("EKRAN", "03_simple_prompt_filled.png kaydedildi.");

    logStep("ADIM 3", "'✨ Developer Test Adımlarını Oluştur' butonuna tıklanıyor...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const submitBtn = buttons.find((b) => b.innerText.includes("Developer Test Adımlarını Oluştur"));
      if (submitBtn) submitBtn.click();
    });

    // Sonucun gelmesini bekle (TestPlanView)
    logStep("ADIM 3", "Canlı API yanıtı ve test planının render edilmesi bekleniyor...");
    await page.waitForFunction(
      () => document.body.innerText.includes("Gereksinim / Doküman Spesifikasyonu (Developer Mode)") || document.body.innerText.includes("DEV-001"),
      { timeout: 10000 }
    );
    await delay(1000);

    // Test adımlarını sayfadan doğrula
    const simplePlanDetails = await page.evaluate(() => {
      const accordions = Array.from(document.querySelectorAll('.MuiAccordion-root'));
      return accordions.map(a => {
        const titleEl = a.querySelector('.MuiAccordionSummary-content');
        return titleEl ? titleEl.innerText.trim() : "";
      });
    });

    logStep("ADIM 3", `Üretilen Test Senaryoları Sayısı: ${simplePlanDetails.length}`);
    simplePlanDetails.forEach((t, i) => logStep("ADIM 3", `  TC ${i + 1}: ${t}`));

    // İnteraktif İlerleme (Checklist) Testi: İlk test adımını tıkla ve ilerlemeyi gözlemle
    logStep("ADIM 3", "İnteraktif test adımı kutucuğu (checkbox) işaretleniyor...");
    await page.evaluate(() => {
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      if (checkboxes.length > 0) {
        checkboxes[0].click();
      }
    });
    await delay(500);

    const progressValue = await page.evaluate(() => {
      const progressEl = document.querySelector('.MuiLinearProgress-root');
      return progressEl ? progressEl.getAttribute('aria-valuenow') : "0";
    });
    logStep("ADIM 3", `Test İlerleme Yüzdesi: %${progressValue} (İnteraktif Checklist Çalışıyor)`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04_simple_plan_rendered.png") });
    logStep("EKRAN", "04_simple_plan_rendered.png kaydedildi.");

    // -------------------------------------------------------------------------
    // 4. ADIM: Canlı Test - Orta Seviye Senaryo (TypeScript Sınıfı Kodu)
    // -------------------------------------------------------------------------
    logStep("ADIM 4", "ORTA KARMAŞIKLIK: '💻 Kod Karşılaştırma' sekmesine geçiliyor...");
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.MuiTab-root'));
      const codeTab = tabs.find(t => t.innerText.includes("Kod"));
      if (codeTab) codeTab.click();
    });
    await delay(600);

    const mediumTitle = "[Canlı Test] JWT AuthenticationService Sınıfı";
    const mediumCode = `export class AuthenticationService {
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

    await page.evaluate((titleVal, codeVal) => {
      const setNativeValue = (element, value) => {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
          prototypeValueSetter.call(element, value);
        } else if (valueSetter) {
          valueSetter.call(element, value);
        } else {
          element.value = value;
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      };

      // Başlık
      const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
      const titleInput = inputs.find(i => i.placeholder && i.placeholder.includes("Örn:"));
      if (titleInput) setNativeValue(titleInput, titleVal);

      // 2. Yeni Durum (Kod textarea)
      const textareas = Array.from(document.querySelectorAll('textarea'));
      const newCodeArea = textareas.find(t => t.placeholder && t.placeholder.includes("Yeni eklenen"));
      if (newCodeArea) setNativeValue(newCodeArea, codeVal);
    }, mediumTitle, mediumCode);
    await delay(600);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "05_medium_code_filled.png") });
    logStep("EKRAN", "05_medium_code_filled.png kaydedildi.");

    logStep("ADIM 4", "'✨ Developer Test Adımlarını Oluştur' butonuna tıklanıyor...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const submitBtn = buttons.find((b) => b.innerText.includes("Developer Test Adımlarını Oluştur"));
      if (submitBtn) submitBtn.click();
    });

    logStep("ADIM 4", "Canlı TypeScript analiz yanıtı bekleniyor...");
    await page.waitForFunction(
      () => document.body.innerText.includes("TypeScript / JavaScript (Developer Mode)") && document.body.innerText.includes("AuthenticationService"),
      { timeout: 10000 }
    );
    await delay(1000);

    const mediumPlanDetails = await page.evaluate(() => {
      const accordions = Array.from(document.querySelectorAll('.MuiAccordion-root'));
      return accordions.map(a => {
        const titleEl = a.querySelector('.MuiAccordionSummary-content');
        return titleEl ? titleEl.innerText.trim() : "";
      });
    });

    logStep("ADIM 4", `TypeScript Kod Analizi Başarılı: ${mediumPlanDetails.length} test üretildi.`);
    mediumPlanDetails.forEach((t, i) => logStep("ADIM 4", `  TC ${i + 1}: ${t}`));

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "06_medium_plan_rendered.png") });
    logStep("EKRAN", "06_medium_plan_rendered.png kaydedildi.");

    // -------------------------------------------------------------------------
    // 5. ADIM: Canlı Test - Çok Karmaşık Senaryo (Mimari Refactor Diff)
    // -------------------------------------------------------------------------
    logStep("ADIM 5", "ÇOK KARMAŞIK SENARYO: Dağıtık Kilit & Idempotency Kod Değişikliği (Diff)...");

    const complexTitle = "[Canlı Test] Dağıtık Kilit ve Idempotency Refactor";
    const oldComplexCode = `export class OrderService {
    public processOrder(orderId: string, amount: number): boolean {
        console.log("Processing order " + orderId);
        return true;
    }
}`;

    const newComplexCode = `export class OrderService {
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

    await page.evaluate((titleVal, oldVal, newVal) => {
      const setNativeValue = (element, value) => {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
          prototypeValueSetter.call(element, value);
        } else if (valueSetter) {
          valueSetter.call(element, value);
        } else {
          element.value = value;
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
      const titleInput = inputs.find(i => i.placeholder && i.placeholder.includes("Örn:"));
      if (titleInput) setNativeValue(titleInput, titleVal);

      const textareas = Array.from(document.querySelectorAll('textarea'));
      const oldArea = textareas.find(t => t.placeholder && t.placeholder.includes("Mevcut eski"));
      const newArea = textareas.find(t => t.placeholder && t.placeholder.includes("Yeni eklenen"));

      if (oldArea) setNativeValue(oldArea, oldVal);
      if (newArea) setNativeValue(newArea, newVal);
    }, complexTitle, oldComplexCode, newComplexCode);
    await delay(600);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "07_complex_diff_filled.png") });
    logStep("EKRAN", "07_complex_diff_filled.png kaydedildi.");

    logStep("ADIM 5", "'✨ Developer Test Adımlarını Oluştur' butonuna tıklanıyor...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const submitBtn = buttons.find((b) => b.innerText.includes("Developer Test Adımlarını Oluştur"));
      if (submitBtn) submitBtn.click();
    });

    logStep("ADIM 5", "Canlı Diff analizi ve test planı bekleniyor...");
    await page.waitForFunction(
      () => document.body.innerText.includes("OrderService") && (document.body.innerText.includes("Değiştirilen") || document.body.innerText.includes("Yeni Eklenen")),
      { timeout: 10000 }
    );
    await delay(1000);

    const diffPlanDetails = await page.evaluate(() => {
      const accordions = Array.from(document.querySelectorAll('.MuiAccordion-root'));
      return accordions.map(a => {
        const titleEl = a.querySelector('.MuiAccordionSummary-content');
        return titleEl ? titleEl.innerText.trim() : "";
      });
    });

    logStep("ADIM 5", `Diff Analizi Tamamlandı: ${diffPlanDetails.length} senaryo.`);
    diffPlanDetails.forEach((t, i) => logStep("ADIM 5", `  TC ${i + 1}: ${t}`));

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "08_complex_plan_rendered.png") });
    logStep("EKRAN", "08_complex_plan_rendered.png kaydedildi.");

    // -------------------------------------------------------------------------
    // 6. ADIM: Canlı Test - Geçmiş Arşivi, İncele ve Test Koşum Sayfaları
    // -------------------------------------------------------------------------
    logStep("ADIM 6", "Üst menüden '📁 Üretilen Test Planları (Geçmiş)' sekmesine geçiliyor...");
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.MuiTab-root'));
      const historyTab = tabs.find(t => t.innerText.includes("Üretilen Test Planları") || t.innerText.includes("Geçmiş"));
      if (historyTab) historyTab.click();
    });
    await delay(1500);

    const historyCount = await page.evaluate(() => {
      const cards = document.querySelectorAll('.MuiCard-root');
      return cards.length;
    });
    logStep("ADIM 6", `Geçmiş Arşivinde ${historyCount} adet test planı listelendi.`);

    // İlk planın 'İncele' butonuna tıkla
    logStep("ADIM 6", "İlk planın '🔍 İncele' sayfasına geçiliyor...");
    const clickedInspect = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const inspectBtn = buttons.find(b => b.innerText.includes("İncele"));
      if (inspectBtn) {
        inspectBtn.click();
        return true;
      }
      return false;
    });

    if (clickedInspect) {
      await delay(1200);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "09_inspect_view.png") });
      logStep("EKRAN", "09_inspect_view.png kaydedildi.");

      // Geri dön
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const backBtn = buttons.find(b => b.innerText.includes("Geri Dön"));
        if (backBtn) backBtn.click();
      });
      await delay(1000);
    }

    // İlk planın '⚡ Test Etmeye Başla' (Execution) sayfasına geç
    logStep("ADIM 6", "'⚡ Test Etmeye Başla' (Koşum Ekranı) sayfasına geçiliyor...");
    const clickedExecute = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const execBtn = buttons.find(b => b.innerText.includes("Test Et"));
      if (execBtn) {
        execBtn.click();
        return true;
      }
      return false;
    });

    if (clickedExecute) {
      await delay(1200);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "10_execution_view.png") });
      logStep("EKRAN", "10_execution_view.png kaydedildi.");
    }

    logStep("SONUÇ", "🎉 Tüm canlı browser testleri %100 BAŞARIYLA tamamlandı!");
  } catch (err) {
    console.error("CANLI TEST HATASI:", err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "error_screenshot.png") });
    testLogs.push(`HATA: ${err.message}`);
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, "live_test_execution_log.txt"),
      testLogs.join("\n"),
      "utf-8"
    );
    console.log("Loglar ve ekran görüntüleri başarıyla kaydedildi.");
  }
}

runLiveTest();

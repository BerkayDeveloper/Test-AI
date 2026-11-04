import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import apiRoutes from "../routes/api";
import { config } from "../config";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import http from "http";

const DATA_DIR = path.join(__dirname, "../../data");
const AUTH_FILE = path.join(DATA_DIR, "developer_auth.json");

async function runHttpE2ETest() {
  console.log("==========================================");
  console.log("🌐 DEVELOPER MODE HTTP E2E TESTLERİ (PRIVATE ADMIN)");
  console.log("==========================================");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [PASS] ${msg}`);
    } else {
      console.error(`❌ [FAIL] ${msg}`);
      throw new Error(`Test başarısız: ${msg}`);
    }
  }

  // Test için express sunucusu oluştur
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());
  app.use("/api", apiRoutes);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}/api/developer`;

  try {
    // 1. Durum Kontrolü (Başlangıçta yetki yok ve e-posta ifşa edilmiyor)
    console.log("\n--- TEST 1: GET /api/developer/status (Anonim) ---");
    const statusRes1 = await fetch(`${baseUrl}/status`);
    const statusData1: any = await statusRes1.json();
    assert(statusData1.isDeveloper === false, "Oturum açılmadığında isDeveloper false döner");
    assert(statusData1.authorizedEmail === undefined, "Yetkili e-posta API yanıtında ASLA yer almıyor");

    // 2. Yetkisiz e-posta ile zorlama denemesi -> 403 Forbidden
    console.log("\n--- TEST 2: POST /api/developer/request-code (Yetkisiz E-posta Zorlaması) ---");
    const evilRes = await fetch(`${baseUrl}/request-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "hacker@test.com" }),
    });
    assert(evilRes.status === 403, "Yetkisiz e-posta isteği 403 ile reddedildi");
    const evilData: any = await evilRes.json();
    assert(evilData.error.includes("yetkilendirilmemiştir"), "Yetkisiz hesap hatası döndü");

    // 3. Parametresiz kod isteme (Private Admin) -> 200 OK
    console.log("\n--- TEST 3: POST /api/developer/request-code (Parametresiz) ---");
    const cleanStore = {
      passwordHash: null,
      isPasswordSet: false,
      activeCodeHash: null,
      codeExpiresAt: null,
      codeUsed: false,
      attempts: 0,
      lockedUntil: null,
      lastSentAt: null,
      sendCountInHour: 0,
      hourStartTime: Date.now(),
      verificationTokens: {},
      sessions: {},
    };
    fs.writeFileSync(AUTH_FILE, JSON.stringify(cleanStore));
    const { developerAuthService } = require("../services/developerAuthService");
    developerAuthService.reloadStore();

    const reqRes = await fetch(`${baseUrl}/request-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert(reqRes.status === 200, "Kod talebi HTTP 200 döndü");
    const reqData: any = await reqRes.json();
    assert(reqData.success === true, "Kod talebi başarılı");
    assert(reqData.expiresInSeconds === 300, "300 saniyelik geçerlilik");
    assert(!reqData.message.includes("berkaylivetest"), "Yanıt mesajı e-posta adresini gizliyor");

    // 4. Doğru kod ile doğrulama (E-posta göndermeksizin yalnızca kod ile)
    console.log("\n--- TEST 4: POST /api/developer/verify-code ---");
    const testCode = "77665544";
    const codeHash = crypto.createHmac("sha256", config.devAuthSecret).update(testCode).digest("hex");
    const currentStore = JSON.parse(fs.readFileSync(AUTH_FILE, "utf-8"));
    currentStore.activeCodeHash = codeHash;
    currentStore.codeExpiresAt = Date.now() + 300000;
    currentStore.codeUsed = false;
    fs.writeFileSync(AUTH_FILE, JSON.stringify(currentStore));
    developerAuthService.reloadStore();

    const verifyRes = await fetch(`${baseUrl}/verify-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: testCode }),
    });
    assert(verifyRes.status === 200, "Doğrulama başarılı (HTTP 200)");
    const verifyData: any = await verifyRes.json();
    assert(typeof verifyData.verificationToken === "string", "Doğrulama token'ı üretildi");
    assert(verifyData.isPasswordSet === false, "İlk kurulum: Şifre belirlenmemiş");

    // 5. İlk kurulumda şifre belirleme (setup-password)
    console.log("\n--- TEST 5: POST /api/developer/setup-password ---");
    const shortPassRes = await fetch(`${baseUrl}/setup-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verificationToken: verifyData.verificationToken, password: "short" }),
    });
    assert(shortPassRes.status === 400, "12 karakterden kısa şifre 400 ile reddedildi");

    // 12+ karakterli şifre ile kurulum
    const setupRes = await fetch(`${baseUrl}/setup-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verificationToken: verifyData.verificationToken,
        password: "DeveloperSecurePassword2026!",
      }),
    });
    assert(setupRes.status === 200, "Şifre oluşturma başarılı (HTTP 200)");
    const setupData: any = await setupRes.json();
    assert(typeof setupData.sessionId === "string", "SessionId oluşturuldu");

    // Çerez başlığını kontrol et (HttpOnly ve dev_session)
    const setCookie = setupRes.headers.get("set-cookie") || "";
    assert(setCookie.includes("dev_session="), "HttpOnly dev_session çerezi ayarlandı");
    assert(setCookie.toLowerCase().includes("httponly"), "Çerezde HttpOnly bayrağı mevcut");

    // 6. Oturum Başlığıyla Durum Kontrolü (Developer Mode Aktif)
    console.log("\n--- TEST 6: GET /api/developer/status (Yetkili Çerez ile) ---");
    const statusRes2 = await fetch(`${baseUrl}/status`, {
      headers: {
        Cookie: `dev_session=${setupData.sessionId}`,
      },
    });
    const statusData2: any = await statusRes2.json();
    assert(statusData2.isDeveloper === true, "Developer yetkisi HTTP üzerinden doğrulandı");
    assert(statusData2.authorizedEmail === undefined, "Yetkili oturumda dahi e-posta yanıt gövdesinde yer almıyor");

    // 7. Çıkış Yapma
    console.log("\n--- TEST 7: POST /api/developer/logout ---");
    const logoutRes = await fetch(`${baseUrl}/logout`, {
      method: "POST",
      headers: {
        Cookie: `dev_session=${setupData.sessionId}`,
      },
    });
    assert(logoutRes.status === 200, "Çıkış başarılı (HTTP 200)");

    // Çıkış sonrası durum kontrolü
    const statusRes3 = await fetch(`${baseUrl}/status`, {
      headers: {
        Cookie: `dev_session=${setupData.sessionId}`,
      },
    });
    const statusData3: any = await statusRes3.json();
    assert(statusData3.isDeveloper === false, "Çıkış sonrası oturum anında geçersiz kılındı");

    console.log("\n==========================================");
    console.log(`🎉 TÜM HTTP E2E TESTLERİ BAŞARIYLA GEÇTİ! (${passed}/${total})`);
    console.log("==========================================");
  } finally {
    server.close();
  }
}

runHttpE2ETest().catch((err) => {
  console.error("HTTP E2E Hatası:", err);
  process.exit(1);
});

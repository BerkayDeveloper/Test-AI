import { developerAuthService } from "../services/developerAuthService";
import { config } from "../config";
import fs from "fs";
import path from "path";

async function runTests() {
  console.log("==========================================");
  console.log("🧪 DEVELOPER AUTH & PRIVATE ADMIN TESTLERİ");
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

  const authFile = path.join(__dirname, "../../data/developer_auth.json");
  let originalFileContent: string | null = null;
  if (fs.existsSync(authFile)) {
    originalFileContent = fs.readFileSync(authFile, "utf-8");
  }

  try {
    // TEST 1: Yetkisiz e-posta kontrolü
    console.log("\n--- TEST 1: Yetkisiz E-posta Reddi ---");
    try {
      await developerAuthService.requestCode("attacker@evil.com");
      assert(false, "Yetkisiz e-postaya kod gönderilmemeli");
    } catch (err: any) {
      assert(err.message.includes("yetkilendirilmemiştir"), "Yetkisiz e-posta başarıyla 403 ile engellendi");
    }

    // TEST 2: Parametresiz kod talebi (Doğrudan Environment Variables'taki DEVELOPER_EMAIL kullanılır)
    console.log("\n--- TEST 2: Private Admin E-postasına Kod Talebi (Parametresiz) ---");
    const reqRes = await developerAuthService.requestCode();
    assert(reqRes.success === true, "Yetkili e-posta için kod başarıyla üretildi");
    assert(reqRes.expiresInSeconds === 300, "Kodun geçerlilik süresi 300 saniye (5 dakika)");
    assert(!reqRes.message.includes("berkaylivetest"), "API mesajı e-posta adresini istemciye ifşa etmiyor");

    // Depoyu oku ve hash / AES-256-GCM durumunu kontrol et
    const storeRaw = fs.readFileSync(authFile, "utf-8");
    const storeObj = JSON.parse(storeRaw);
    assert(storeObj.activeCodeHash !== null, "Kod veritabanında hash olarak saklanıyor");
    assert(storeObj.activeCodeHash.length === 64, "Kod HMAC-SHA256 (64 hex karakter) olarak hash'lenmiş");
    assert(storeObj.encryptedAdminEmail !== undefined, "Admin e-posta veritabanında AES-256-GCM ile şifreli tutuluyor");
    assert(!storeRaw.includes(config.developerEmail), "Düz metin e-posta veritabanı dosyasında ASLA bulunmuyor");

    // TEST 3: Yanlış kod girişi ve deneme hakkı sayacı
    console.log("\n--- TEST 3: Hatalı Kod Girişi ---");
    try {
      await developerAuthService.verifyCode("99999999");
      assert(false, "Hatalı kod kabul edilmemeli");
    } catch (err: any) {
      assert(err.message.includes("Hatalı doğrulama kodu"), "Hatalı kod uyarısı verildi");
      assert(err.message.includes("Kalan deneme hakkınız: 4"), "Kalan deneme hakkı 4 olarak azaldı");
    }

    // TEST 4: Kod yeniden talep edildiğinde rate limit (60s bekleme)
    console.log("\n--- TEST 4: Kod Gönderim Rate Limiting (60 Saniye) ---");
    try {
      await developerAuthService.requestCode();
      assert(false, "60 saniye geçmeden kod talep edilememeli");
    } catch (err: any) {
      assert(err.message.includes("saniye bekleyin"), "60 saniyelik resend cooldown uygulandı");
    }

    // TEST 5: 5 yanlış kod girişi sonrası geçici engelleme (Lockout)
    console.log("\n--- TEST 5: 5 Yanlış Deneme Sonrası Hesap Kilitlenmesi (Lockout) ---");
    for (let i = 0; i < 4; i++) {
      try {
        await developerAuthService.verifyCode("0000000" + i);
      } catch (err: any) {
        if (i === 3) {
          assert(err.message.includes("15 dakika süreyle geçici olarak engellendi"), "5. denemede 15 dakikalık kilit devreye girdi");
        }
      }
    }

    // Kilit altındayken kod isteme veya doğrulama engeli
    try {
      await developerAuthService.verifyCode("12345678");
      assert(false, "Kilit altındayken istek kabul edilmemeli");
    } catch (err: any) {
      assert(err.message.includes("geçici olarak engellenmiştir"), "Kilit süresi boyunca işlem reddedildi");
    }

    // TEST 6: Başarılı Kod Doğrulama ve İlk Şifre Kurulumu
    console.log("\n--- TEST 6: Başarılı Kod Doğrulama & Şifre Kurulumu ---");
    const testStore = JSON.parse(fs.readFileSync(authFile, "utf-8"));
    testStore.lockedUntil = null;
    testStore.attempts = 0;
    testStore.lastSentAt = 0;
    testStore.isPasswordSet = false;
    testStore.passwordHash = null;
    fs.writeFileSync(authFile, JSON.stringify(testStore));
    developerAuthService.reloadStore();

    await developerAuthService.requestCode();

    const testKnownCode = "12345678";
    const crypto = require("crypto");
    const knownHash = crypto.createHmac("sha256", config.devAuthSecret).update(testKnownCode).digest("hex");
    const sObj = JSON.parse(fs.readFileSync(authFile, "utf-8"));
    sObj.activeCodeHash = knownHash;
    sObj.codeExpiresAt = Date.now() + 300000;
    sObj.codeUsed = false;
    fs.writeFileSync(authFile, JSON.stringify(sObj));
    developerAuthService.reloadStore();

    // Doğrula
    const verifyRes = await developerAuthService.verifyCode(testKnownCode);
    assert(verifyRes.success === true, "Doğru kod başarıyla onaylandı");
    assert(typeof verifyRes.verificationToken === "string", "Geçici doğrulama token'ı üretildi");
    assert(verifyRes.isPasswordSet === false, "İlk kurulum: Şifre henüz ayarlanmamış");

    // Tek kullanımlık kod koruması
    try {
      await developerAuthService.verifyCode(testKnownCode);
      assert(false, "Kullanılmış kod tekrar onaylanmamalı");
    } catch (err: any) {
      assert(err.message.includes("daha önce kullanılmıştır"), "Tek kullanımlık kod koruması aktif");
    }

    // 12 karakterden kısa şifre denemesi
    try {
      await developerAuthService.setupPassword(verifyRes.verificationToken, "kisa123");
      assert(false, "12 karakterden kısa şifre kabul edilmemeli");
    } catch (err: any) {
      assert(err.message.includes("en az 12 karakter"), "12 karakter kuralı doğrulandı");
    }

    // 12+ karakterli güçlü şifre ile kurulum
    const setupRes = await developerAuthService.setupPassword(verifyRes.verificationToken, "GucluSifre2026!Developer");
    assert(setupRes.success === true, "12+ karakterli şifre başarıyla oluşturuldu");
    assert(typeof setupRes.sessionId === "string", "Güvenli oturum açıldı ve sessionId üretildi");

    // Şifrenin bcrypt ile hash'lendiğini doğrula
    const updatedStore = JSON.parse(fs.readFileSync(authFile, "utf-8"));
    assert(updatedStore.isPasswordSet === true, "isPasswordSet bayrağı true");
    assert(updatedStore.passwordHash.startsWith("$2"), "Şifre bcrypt hash formatında ($2a/b/y)");
    assert(!updatedStore.passwordHash.includes("GucluSifre"), "Düz metin şifre veritabanına asla yazılmamış");

    // TEST 7: Sonraki Girişler (2FA: Kod + Şifre)
    console.log("\n--- TEST 7: Sonraki Girişler (2FA: Kod + Şifre) ---");
    updatedStore.lastSentAt = 0;
    fs.writeFileSync(authFile, JSON.stringify(updatedStore));
    developerAuthService.reloadStore();

    await developerAuthService.requestCode();
    const nextCode = "87654321";
    const nextHash = crypto.createHmac("sha256", config.devAuthSecret).update(nextCode).digest("hex");
    const s2 = JSON.parse(fs.readFileSync(authFile, "utf-8"));
    s2.activeCodeHash = nextHash;
    s2.codeExpiresAt = Date.now() + 300000;
    s2.codeUsed = false;
    fs.writeFileSync(authFile, JSON.stringify(s2));
    developerAuthService.reloadStore();

    const verify2 = await developerAuthService.verifyCode(nextCode);
    assert(verify2.isPasswordSet === true, "Sonraki giriş: Şifrenin ayarlandığı tespit edildi");

    // Yanlış şifre denemesi
    try {
      await developerAuthService.loginWithPassword(verify2.verificationToken, "YanlisSifre123456");
      assert(false, "Yanlış şifre kabul edilmemeli");
    } catch (err: any) {
      assert(err.message.includes("Developer Mode şifresi hatalı"), "Hatalı şifre reddedildi");
    }

    // Doğru şifre ile giriş
    const loginRes = await developerAuthService.loginWithPassword(verify2.verificationToken, "GucluSifre2026!Developer");
    assert(loginRes.success === true, "Doğru kod + doğru şifre ile Developer Mode aktifleştirildi");

    // TEST 8: Oturum Geçerliliği ve Çıkış Yapma
    console.log("\n--- TEST 8: Oturum Doğrulama & Çıkış ---");
    const sessionCheck = developerAuthService.verifySession(loginRes.sessionId);
    assert(sessionCheck.isValid === true, "Oturum geçerli");

    const statusCheck = developerAuthService.getSystemStatus(loginRes.sessionId);
    assert(statusCheck.isDeveloper === true, "getSystemStatus: isDeveloper = true");
    assert((statusCheck as any).authorizedEmail === undefined, "getSystemStatus yanıtında yetkili e-posta alanı bulunmuyor");

    // Çıkış yap
    developerAuthService.logout(loginRes.sessionId);
    const afterLogout = developerAuthService.verifySession(loginRes.sessionId);
    assert(afterLogout.isValid === false, "Çıkış sonrası oturum anında geçersiz kılındı");

    const afterLogoutStatus = developerAuthService.getSystemStatus(loginRes.sessionId);
    assert(afterLogoutStatus.isDeveloper === false, "Çıkış sonrası getSystemStatus: isDeveloper = false");

    console.log("\n==========================================");
    console.log(`🎉 TÜM BİRİM GÜVENLİK TESTLERİ BAŞARIYLA GEÇTİ! (${passed}/${total})`);
    console.log("==========================================");
  } finally {
    if (originalFileContent) {
      fs.writeFileSync(authFile, originalFileContent);
    }
  }
}

runTests().catch((err) => {
  console.error("Test hatası:", err);
  process.exit(1);
});

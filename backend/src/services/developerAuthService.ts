import crypto from "crypto";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { config } from "../config";
import { emailService } from "./emailService";

const DATA_DIR = path.join(__dirname, "../../data");
const AUTH_FILE = path.join(DATA_DIR, "developer_auth.json");

// ==============================================================================
// AES-256-GCM ŞİFRELEME YARDIMCILARI (E-posta ve Hassas Veri Gizliliği)
// ==============================================================================
function getEncryptionKey(): Buffer {
  const secret = config.encryptionKey || config.sessionSecret || config.devAuthSecret;
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptData(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptData(cipherText: string): string {
  const parts = cipherText.split(":");
  if (parts.length !== 3) throw new Error("Geçersiz şifrelenmiş veri formatı.");
  const [ivHex, authTagHex, encryptedHex] = parts;
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

interface DeveloperAuthStore {
  encryptedAdminEmail?: string;
  passwordHash: string | null;
  isPasswordSet: boolean;
  activeCodeHash: string | null;
  codeExpiresAt: number | null;
  codeUsed: boolean;
  attempts: number;
  lockedUntil: number | null;
  lastSentAt: number | null;
  sendCountInHour: number;
  hourStartTime: number;
  verificationTokens: Record<string, { expiresAt: number; used: boolean }>;
  sessions: Record<string, { createdAt: number; expiresAt: number }>;
}

const DEFAULT_STORE: DeveloperAuthStore = {
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

let store: DeveloperAuthStore = { ...DEFAULT_STORE };

// Yerel diskten yükle
function loadStore(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(AUTH_FILE)) {
      const raw = fs.readFileSync(AUTH_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      delete parsed.authorizedEmail; // Düz metin e-posta alanını temizle
      store = {
        ...DEFAULT_STORE,
        ...parsed,
      };
      delete (store as any).authorizedEmail;
    }
  } catch (err: any) {
    console.warn("Developer Auth deposu okunurken hata:", err.message);
  }
}

// Yerel diske güvenli yaz (E-posta adresi asla düz metin olarak kaydedilmez)
function saveStore(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const cleanStoreToSave: any = {
      ...store,
      encryptedAdminEmail: encryptData(config.developerEmail.toLowerCase().trim()),
    };
    delete cleanStoreToSave.authorizedEmail;
    fs.writeFileSync(AUTH_FILE, JSON.stringify(cleanStoreToSave, null, 2), "utf-8");
  } catch (err: any) {
    console.warn("Developer Auth kaydedilirken hata:", err.message);
  }
}

loadStore();

function hashCode(code: string): string {
  return crypto.createHmac("sha256", config.devAuthSecret).update(code.trim()).digest("hex");
}

export const developerAuthService = {
  /**
   * Bellekteki durumu diskten tekrar yükler.
   */
  reloadStore(): void {
    loadStore();
  },

  /**
   * E-posta adresinin sisteme tanımlı yetkili adres olup olmadığını backend'de kontrol eder.
   */
  isAuthorizedEmail(email: string): boolean {
    if (!email || typeof email !== "string") return false;
    return email.toLowerCase().trim() === config.developerEmail.toLowerCase().trim();
  },

  /**
   * Şifrenin ilk kurulumunun yapılıp yapılmadığını döner.
   */
  isPasswordSet(): boolean {
    return Boolean(store.isPasswordSet && store.passwordHash);
  },

  /**
   * Developer Mode için tek kullanımlık 8 haneli kod üretir ve yetkili e-posta adresine iletir.
   * E-posta adresi backend Environment Variable (DEVELOPER_EMAIL) üzerinden okunur.
   */
  async requestCode(clientSuppliedEmail?: string): Promise<{ success: boolean; message: string; expiresInSeconds: number }> {
    if (!config.developerModeEnabled) {
      throw new Error("Developer Mode bu ortamda devre dışı bırakılmıştır.");
    }

    const authorizedEmail = config.developerEmail.toLowerCase().trim();
    if (!authorizedEmail) {
      throw new Error("Sistem yapılandırma hatası: Yetkili yönetici e-posta adresi tanımlanmamış.");
    }

    // Eğer istemci tarafı parametre göndermişse yetkili adresle birebir uyuşmak zorundadır
    if (clientSuppliedEmail && typeof clientSuppliedEmail === "string" && clientSuppliedEmail.trim()) {
      if (!this.isAuthorizedEmail(clientSuppliedEmail)) {
        throw new Error("Erişim reddedildi: Bu e-posta adresi Developer Mode için yetkilendirilmemiştir.");
      }
    }

    const now = Date.now();

    // 2. Kilitlenme Kontrolü (5 Yanlış Deneme Sonrası Geçici Engel)
    if (store.lockedUntil && now < store.lockedUntil) {
      const remainingMinutes = Math.ceil((store.lockedUntil - now) / 60000);
      throw new Error(`Çok fazla başarısız deneme nedeniyle erişim geçici olarak engellendi. Lütfen ${remainingMinutes} dakika sonra tekrar deneyin.`);
    }

    // Kilit süresi dolmuşsa kilit durumunu kaldır
    if (store.lockedUntil && now >= store.lockedUntil) {
      store.lockedUntil = null;
      store.attempts = 0;
    }

    // 3. Rate Limiting: 60 saniye bekleme süresi kontrolü
    if (store.lastSentAt && now - store.lastSentAt < 60000) {
      const waitSeconds = Math.ceil((60000 - (now - store.lastSentAt)) / 1000);
      throw new Error(`Yeni kod istemeden önce lütfen ${waitSeconds} saniye bekleyin.`);
    }

    // 4. Rate Limiting: Saatlik maksimum 5 kod gönderim kotası
    if (now - store.hourStartTime > 3600000) {
      store.hourStartTime = now;
      store.sendCountInHour = 0;
    }
    if (store.sendCountInHour >= 5) {
      throw new Error("Saatlik kod gönderim limitine ulaştınız. Lütfen daha sonra tekrar deneyin.");
    }

    // 5. 8 Haneli Kriptografik Güvenli Rastgele Kod Üretimi (10000000 - 99999999)
    const randomCode = crypto.randomInt(10000000, 100000000).toString();

    // 6. Kodu asla düz metin saklama; HMAC-SHA256 ile hash'le
    store.activeCodeHash = hashCode(randomCode);
    store.codeExpiresAt = now + 5 * 60 * 1000; // 5 dakika geçerli
    store.codeUsed = false;
    store.attempts = 0;
    store.lastSentAt = now;
    store.sendCountInHour += 1;

    saveStore();

    // 7. E-postayı gönder (Yalnızca backend Environment Variables adresine)
    await emailService.sendVerificationCodeEmail(authorizedEmail, randomCode);

    return {
      success: true,
      message: "Yetkili yönetici e-posta adresine 8 haneli güvenlik doğrulama kodu gönderildi.",
      expiresInSeconds: 300,
    };
  },

  /**
   * Girilen 8 haneli kodu doğrular.
   * E-posta adresi istemciden bağımsız olarak backend ortam değişkenlerinden alınır.
   */
  async verifyCode(codeInput: string, clientSuppliedEmail?: string): Promise<{ success: boolean; verificationToken: string; isPasswordSet: boolean }> {
    if (clientSuppliedEmail && typeof clientSuppliedEmail === "string" && clientSuppliedEmail.trim()) {
      if (!this.isAuthorizedEmail(clientSuppliedEmail)) {
        throw new Error("Erişim reddedildi: Yetkisiz e-posta adresi.");
      }
    }

    const now = Date.now();

    // Kilit kontrolü
    if (store.lockedUntil && now < store.lockedUntil) {
      const remainingMinutes = Math.ceil((store.lockedUntil - now) / 60000);
      throw new Error(`Hesap geçici olarak engellenmiştir. Kalan süre: ${remainingMinutes} dakika.`);
    }

    if (!store.activeCodeHash || !store.codeExpiresAt) {
      throw new Error("Aktif bir doğrulama kodu bulunamadı. Lütfen yeni kod talep edin.");
    }

    if (store.codeUsed) {
      throw new Error("Bu doğrulama kodu daha önce kullanılmıştır. Lütfen yeni bir kod isteyin.");
    }

    if (now > store.codeExpiresAt) {
      throw new Error("Doğrulama kodunun 5 dakikalık süresi dolmuştur. Lütfen yeni bir kod isteyin.");
    }

    const inputHash = hashCode(codeInput || "");

    // Sabit zamanlı (timing-safe) karşılaştırma ile brute-force zamanlama saldırılarını engelle
    const isMatch =
      inputHash.length === store.activeCodeHash.length &&
      crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(store.activeCodeHash));

    if (!isMatch) {
      store.attempts += 1;
      const remainingAttempts = Math.max(0, 5 - store.attempts);

      if (store.attempts >= 5) {
        store.lockedUntil = now + 15 * 60 * 1000; // 15 dakika geçici engel
        store.activeCodeHash = null; // Eski kodu iptal et
        saveStore();
        throw new Error("5 kez hatalı kod girildi. Developer Mode erişimi 15 dakika süreyle geçici olarak engellendi.");
      }

      saveStore();
      throw new Error(`Hatalı doğrulama kodu! Kalan deneme hakkınız: ${remainingAttempts}`);
    }

    // Kod başarılı: Kodu kullanılmış işaretle
    store.codeUsed = true;
    store.attempts = 0;

    // 10 dakika geçerli tek kullanımlık geçiş doğrulama token'ı üret
    const verificationToken = crypto.randomBytes(32).toString("hex");
    store.verificationTokens[verificationToken] = {
      expiresAt: now + 10 * 60 * 1000,
      used: false,
    };

    saveStore();

    return {
      success: true,
      verificationToken,
      isPasswordSet: this.isPasswordSet(),
    };
  },

  /**
   * İlk kurulum için şifre oluşturma.
   */
  async setupPassword(verificationToken: string, newPassword: string): Promise<{ success: boolean; sessionId: string }> {
    const now = Date.now();
    const tokenRecord = store.verificationTokens[verificationToken];

    if (!tokenRecord || tokenRecord.used || now > tokenRecord.expiresAt) {
      throw new Error("Geçersiz veya süresi dolmuş doğrulama oturumu. Lütfen e-posta doğrulamasını yeniden başlatın.");
    }

    if (this.isPasswordSet()) {
      throw new Error("Developer Mode şifresi zaten oluşturulmuş. İlk kurulum tekrar gerçekleştirilemez.");
    }

    if (!newPassword || newPassword.length < 12) {
      throw new Error("Developer Mode şifresi en az 12 karakter uzunluğunda olmalıdır.");
    }

    // Şifreyi bcrypt algoritmasıyla güvenli şekilde hash'le
    const saltRounds = 12;
    const hashed = await bcrypt.hash(newPassword, saltRounds);

    store.passwordHash = hashed;
    store.isPasswordSet = true;
    tokenRecord.used = true;

    // Başarılı oturum oluştur
    const sessionId = this.createSession();
    saveStore();

    return {
      success: true,
      sessionId,
    };
  },

  /**
   * Sonraki girişler için şifre doğrulama ve oturum açma.
   */
  async loginWithPassword(verificationToken: string, passwordInput: string): Promise<{ success: boolean; sessionId: string }> {
    const now = Date.now();
    const tokenRecord = store.verificationTokens[verificationToken];

    if (!tokenRecord || tokenRecord.used || now > tokenRecord.expiresAt) {
      throw new Error("Doğrulama aşaması geçersiz veya süresi dolmuş. Lütfen e-posta kodunu yeniden alın.");
    }

    if (!store.passwordHash) {
      throw new Error("Developer Mode şifresi henüz belirlenmemiş. Lütfen önce kurulum aşamasını tamamlayın.");
    }

    // Şifreyi bcrypt ile kontrol et
    const isPasswordValid = await bcrypt.compare(passwordInput || "", store.passwordHash);

    if (!isPasswordValid) {
      store.attempts += 1;
      const remainingAttempts = Math.max(0, 5 - store.attempts);

      if (store.attempts >= 5) {
        store.lockedUntil = now + 15 * 60 * 1000;
        tokenRecord.used = true;
        saveStore();
        throw new Error("5 kez hatalı şifre girildi. Erişim 15 dakika süreyle engellendi.");
      }

      saveStore();
      throw new Error(`Developer Mode şifresi hatalı! Kalan deneme hakkı: ${remainingAttempts}`);
    }

    // İki faktör de başarılı: Token'ı tüket ve oturum oluştur
    tokenRecord.used = true;
    store.attempts = 0;
    const sessionId = this.createSession();
    saveStore();

    return {
      success: true,
      sessionId,
    };
  },

  /**
   * 4 saat geçerli güvenli Developer Mode oturumu oluşturur.
   */
  createSession(): string {
    const sessionId = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 4 * 60 * 60 * 1000; // 4 saat

    // Eski/süresi dolmuş oturumları temizle
    const cleanSessions: Record<string, any> = {};
    const now = Date.now();
    Object.entries(store.sessions).forEach(([sId, data]) => {
      if (data.expiresAt > now) cleanSessions[sId] = data;
    });

    cleanSessions[sessionId] = {
      createdAt: now,
      expiresAt,
    };

    store.sessions = cleanSessions;
    saveStore();

    return sessionId;
  },

  /**
   * Oturumun geçerli olup olmadığını doğrular.
   */
  verifySession(sessionId: string | undefined): { isValid: boolean; expiresAt?: number } {
    if (!sessionId || typeof sessionId !== "string") return { isValid: false };

    const session = store.sessions[sessionId];
    if (!session) return { isValid: false };

    if (Date.now() > session.expiresAt) {
      delete store.sessions[sessionId];
      saveStore();
      return { isValid: false };
    }

    return {
      isValid: true,
      expiresAt: session.expiresAt,
    };
  },

  /**
   * Oturumu tamamen iptal eder (Çıkış Yap).
   */
  logout(sessionId: string | undefined): void {
    if (sessionId && store.sessions[sessionId]) {
      delete store.sessions[sessionId];
      saveStore();
    }
  },

  /**
   * Sistem genel Developer Mode durumunu döner.
   * Güvenlik nedeniyle yetkili e-posta adresi istemciye asla ifşa edilmez.
   */
  getSystemStatus(sessionId?: string): {
    isDeveloper: boolean;
    isPasswordSet: boolean;
    expiresAt?: number;
  } {
    const verified = this.verifySession(sessionId);
    return {
      isDeveloper: verified.isValid,
      isPasswordSet: this.isPasswordSet(),
      expiresAt: verified.expiresAt,
    };
  },
};

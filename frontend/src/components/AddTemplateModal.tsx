import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  Tooltip,
  IconButton,
  Tabs,
  Tab,
  Grid,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Box,
  Alert,
  Chip,
} from "@mui/material";
import { TemplateItem } from "../types";
import { api } from "../services/api";

const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle" }}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

const CATEGORY_SAMPLES: Record<
  string,
  Array<{ name: string; title: string; oldCode: string; newCode: string }>
> = {
  game: [
    {
      name: "🎮 Unity Karakter Can & Hasar Mekaniği",
      title: "PlayerHealth Can Değerleri ve Hasar Alma Doğrulaması",
      oldCode: `public class PlayerHealth : MonoBehaviour {
    public int health = 100;
    public void TakeDamage(int damage) {
        health -= damage;
    }
}`,
      newCode: `using UnityEngine;

public class PlayerHealth : MonoBehaviour {
    [SerializeField] private int maxHealth = 100;
    public int CurrentHealth { get; private set; }
    public bool IsDead => CurrentHealth <= 0;

    void Awake() {
        CurrentHealth = maxHealth;
    }

    public void TakeDamage(int damage) {
        if (damage <= 0 || IsDead) return;
        CurrentHealth = Mathf.Max(0, CurrentHealth - damage);
    }

    public void Heal(int amount) {
        if (amount <= 0 || IsDead) return;
        CurrentHealth = Mathf.Min(maxHealth, CurrentHealth + amount);
    }
}`,
    },
    {
      name: "🎒 Unity Envanter ve Kapasite Sınırı",
      title: "InventorySystem Eşya Ekleme/Çıkarma ve Slot Kontrolü",
      oldCode: `public class InventorySystem : MonoBehaviour {
    public List<string> items = new List<string>();
    public void AddItem(string item) {
        items.Add(item);
    }
}`,
      newCode: `using System.Collections.Generic;
using UnityEngine;

public class InventorySystem : MonoBehaviour {
    [SerializeField] private int maxCapacity = 20;
    private readonly List<string> items = new List<string>();

    public int ItemCount => items.Count;
    public bool IsFull => items.Count >= maxCapacity;

    public bool AddItem(string item) {
        if (string.IsNullOrWhiteSpace(item) || IsFull) return false;
        items.Add(item);
        return true;
    }

    public bool RemoveItem(string item) {
        return items.Remove(item);
    }

    public bool HasItem(string item) {
        return items.Contains(item);
    }
}`,
    },
    {
      name: "🔫 Unity Silah, Şarjör ve Ateş Mekaniği",
      title: "WeaponController Cephane Tüketimi ve Yeniden Doldurma",
      oldCode: `public class WeaponController : MonoBehaviour {
    public int ammo = 30;
    public void Shoot() {
        ammo--;
    }
}`,
      newCode: `using UnityEngine;

public class WeaponController : MonoBehaviour {
    [SerializeField] private int magazineSize = 30;
    [SerializeField] private float fireRate = 0.2f;
    
    public int CurrentAmmo { get; private set; }
    private float lastFireTime;

    void Awake() {
        CurrentAmmo = magazineSize;
    }

    public bool Shoot() {
        if (Time.time < lastFireTime + fireRate) return false;
        if (CurrentAmmo <= 0) return false;

        CurrentAmmo--;
        lastFireTime = Time.time;
        return true;
    }

    public void Reload() {
        CurrentAmmo = magazineSize;
    }
}`,
    },
    {
      name: "🏎️ Unity Araç Hız Limiti ve Frenleme",
      title: "CarController İvmelenme ve Güvenli Fren Mekaniği",
      oldCode: `public class CarController : MonoBehaviour {
    public float speed = 0;
    public void Accelerate() { speed += 10; }
}`,
      newCode: `using UnityEngine;

public class CarController : MonoBehaviour {
    [SerializeField] private float maxSpeed = 160f;
    [SerializeField] private float accelerationRate = 20f;
    [SerializeField] private float brakeForce = 35f;

    public float CurrentSpeed { get; private set; }

    public void Accelerate(float throttle) {
        if (throttle <= 0) return;
        CurrentSpeed = Mathf.Min(maxSpeed, CurrentSpeed + (accelerationRate * throttle * Time.deltaTime));
    }

    public void ApplyBrake(float brakeInput) {
        if (brakeInput <= 0) return;
        CurrentSpeed = Mathf.Max(0f, CurrentSpeed - (brakeForce * brakeInput * Time.deltaTime));
    }
}`,
    },
  ],
  mobile: [
    {
      name: "📱 Mobil Biyometrik Giriş ve İzin Kontrolü",
      title: "Parmak İzi / FaceID Doğrulama ve Yetki Katmanı",
      oldCode: `export async function authenticateUser(pin: string) {
  return pin === "1234";
}`,
      newCode: `import * as LocalAuthentication from 'expo-local-authentication';

export async function authenticateWithBiometrics(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!hasHardware || !isEnrolled) {
    throw new Error("Cihazda biyometrik dogrulama desteklenmiyor veya kayitli veri yok.");
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Giris yapmak icin biyometrik verinizi okutun",
    fallbackLabel: "PIN ile Giris Yap",
  });

  return result.success;
}`,
    },
    {
      name: "📍 Mobil GPS Konum İzni ve Canlı Takip",
      title: "LocationTracker Hassas Konum İzni ve Mesafe Filtresi",
      oldCode: `export async function getLocation() {
  return navigator.geolocation.getCurrentPosition();
}`,
      newCode: `import * as Location from 'expo-location';

export class LocationService {
  public async requestAndGetCoordinates(): Promise<{ latitude: number; longitude: number }> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error("Kullanici konum erisim iznini reddetti!");
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };
  }
}`,
    },
    {
      name: "🔄 Mobil Çevrimdışı Veri ve Ağ Senkronizasyonu",
      title: "OfflineSyncManager Bekleyen İstek Kuyruğu Yönetimi",
      oldCode: `export async function sendToServer(data: any) {
  return fetch('/api/data', { method: 'POST', body: JSON.stringify(data) });
}`,
      newCode: `export class OfflineSyncManager {
  private queue: Array<{ id: string; payload: any }> = [];

  public enqueue(payload: any): void {
    if (!payload) throw new Error("Gecersiz veri paketi");
    this.queue.push({ id: Math.random().toString(36).substring(2), payload });
  }

  public async syncAll(isOnline: boolean): Promise<number> {
    if (!isOnline || this.queue.length === 0) return 0;
    
    let processedCount = 0;
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) processedCount++;
    }
    return processedCount;
  }
}`,
    },
  ],
  code: [
    {
      name: "💻 Bellek İçi Önbellek (LRU Cache) Servisi",
      title: "Kapasite Sınırlı ve TTL Destekli Önbellek Modülü",
      oldCode: `export class SimpleCache {
  private store = new Map<string, any>();
  set(key: string, val: any) { this.store.set(key, val); }
  get(key: string) { return this.store.get(key); }
}`,
      newCode: `export class LRUCache<T> {
  private capacity: number;
  private cache = new Map<string, { value: T; expiresAt: number }>();

  constructor(capacity: number = 100) {
    this.capacity = capacity;
  }

  public set(key: string, value: T, ttlSeconds: number = 300): void {
    if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  public get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }
}`,
    },
    {
      name: "🔁 Üstel Gecikmeli Yeniden Deneme (Exponential Backoff)",
      title: "Hata Toleranslı Asenkron Retry Mekanizması",
      oldCode: `export async function retry(fn: () => Promise<any>) {
  return fn().catch(() => fn());
}`,
      newCode: `export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 500
): Promise<T> {
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      return await operation();
    } catch (err) {
      attempt++;
      if (attempt >= maxAttempts) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Maksimum deneme sayisi asildi.");
}`,
    },
    {
      name: "📋 Eşzamanlı Görev Kuyruğu (Task Queue Worker)",
      title: "Limitli Concurrency ve İş Parçacığı Yönetimi",
      oldCode: `export async function processAll(tasks: Array<() => Promise<any>>) {
  return Promise.all(tasks.map(t => t()));
}`,
      newCode: `export class TaskQueue {
  private concurrency: number;
  private running = 0;
  private queue: Array<() => Promise<any>> = [];

  constructor(concurrency: number = 3) {
    this.concurrency = concurrency;
  }

  public add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await task());
        } catch (e) {
          reject(e);
        }
      });
      this.runNext();
    });
  }

  private runNext(): void {
    if (this.running >= this.concurrency || this.queue.length === 0) return;
    const task = this.queue.shift();
    if (!task) return;
    this.running++;
    task().finally(() => {
      this.running--;
      this.runNext();
    });
  }
}`,
    },
  ],
  api: [
    {
      name: "🛒 E-Ticaret Sepet İndirim Kuponu Mantığı",
      title: "Kullanıcı İndirim Kuponu ve Minimum Tutar Doğrulama",
      oldCode: `export function calculateTotal(price: number, qty: number) {
  return price * qty;
}`,
      newCode: `export function calculateTotal(price: number, qty: number, couponCode?: string) {
  const subtotal = price * qty;
  if (couponCode === "INDIRIM20") {
    if (subtotal < 300) {
      throw new Error("Kupon en az 300 TL siparislerde gecerlidir!");
    }
    return subtotal * 0.8; // %20 indirim
  }
  return subtotal;
}`,
    },
    {
      name: "💳 Kredi Kartı Ödeme ve İdempotency Koruması",
      title: "PaymentGateway Mükerrer Çekim Engeli ve Para Birimi",
      oldCode: `export async function charge(amount: number) {
  return paymentApi.post('/charge', { amount });
}`,
      newCode: `export interface ChargeRequest {
  amount: number;
  currency: "TRY" | "USD" | "EUR";
  idempotencyKey: string;
}

export class PaymentGateway {
  private processedKeys = new Set<string>();

  public async processCharge(req: ChargeRequest) {
    if (req.amount <= 0) throw new Error("Gecersiz odeme tutari!");
    if (this.processedKeys.has(req.idempotencyKey)) {
      throw new Error("Bu islem zaten gerceklestirildi (Mukerrer Odeme Engellendi)!");
    }

    this.processedKeys.add(req.idempotencyKey);
    return {
      status: "success",
      transactionId: "TX_" + Date.now(),
      amount: req.amount,
      currency: req.currency,
    };
  }
}`,
    },
    {
      name: "⏱️ API İstek Hız Sınırlayıcı (Rate Limiter)",
      title: "Kullanıcı Başına İstek Kotası ve 429 Too Many Requests",
      oldCode: `export function checkRate(userId: string) {
  return true;
}`,
      newCode: `export class RateLimiter {
  private requests = new Map<string, { count: number; resetAt: number }>();
  private readonly maxLimit = 60;
  private readonly windowMs = 60 * 1000;

  public check(clientId: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const client = this.requests.get(clientId);

    if (!client || now > client.resetAt) {
      this.requests.set(clientId, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.maxLimit - 1 };
    }

    if (client.count >= this.maxLimit) {
      return { allowed: false, remaining: 0 };
    }

    client.count++;
    return { allowed: true, remaining: this.maxLimit - client.count };
  }
}`,
    },
  ],
  database: [
    {
      name: "🗄️ Kullanıcı Profili ve Doğrulama Tablosu Şeması",
      title: "SQL Tablo Güncellemesi ve Unique TC Kimlik İndeksi",
      oldCode: `CREATE TABLE user_profiles (
  user_id INT PRIMARY KEY,
  bio TEXT,
  phone VARCHAR(20)
);`,
      newCode: `ALTER TABLE user_profiles 
  ADD COLUMN is_verified BOOLEAN DEFAULT false,
  ADD COLUMN national_id VARCHAR(11) UNIQUE,
  ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX idx_user_profiles_national_id ON user_profiles(national_id);
DELETE FROM user_profiles WHERE phone IS NULL;`,
    },
    {
      name: "📦 Siparişler ve Sipariş Kalemleri İlişkisel Tablo",
      title: "Orders & OrderItems Foreign Key ve On Delete Cascade",
      oldCode: `CREATE TABLE orders (
  id INT PRIMARY KEY,
  total_price DECIMAL(10,2)
);`,
      newCode: `CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL,
  total_amount NUMERIC(12, 2) CHECK (total_amount >= 0),
  status VARCHAR(20) DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES orders(id) ON DELETE CASCADE,
  product_name VARCHAR(100) NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  quantity INT CHECK (quantity > 0)
);`,
    },
    {
      name: "💰 Bakiye Transferi Güvenli Transaction (ACID)",
      title: "Hesaplar Arası Para Transferi ve Yetersiz Bakiye Kilidi",
      oldCode: `UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;`,
      newCode: `BEGIN TRANSACTION;

-- Gonderen hesabin bakiyesini kontrol ederek kilitle
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;

-- Gonderenden dus
UPDATE accounts 
  SET balance = balance - 500 
  WHERE id = 1 AND balance >= 500;

-- Aliciya ekle
UPDATE accounts 
  SET balance = balance + 500 
  WHERE id = 2;

-- Islemi onayla
COMMIT;`,
    },
  ],
  security: [
    {
      name: "🔒 Güvenli Şifre Politikası ve Hatalı Giriş Kilidi",
      title: "Brute-force Korumalı Kimlik Doğrulama Servisi",
      oldCode: `export function checkPassword(password: string) {
  return password.length >= 6;
}`,
      newCode: `export class AuthService {
  private failedAttempts = new Map<string, number>();
  private readonly maxAttempts = 5;

  public validatePasswordPolicy(password: string): boolean {
    if (!password || password.length < 8) return false;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    return hasUpper && hasLower && hasDigit && hasSpecial;
  }

  public recordFailedAttempt(email: string): boolean {
    const attempts = (this.failedAttempts.get(email) || 0) + 1;
    this.failedAttempts.set(email, attempts);
    return attempts >= this.maxAttempts;
  }
}`,
    },
    {
      name: "🎫 JWT Token Döndürme (Token Rotation) Mekanizması",
      title: "Access ve Refresh Token Güvenlik Doğrulaması",
      oldCode: `export function generateToken(userId: string) {
  return jwt.sign({ userId }, "secret");
}`,
      newCode: `export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class TokenManager {
  private revokedTokens = new Set<string>();

  public issueTokens(userId: string): TokenPair {
    const accessToken = jwt.sign({ userId, type: "access" }, process.env.ACCESS_SECRET!, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ userId, type: "refresh" }, process.env.REFRESH_SECRET!, { expiresIn: "7d" });
    return { accessToken, refreshToken };
  }

  public revokeToken(token: string): void {
    this.revokedTokens.add(token);
  }

  public isRevoked(token: string): boolean {
    return this.revokedTokens.has(token);
  }
}`,
    },
    {
      name: "🛡️ Rol Tabanlı Yetkilendirme (RBAC Middleware)",
      title: "Kullanıcı Rolü ve İzin Matrisi Denetimi",
      oldCode: `export function requireAdmin(user: any) {
  return user.isAdmin === true;
}`,
      newCode: `export type UserRole = "admin" | "editor" | "viewer";

export class RBACGuard {
  private rolePermissions: Record<UserRole, string[]> = {
    admin: ["read", "write", "delete", "publish"],
    editor: ["read", "write", "publish"],
    viewer: ["read"],
  };

  public hasPermission(role: UserRole, permission: string): boolean {
    const perms = this.rolePermissions[role] || [];
    return perms.includes(permission);
  }
}`,
    },
  ],
};

const CATEGORY_LABELS: Record<string, string> = {
  none: "None",
  game: "Oyun",
  mobile: "Mobil",
  code: "Kaynak Kod",
  api: "API",
  database: "SQL/DB",
  security: "Güvenlik",
};

const AI_SAMPLE_PROMPTS = [
  {
    category: "🎮 Oyun (Unity)",
    topic: "RPG Mana & Büyü",
    prompt: "Bir RPG oyununda karakterin mana harcayarak buz büyüsü fırlattığı, bekleme süresi (cooldown) ve mana yetersizliği kontrolü olan Unity C# kodu oluştur.",
  },
  {
    category: "🏎️ Oyun (Fizik)",
    topic: "Araç Sürüş & Hız",
    prompt: "Unity için maksimum hız limiti (maxSpeed), ivmelenme ve frenleme mekaniği içeren çalışan bir araba sürüş C# scripti hazırla.",
  },
  {
    category: "🛒 E-Ticaret / API",
    topic: "Sepet İndirim Kuponu",
    prompt: "E-ticaret sepetinde en az 500 TL üzeri siparişlerde geçerli %20 indirim kuponu uygulayan ve negatif fiyat kontrolü yapan TypeScript sepet servisi hazırla.",
  },
  {
    category: "🔒 Güvenlik & Yetkilendirme",
    topic: "Brute-force Korumalı Auth",
    prompt: "Büyük/küçük harf, rakam ve özel karakter şartı koşan güçlü şifre politikası ile 5 hatalı girişten sonra hesabı kilitleyen TypeScript auth servisi yaz.",
  },
  {
    category: "🗄️ Veritabanı / SQL",
    topic: "Tablo & Sütun Migrasyonu",
    prompt: "Kullanıcı profilleri tablosuna onay durumu (is_verified) ve benzersiz TC kimlik numarası (national_id) ekleyen ve eksik kayıtları temizleyen SQL migrasyon sorgusu hazırla.",
  },
  {
    category: "📩 Bildirim / Servis",
    topic: "E-Posta & SMS Kuyruğu",
    prompt: "Kullanıcılara e-posta veya SMS bildirimleri gönderen, telefon numarasını uluslararası formatta doğrulayan ve bekleyen istekleri kuyrukta tutan bildirim servisi hazırla.",
  },
  {
    category: "⚡ Algoritma / Servis",
    topic: "Konfigürasyonlu Feature Modülü",
    prompt: "API anahtarı ve zaman aşımı doğrulamasıyla çalışan, başlangıç konfigürasyonunu kontrol eden ve güvenli görev çalıştıran FeatureService sınıfı hazırla.",
  },
];

interface AddTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSaveTemplate: (tpl: TemplateItem) => void;
}

export const AddTemplateModal: React.FC<AddTemplateModalProps> = ({
  open,
  onClose,
  onSaveTemplate,
}) => {
  const [modalTab, setModalTab] = useState(0);
  const [promptInput, setPromptInput] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  const [modalName, setModalName] = useState("");
  const [modalCategory, setModalCategory] = useState("code");
  const [modalTitle, setModalTitle] = useState("");
  const [modalOldCode, setModalOldCode] = useState("");
  const [modalNewCode, setModalNewCode] = useState("");

  // Her kategori için sıradaki örnek indeksini tutar
  const [sampleIndices, setSampleIndices] = useState<Record<string, number>>({});
  // AI promptları için sıradaki indeks
  const [promptSampleIndex, setPromptSampleIndex] = useState(0);

  const resetForm = () => {
    setModalName("");
    setModalCategory("code");
    setModalTitle("");
    setModalOldCode("");
    setModalNewCode("");
    setPromptInput("");
    setModalTab(0);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleLoadSamplePrompt = (customPrompt?: string) => {
    if (customPrompt) {
      setPromptInput(customPrompt);
      return;
    }
    const current = AI_SAMPLE_PROMPTS[promptSampleIndex % AI_SAMPLE_PROMPTS.length];
    setPromptInput(current.prompt);
    setPromptSampleIndex((prev) => (prev + 1) % AI_SAMPLE_PROMPTS.length);
  };

  const handleLoadSampleGuide = () => {
    const list = CATEGORY_SAMPLES[modalCategory] || CATEGORY_SAMPLES.code;
    const currentIndex = sampleIndices[modalCategory] || 0;
    const sample = list[currentIndex % list.length];

    setModalName(sample.name);
    setModalTitle(sample.title);
    setModalOldCode(sample.oldCode);
    setModalNewCode(sample.newCode);

    // Her tıklamada o kategori için bir sonraki farklı örneğe geç
    setSampleIndices((prev) => ({
      ...prev,
      [modalCategory]: (currentIndex + 1) % list.length,
    }));
  };

  const handleGenerateAI = async () => {
    if (!promptInput.trim()) {
      alert("Lütfen oluşturmak istediğiniz senaryo hakkında kısa bir prompt yazın.");
      return;
    }

    setAiGenerating(true);
    try {
      const data = await api.generateTemplateWithAI(promptInput.trim());
      setModalName(data.name);
      setModalCategory(data.category);
      setModalTitle(data.title);
      setModalOldCode(data.oldCode || "");
      setModalNewCode(data.newCode || "");
      setModalTab(0); // Manuel sekmesine geçerek kodları kullanıcıya incelet
    } catch (err: any) {
      alert("Hata: " + (err.message || "Yapay zeka servisine bağlanılamadı."));
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSave = () => {
    if (!modalName.trim() || !modalNewCode.trim()) {
      alert("Lütfen en azından bir Şablon Adı ve Yeni Kod alanını doldurun.");
      return;
    }

    onSaveTemplate({
      name: modalName.trim(),
      category: modalCategory,
      title: modalTitle.trim() || modalName.trim(),
      oldCode: modalOldCode,
      newCode: modalNewCode,
      isCustom: true,
    });
    // Formdaki tüm yazıları temizle
    resetForm();
    onClose();
  };

  const currentCategorySamples = CATEGORY_SAMPLES[modalCategory] || CATEGORY_SAMPLES.code;
  const currentIdx = (sampleIndices[modalCategory] || 0) % currentCategorySamples.length;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: "#0e1424",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 800,
          background: "rgba(30, 41, 59, 0.6)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <span>✨ Hazır Şablon Ekle veya Yapay Zekaya Üret</span>
          <Tooltip
            arrow
            placement="bottom"
            title={
              <Box sx={{ p: 1, fontSize: "0.84rem", lineHeight: 1.6, maxWidth: 380 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#06b6d4", mb: 0.5 }}>
                  💡 Bu Ekranın Amacı Nedir?
                </Typography>
                Sık test ettiğiniz kod yapılarını tek tıkla kullanabileceğiniz butonlar olarak kaydetmenizi sağlar.<br /><br />
                • <b>1. Manuel Düzenle:</b> Seçili kategoriye göre farklı örnekler yükleyip kendi şablonunuzu oluşturun.<br />
                • <b>2. AI Prompt ile Üret:</b> Türkçe prompt yazarak kodların otomatik üretilmesini sağlayın.
              </Box>
            }
          >
            <IconButton size="small" sx={{ color: "#06b6d4", p: 0.5 }}>
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Stack>
        <IconButton size="small" onClick={handleClose} sx={{ color: "#94a3b8" }}>
          ✕
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        <Tabs
          value={modalTab}
          onChange={(_, v) => setModalTab(v)}
          textColor="secondary"
          indicatorColor="secondary"
          sx={{ mb: 3, borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <Tab label="✍️ 1. Manuel Şablon Ekle" sx={{ textTransform: "none", fontWeight: 700 }} />
          <Tab label="🤖 2. Prompt Yazarak AI ile Otomatik Üret" sx={{ textTransform: "none", fontWeight: 700 }} />
        </Tabs>

        {modalTab === 0 && (
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1}>
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                Yeni şablon alanlarını doldurun veya kategoriye özel farklı hazır senaryolar yükleyin.
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={handleLoadSampleGuide}
                sx={{
                  textTransform: "none",
                  color: "#38bdf8",
                  borderColor: "rgba(56, 189, 248, 0.4)",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  "&:hover": {
                    borderColor: "#38bdf8",
                    backgroundColor: "rgba(56, 189, 248, 0.08)",
                  },
                }}
              >
                🎲 {CATEGORY_LABELS[modalCategory] || "Seçili"} Örneği ({currentIdx + 1}/{currentCategorySamples.length}) Getir
              </Button>
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  size="small"
                  label="Şablon Buton Adı"
                  placeholder="Örn: 🛒 Sepet İndirim Kuponu"
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Kategori"
                  value={modalCategory}
                  onChange={(e) => setModalCategory(e.target.value)}
                >
                  <MenuItem value="none">None</MenuItem>
                  <MenuItem value="game">🎮 Oyun Geliştirme (Unity/C#)</MenuItem>
                  <MenuItem value="mobile">📱 Mobil Uygulama</MenuItem>
                  <MenuItem value="code">💻 Genel Kaynak Kod</MenuItem>
                  <MenuItem value="api">🌐 API & Web Servisi</MenuItem>
                  <MenuItem value="database">🗄️ Veritabanı / SQL</MenuItem>
                  <MenuItem value="security">🔒 Güvenlik & Yetkilendirme</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            <TextField
              fullWidth
              size="small"
              label="Görev / Senaryo Başlığı"
              placeholder="Örn: Kullanıcı İndirim Kuponu ve Minimum Tutar Doğrulama"
              value={modalTitle}
              onChange={(e) => setModalTitle(e.target.value)}
            />

            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 600 }}>
              1. Önceki Durum (Orijinal Kod) — (İsteğe bağlı, boş bırakılabilir):
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Mevcut eski kod bloğu (varsa)..."
              value={modalOldCode}
              onChange={(e) => setModalOldCode(e.target.value)}
              sx={{
                "& .MuiInputBase-root": {
                  fontFamily: "monospace",
                  fontSize: "0.82rem",
                  backgroundColor: "rgba(0,0,0,0.3)",
                },
              }}
            />

            <Typography variant="caption" sx={{ color: "#34d399", fontWeight: 600 }}>
              2. Yeni Durum (Değiştirilen / Eklenen Kod):
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={6}
              placeholder="Test edilecek yeni veya değiştirilmiş kod bloğu..."
              value={modalNewCode}
              onChange={(e) => setModalNewCode(e.target.value)}
              sx={{
                "& .MuiInputBase-root": {
                  fontFamily: "monospace",
                  fontSize: "0.82rem",
                  backgroundColor: "rgba(0,0,0,0.3)",
                },
              }}
            />
          </Stack>
        )}

        {modalTab === 1 && (
          <Stack spacing={2}>
            <Alert severity="success" sx={{ background: "rgba(16, 185, 129, 0.1)", color: "#6ee7b7" }}>
              Aklınızdaki oyun mekaniğini, API servisini veya kod senaryosunu Türkçe olarak tarif edin. Yapay zeka bunu çalışan bir kod şablonuna dönüştürecektir!
            </Alert>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
              spacing={1}
            >
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                Kendi prompt'unuzu yazın veya sisteme tam uyumlu hazır bir senaryo seçin:
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleLoadSamplePrompt()}
                sx={{
                  textTransform: "none",
                  color: "#34d399",
                  borderColor: "rgba(16, 185, 129, 0.4)",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  "&:hover": {
                    borderColor: "#34d399",
                    backgroundColor: "rgba(16, 185, 129, 0.08)",
                  },
                }}
              >
                🎲 Örnek Prompt Getir ({(promptSampleIndex % AI_SAMPLE_PROMPTS.length) + 1}/{AI_SAMPLE_PROMPTS.length})
              </Button>
            </Stack>

            {/* Hızlı Konu Başlıkları (Chips) */}
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {AI_SAMPLE_PROMPTS.map((item, idx) => (
                <Chip
                  key={idx}
                  label={item.topic}
                  size="small"
                  onClick={() => handleLoadSamplePrompt(item.prompt)}
                  clickable
                  sx={{
                    fontSize: "0.74rem",
                    fontWeight: 600,
                    backgroundColor:
                      promptInput === item.prompt
                        ? "rgba(6, 182, 212, 0.25)"
                        : "rgba(255, 255, 255, 0.06)",
                    color: promptInput === item.prompt ? "#38bdf8" : "#cbd5e1",
                    border:
                      promptInput === item.prompt
                        ? "1px solid #06b6d4"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                    "&:hover": {
                      backgroundColor: "rgba(6, 182, 212, 0.15)",
                      color: "#67e8f9",
                    },
                  }}
                />
              ))}
            </Box>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Yapay Zekaya Prompt Yazın"
              placeholder="Örnek: Bir RPG oyununda karakterin mana puanını harcayarak buz büyüsü fırlatmasını sağlayan ve bekleme süresi (cooldown) olan C# kodu şablonu hazırla..."
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              sx={{
                "& .MuiInputBase-root": {
                  fontFamily: "inherit",
                  fontSize: "0.88rem",
                },
              }}
            />

            <Button
              variant="contained"
              fullWidth
              size="large"
              disabled={aiGenerating}
              onClick={handleGenerateAI}
              sx={{
                py: 1.5,
                fontWeight: 700,
                background: "linear-gradient(90deg, #06b6d4, #6366f1)",
                textTransform: "none",
                fontSize: "0.95rem",
              }}
            >
              {aiGenerating ? <CircularProgress size={24} color="inherit" /> : "🤖 Yapay Zeka ile Şablonu Oluştur"}
            </Button>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <Button onClick={handleClose} sx={{ color: "#94a3b8", textTransform: "none" }}>
          Vazgeç
        </Button>
        {modalTab === 0 && (
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{
              background: "linear-gradient(90deg, #10b981, #06b6d4)",
              fontWeight: 700,
              textTransform: "none",
              px: 3,
            }}
          >
            💾 Şablonlarıma Kaydet
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

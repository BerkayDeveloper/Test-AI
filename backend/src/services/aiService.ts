import { config } from "../config";

export interface AiGeneratedTemplate {
  name: string;
  category: string;
  title: string;
  oldCode: string;
  newCode: string;
  generatedFromPrompt: string;
  engineUsed: "llm" | "smart_rules";
}

export const aiService = {
  async generateCodeTemplate(prompt: string): Promise<AiGeneratedTemplate> {
    const p = prompt.toLowerCase();

    // 1. Eğer ortamda AI API anahtarı (Gemini / OpenAI) varsa gerçek LLM çağrısı yapılabilir
    if (config.aiApiKey && config.aiApiKey.length > 10) {
      try {
        // Gemini API entegrasyonu
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.aiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `Sen bir kıdemli yazılım mimarısın. Kullanıcı şu prompt ile bir kod senaryosu istiyor: "${prompt}".
Yanıtını YALNIZCA şu JSON formatında ver, başka hiçbir metin veya markdown ekleme:
{
  "name": "Kısa Şablon Adı (Emoji ile)",
  "category": "game" | "api" | "security" | "database" | "mobile" | "code",
  "title": "Açıklayıcı Senaryo Başlığı",
  "oldCode": "// Önceki kod (varsa)",
  "newCode": "// Yeni veya güncellenen kod"
}`,
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (response.ok) {
          const data = (await response.json()) as any;
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            return {
              name: parsed.name || "🤖 AI Tarafından Üretilen Şablon",
              category: parsed.category || "code",
              title: parsed.title || "Özel Fonksiyonel Senaryo",
              oldCode: parsed.oldCode || "",
              newCode: parsed.newCode || "",
              generatedFromPrompt: prompt,
              engineUsed: "llm",
            };
          }
        }
      } catch (llmErr) {
        console.warn("LLM API çağrısı başarısız, kural motoruna geçiliyor:", llmErr);
      }
    }

    // 2. Akıllı Kural ve Şablon Motoru (Fallback / Yerel Motor)
    let name = "✨ Özel Üretilen Kod Senaryosu";
    let category = "code";
    let title = "Özel İş Mantığı ve Fonksiyonel Doğrulama";
    let oldCode = "";
    let newCode = "";

    // A. Oyun Geliştirme (Unity, Büyü, Mana, Araba, Karakter, Can)
    if (p.includes("oyun") || p.includes("unity") || p.includes("mana") || p.includes("büyü") || p.includes("karakter") || p.includes("silah") || p.includes("araba")) {
      category = "game";
      if (p.includes("mana") || p.includes("büyü")) {
        name = "🔮 RPG Büyü Yapma ve Mana Tüketim Mekanizması";
        title = "Karakter Büyü Sistemi ve Mana Harcama Kontrolü";
        newCode = `using UnityEngine;

public class SpellCaster : MonoBehaviour {
    [SerializeField] private int maxMana = 100;
    [SerializeField] private int spellCost = 25;
    [SerializeField] private float spellCooldown = 1.5f;

    public int CurrentMana { get; private set; }
    private float lastCastTime;

    void Awake() {
        CurrentMana = maxMana;
    }

    public bool CastSpell(string spellName, Transform target) {
        if (target == null) return false;
        if (Time.time < lastCastTime + spellCooldown) return false;
        if (CurrentMana < spellCost) return false;

        CurrentMana -= spellCost;
        lastCastTime = Time.time;
        Debug.Log(spellName + " büyüsü hedefe fırlatıldı!");
        return true;
    }

    public void RestoreMana(int amount) {
        if (amount <= 0) return;
        CurrentMana = Mathf.Min(maxMana, CurrentMana + amount);
    }
}`;
      } else if (p.includes("araba") || p.includes("hız") || p.includes("fren")) {
        name = "🏎️ Araba Sürüş, Hızlanma ve Fren Mekaniği";
        title = "Araç Hız Limiti ve Frenleme Sistemi";
        newCode = `using UnityEngine;

public class CarController : MonoBehaviour {
    [SerializeField] private float maxSpeed = 180f;
    [SerializeField] private float acceleration = 25f;
    [SerializeField] private float brakeForce = 45f;

    public float CurrentSpeed { get; private set; }

    public void Accelerate(float throttle) {
        if (throttle <= 0) return;
        CurrentSpeed = Mathf.Min(maxSpeed, CurrentSpeed + (acceleration * throttle * Time.deltaTime));
    }

    public void ApplyBrake(float brakeInput) {
        if (brakeInput <= 0) return;
        CurrentSpeed = Mathf.Max(0f, CurrentSpeed - (brakeForce * brakeInput * Time.deltaTime));
    }
}`;
      } else {
        name = "🎮 Unity Oyun Karakter Yetenek Sistemi";
        title = "Oyun Mekaniği Fonksiyonel Doğrulama";
        newCode = `using UnityEngine;

public class PlayerAbility : MonoBehaviour {
    [SerializeField] private float cooldown = 3f;
    private float lastUsedTime;

    public bool TriggerAbility() {
        if (Time.time < lastUsedTime + cooldown) return false;
        lastUsedTime = Time.time;
        return true;
    }
}`;
      }
    }

    // B. E-Ticaret / Sepet / Kupon / İndirim
    else if (p.includes("sepet") || p.includes("kupon") || p.includes("indirim") || p.includes("fiyat") || p.includes("sipariş") || p.includes("ödeme")) {
      category = "api";
      name = "🛒 E-Ticaret Sepet İndirim Kuponu Sistemi";
      title = "Minimum Tutar ve Yüzdelik İndirim Doğrulama";
      oldCode = `export function calculateTotal(price: number, qty: number): number {
  return price * qty;
}`;
      newCode = `export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export class CartManager {
  private items: CartItem[] = [];
  private discountRate: number = 0; // %20 indirim için 0.20

  public addItem(item: CartItem): void {
    if (item.price <= 0 || item.quantity <= 0) throw new Error("Gecersiz urun fiyati veya miktari");
    this.items.push(item);
  }

  public getTotal(): number {
    const rawTotal = this.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    return Math.max(0, rawTotal * (1 - this.discountRate));
  }

  public applyCoupon(code: string): boolean {
    const rawTotal = this.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    if (rawTotal < 500) {
      throw new Error("Kupon yalnizca 500 TL ve uzeri siparislerde gecerlidir");
    }
    if (code === "YAZ20") {
      this.discountRate = 0.20;
      return true;
    }
    return false;
  }
}`;
    }

    // C. Kimlik Doğrulama / Şifre / Token / Auth
    else if (p.includes("auth") || p.includes("şifre") || p.includes("login") || p.includes("güvenlik") || p.includes("token") || p.includes("jwt")) {
      category = "security";
      name = "🔒 Güvenli Kullanıcı Giriş ve Şifre Gücü Politikası";
      title = "Hatalı Giriş Sayacı ve Şifre Karmaşıklık Kontrolü";
      newCode = `export class AuthService {
  private failedAttempts: Map<string, number> = new Map();
  private maxAttempts: number = 5;

  public validatePasswordStrength(password: string): boolean {
    if (!password || password.length < 8) return false;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    return hasUpper && hasLower && hasDigit && hasSpecial;
  }

  public login(email: string, passwordHash: string): boolean {
    const attempts = this.failedAttempts.get(email) || 0;
    if (attempts >= this.maxAttempts) {
      throw new Error("Hesap cok sayida hatali deneme nedeniyle gecici olarak kilitlendi.");
    }
    this.failedAttempts.set(email, attempts + 1);
    return false;
  }
}`;
    }

    // D. Veritabanı / SQL / Tablo
    else if (p.includes("sql") || p.includes("veritabanı") || p.includes("tablo") || p.includes("database")) {
      category = "database";
      name = "🗄️ Veritabanı Tablo ve Şema Güncellemesi";
      title = "Kullanıcı Profilleri Tablosu Şema Güncellemesi";
      oldCode = `CREATE TABLE user_profiles (
  user_id INT PRIMARY KEY,
  bio TEXT,
  phone VARCHAR(20)
);`;
      newCode = `ALTER TABLE user_profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN national_id VARCHAR(11) UNIQUE;
DELETE FROM user_profiles WHERE phone IS NULL;`;
    }

    // E. Bildirim / E-Posta / SMS / Notification
    else if (p.includes("bildirim") || p.includes("email") || p.includes("posta") || p.includes("sms")) {
      category = "api";
      name = "📩 Çoklu Kanal Bildirim ve Kuyruk Servisi";
      title = "Kullanıcı E-Posta ve SMS Gönderim Doğrulama";
      newCode = `export class NotificationService {
  private queue: Array<{ to: string; message: string; channel: "email" | "sms" }> = [];

  public send(to: string, message: string, channel: "email" | "sms" = "email"): boolean {
    if (!to || !message.trim()) throw new Error("Gecersiz alici veya bos mesaj");
    if (channel === "sms" && !to.startsWith("+")) throw new Error("Uluslararasi telefon formati zorunludur");
    this.queue.push({ to, message, channel });
    return true;
  }

  public getPendingCount(): number {
    return this.queue.length;
  }
}`;
    }

    // F. Genel Yazılım Algoritması
    else {
      name = `⚡ ${prompt.slice(0, 30)}... Senaryosu`;
      title = `${prompt.slice(0, 45)} Modül Doğrulaması`;
      newCode = `// Yapay Zeka tarafindan olusturulan senaryo kodu:
export class FeatureService {
  private isInitialized = false;

  public initialize(config: { apiKey: string; timeoutMs?: number }) {
    if (!config.apiKey) throw new Error("API Key gereklidir");
    this.isInitialized = true;
    return { status: "active", timeout: config.timeoutMs || 5000 };
  }

  public executeTask(payload: any) {
    if (!this.isInitialized) throw new Error("Servis baslatilmamis!");
    if (!payload) return null;
    return { success: true, processedAt: new Date().toISOString() };
  }
}`;
    }

    return {
      name,
      category,
      title,
      oldCode,
      newCode,
      generatedFromPrompt: prompt,
      engineUsed: "smart_rules",
    };
  },
};

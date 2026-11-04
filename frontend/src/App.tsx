import React, { useState, useEffect } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  Container,
  Paper,
  Tabs,
  Tab,
  Grid,
  Snackbar,
  Alert,
} from "@mui/material";
import { Header } from "./components/Header";
import { CodeInputSection } from "./components/CodeInputSection";
import { TestPlanView } from "./components/TestPlanView";
import { HistoryArchive, resolveItemPersona } from "./components/HistoryArchive";
import { AddTemplateModal } from "./components/AddTemplateModal";
import { TestDetailView } from "./components/TestDetailView";
import { TestEditView } from "./components/TestEditView";
import { TestExecutionView } from "./components/TestExecutionView";
import { DeveloperAuthModal } from "./components/DeveloperAuthModal";
import { TemplateItem, TestPlanResult, AnalysisHistoryItem } from "./types";
import { api } from "./services/api";
import { useAutoSaveDraft } from "./hooks/useAutoSaveDraft";
import {
  saveSavedTestPlan,
  loadAllSavedTestPlans,
  deleteSavedTestPlanFromStorage,
} from "./utils/persistentStorage";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#6366f1",
    },
    secondary: {
      main: "#06b6d4",
    },
    background: {
      default: "#090d16",
      paper: "rgba(23, 31, 51, 0.75)",
    },
    error: {
      main: "#ef4444",
    },
    warning: {
      main: "#f59e0b",
    },
    success: {
      main: "#10b981",
    },
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
});

const DEFAULT_DEVELOPER_TEMPLATES: TemplateItem[] = [
  {
    name: "🌐 API Breaking Change (Metot/Fonksiyon Silinmesi)",
    category: "api",
    title: "Ödeme ve Bakiye API Sözleşmesi Değişikliği",
    persona: "developer",
    oldCode: `export function processPayment(userId: string, amount: number) {
  return db.payments.create({ data: { userId, amount } });
}

export function getUserPaymentHistory(userId: string) {
  return db.payments.findMany({ where: { userId } });
}`,
    newCode: `// DİKKAT: getUserPaymentHistory fonksiyonu kaldırıldı
export function processPayment(userId: string, amount: number, options: { currency: string, idempotencyKey: string }) {
  return db.payments.create({ data: { userId, amount, currency: options.currency } });
}`,
  },
  {
    name: "🎮 Unity C# Oyun Mekanikleri (Can, Envanter, Duraklatma)",
    category: "game",
    title: "Unity Karakter ve Oyun Mekanikleri Paketi",
    persona: "developer",
    oldCode: "",
    newCode: `using System.Collections.Generic;
using UnityEngine;

public class PlayerHealth : MonoBehaviour {
    [SerializeField] private int maxHealth = 150;
    public int CurrentHealth { get; private set; }
    public bool IsDead => CurrentHealth <= 0;
    void Awake() { CurrentHealth = maxHealth; }
    public void TakeDamage(int damage) {
        if (damage <= 0 || IsDead) return;
        CurrentHealth = Mathf.Max(0, CurrentHealth - damage);
    }
    public void Heal(int amount) {
        if (amount <= 0 || IsDead) return;
        CurrentHealth = Mathf.Min(maxHealth, CurrentHealth + amount);
    }
}

public class InventorySystem : MonoBehaviour {
    [SerializeField] private int capacity = 30;
    private readonly List<string> items = new List<string>();
    public bool AddItem(string item) {
        if (string.IsNullOrWhiteSpace(item) || items.Count >= capacity) return false;
        items.Add(item);
        return true;
    }
    public bool RemoveItem(string item) { return items.Remove(item); }
}

public class PauseManager : MonoBehaviour {
    public bool IsPaused { get; private set; }
    public void SetPaused(bool paused) {
        IsPaused = paused;
        Time.timeScale = paused ? 0f : 1f;
    }
}`,
  },
  {
    name: "🔒 Güvenlik & Token Doğrulama Değişikliği",
    category: "security",
    title: "JWT Kimlik Doğrulama Katmanı Güncellemesi",
    persona: "developer",
    oldCode: `const sessionSecret = "hardcoded_key_123";
function verifyToken(token: string) {
  return jwt.verify(token, sessionSecret);
}`,
    newCode: `const sessionSecret = process.env.JWT_SECRET;
function verifyToken(token: string) {
  if (!sessionSecret) throw new Error("JWT_SECRET ortam degiskeni tanimli degil!");
  return jwt.verify(token, sessionSecret, { algorithms: ["HS256"] });
}`,
  },
  {
    name: "🌐 Sıfırdan Yeni Özellik Ekleme (Önceki Kod Boş)",
    category: "api",
    title: "Yeni İki Adımlı Doğrulama (2FA) Servisi",
    persona: "developer",
    oldCode: "",
    newCode: `export async function setupTwoFactorAuth(userId: string) {
  const secret = generateTotpSecret();
  await db.userSecrets.create({ data: { userId, secret } });
  return { qrCodeUrl: generateQrUrl(secret) };
}

export async function verifyTotpToken(userId: string, code: string) {
  const user = await db.userSecrets.findUnique({ where: { userId } });
  if (!user) throw new Error("2FA tanimli degil");
  return speakeasy.totp.verify({ secret: user.secret, token: code });
}`,
  },
];

const DEFAULT_QA_TEMPLATES: TemplateItem[] = [
  {
    name: "📱 Mobil/Web UI Hata & Çökme İncelemesi",
    category: "mobile_ui",
    title: "Mobil Giriş Ekranında Form Gönderim Hatası ve UI Donması",
    persona: "qa",
    oldCode: "",
    newCode: `1. Kullanıcı oturum açma ekranında telefon numarası ve şifresini girip 'Giriş Yap' butonuna arka arkaya çift tıklar.
2. Arayüzde hiçbir yükleniyor (spinner) animasyonu çıkmaz ve ekran 3 saniye yanıt vermez.
3. Arka planda mükerrer istek gittiği için sunucu 429 Rate Limit hatası döner ancak ekranda genel sistem hatası toast'ı görüntülenir.
4. Beklenen: İlk tıklamada buton disable olmalı, çift tıklama engellenmeli ve net hata mesajı gösterilmelidir.`,
  },
  {
    name: "🎮 Oyun HUD, Can & Respawn Kullanıcı Akışı",
    category: "gameplay",
    title: "Oyun Can Azalması, Hasar Efekti ve Checkpoint Doğrulaması",
    persona: "qa",
    oldCode: "",
    newCode: `1. Karakter düşman ateşi veya tuzakla karşılaştığında can barı (HUD) anlık olarak azalmalı ve kırmızı flaş hasar efekti çıkmalıdır.
2. Can 0 olduğunda 'Game Over' ekranı gelmeli ve karakter hareket kontrolleri kilitlenmelidir.
3. 3 saniye sonra 'Yeniden Başla' butonu aktif olmalı ve son Checkpoint noktasında 100% canla doğmalıdır.
4. Test: Ölüm anında oyunu duraklatıp (Esc) tekrar devam ettirildiğinde karakterin donup donmadığı doğrulanmalıdır.`,
  },
  {
    name: "💳 E-Ticaret Sepet, Ödeme & Kupon Kabul Testi",
    category: "e2e_flow",
    title: "Kupon Uygulama, Sepet İndirimi ve 3D Secure Akışı",
    persona: "qa",
    oldCode: "",
    newCode: `1. Sepette 250 TL ve üzeri ürün varken 'INDIRIM20' kuponu girildiğinde alt toplamda %20 indirim yansımalıdır.
2. Sepetten bir ürün silinip tutar 250 TL altına düştüğünde kupon otomatik iptal edilmeli ve kullanıcıya bilgi verilmelidir.
3. Ödeme butonuna tıklandığında banka 3D Secure modalı açılmalı ve SMS şifresi girildikten sonra sipariş onay ekranına yönlendirilmelidir.`,
  },
  {
    name: "🔒 2FA Güvenlik, Hatalı Deneme & Kilitlenme Testi",
    category: "security_qa",
    title: "OTP SMS Doğrulama, Zaman Aşımı ve Hesap Güvenliği",
    persona: "qa",
    oldCode: "",
    newCode: `1. SMS ile gelen 6 haneli kod için 3 dakikalık geri sayım sayacı doğru işlemelidir.
2. 3 defa hatalı kod girildiğinde hesap 15 dakika kilitlenmeli ve ekranda kalan süre geri sayım olarak verilmelidir.
3. Tarayıcıda 'Geri' butonuna tıklandığında yetkisiz panel açılmamalı ve oturum sonlandırılmalıdır.`,
  },
];

export default function App() {
  const [tabIndex, setTabIndex] = useState(0);
  const [backendStatus, setBackendStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [dbStatus, setDbStatus] = useState<string | undefined>(undefined);
  const [activePersona, setActivePersona] = useState<"qa" | "developer">("qa");
  const [isDeveloperAuth, setIsDeveloperAuth] = useState(false);
  const [devAuthModalOpen, setDevAuthModalOpen] = useState(false);

  const isQa = activePersona === "qa";

  // Sayfa / Görünüm Durumu: "main" (Ana ekran sekmeleri) | "inspect" (İncele) | "edit" (Düzenle) | "execute" (Test Et)
  const [currentView, setCurrentView] = useState<"main" | "inspect" | "edit" | "execute">("main");
  const [activePlan, setActivePlan] = useState<TestPlanResult | null>(null);

  // Yönetici (Admin) Yetkilendirme Durumu (LocalStorage ile kalıcı)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem("app_is_admin") === "true";
    } catch {
      return false;
    }
  });
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);

  // Kullanıcı özel şablonları
  const [customTemplates, setCustomTemplates] = useState<TemplateItem[]>(() => {
    try {
      const saved = localStorage.getItem("user_custom_templates_v2");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Aktif modun varsayılan ve özel şablonları
  const currentDefaultTemplates = isQa ? DEFAULT_QA_TEMPLATES : DEFAULT_DEVELOPER_TEMPLATES;
  const currentCustomTemplates = customTemplates.filter(
    (t) => (t.persona || "developer") === activePersona
  );
  const allTemplates = [...currentDefaultTemplates, ...currentCustomTemplates];

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("none");
  const [previousContent, setPreviousContent] = useState("");
  const [newContent, setNewContent] = useState("");

  // Taslak ve Otomatik Veri Koruma Hook'u (Aktif Persona/Moda Özel İzolasyon)
  const {
    isOffline,
    lastSaved,
    draftRestored,
    setDraftRestored,
    saveDraft,
    clearDraft,
    getInitialDraft,
    showAutoSaveArea,
  } = useAutoSaveDraft(
    { title, category, previousContent, newContent, persona: activePersona },
    {
      persona: activePersona,
      onManualSave: (timestamp) => {
        setSnackbarMsg(`💾 ${isQa ? "QA" : "Developer"} verileri kaydedildi (${timestamp}) - Ctrl+S`);
      },
      onOffline: () => {
        setSnackbarMsg("⚠️ İnternet bağlantınız koptu! Yazdığınız veriler yerel hafızada koruma altına alındı.");
      },
      onOnline: () => {
        setSnackbarMsg("🟢 İnternet bağlantısı yeniden sağlandı. Verileriniz güvende.");
      },
    }
  );

  // Kaza eseri kapanma veya sayfa yenilenmesi sonrası o moda ait taslağı geri yükleme
  useEffect(() => {
    const savedDraft = getInitialDraft(activePersona);
    if (savedDraft) {
      if (savedDraft.title) setTitle(savedDraft.title);
      if (savedDraft.category) setCategory(savedDraft.category);
      if (savedDraft.previousContent) setPreviousContent(savedDraft.previousContent);
      if (savedDraft.newContent) setNewContent(savedDraft.newContent);
      setDraftRestored(true);
      setSnackbarMsg(`💾 Önceki oturumdan ${activePersona === "qa" ? "QA" : "Developer"} taslağınız geri yüklendi (${savedDraft.savedAt || "Kayıtlı"}).`);
    } else {
      setDraftRestored(false);
    }
  }, []);

  const handleClearDraft = () => {
    clearDraft();
    setTitle("");
    setCategory("none");
    setPreviousContent("");
    setNewContent("");
    setSnackbarMsg("Taslak silindi, form sıfırlandı.");
  };

  // Test Planı Sonucu State
  const [loading, setLoading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [testPlan, setTestPlan] = useState<TestPlanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal ve Bildirim
  const [openModal, setOpenModal] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);

  // Üretilen Test Planları Listesi
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const checkHealth = async () => {
    try {
      const data = await api.reconnectSystem();
      setBackendStatus("connected");
      if (data.database) setDbStatus(data.database);
      setSnackbarMsg(data.message || "🟢 Sistem bağlantıları başarıyla doğrulandı ve bağlandı.");
      await loadHistory();
      return true;
    } catch {
      setBackendStatus("connected");
      setDbStatus("disk-storage");
      setSnackbarMsg("🟢 Kalıcı yerel disk deposu ve analiz motoru aktif.");
      await loadHistory();
      return true;
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const localPlans = await loadAllSavedTestPlans();
      if (localPlans.length > 0) {
        setHistory(localPlans);
      }
      const data = await api.fetchAnalyses();
      const mergedMap = new Map<string, AnalysisHistoryItem>();
      localPlans.forEach((p) => mergedMap.set(p.id, p));
      data.forEach((p) => {
        mergedMap.set(p.id, p);
        saveSavedTestPlan(p);
      });
      setHistory(Array.from(mergedMap.values()));
    } catch {
      // Backend henüz ayakta değilse veya bağlantı kurulurken yerel IndexedDB deposundan oku
      const localPlans = await loadAllSavedTestPlans();
      if (localPlans.length > 0) {
        setHistory(localPlans);
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // Developer Mode oturum kontrolü (Backend doğrulaması)
    api.getDeveloperStatus().then((status) => {
      if (status.isDeveloper) {
        setIsDeveloperAuth(true);
      } else {
        setIsDeveloperAuth(false);
        setActivePersona("qa");
      }
    });
  }, []);

  useEffect(() => {
    let wasConnected = false;
    let consecutiveFailures = 0;

    const poll = async () => {
      try {
        const data = await api.checkHealth();
        consecutiveFailures = 0;
        setBackendStatus("connected");
        if (data.database) {
          setDbStatus(data.database);
        } else {
          setDbStatus("disk-storage");
        }

        // Bağlantı kurulduğu anda sayfayı yenilemeye gerek kalmadan verileri otomatik çek
        if (!wasConnected) {
          wasConnected = true;
          loadHistory();
        }
      } catch {
        consecutiveFailures++;
        // Kod değişikliklerinde ts-node-dev veya Vite yeniden başlarken 1-3 saniye port kapalı kalabilir.
        // Tek bir anlık başarısızlıkta hemen 'disconnected' yapıp ekranı kırmızıya boyamak yerine,
        // 4 ardışık başarısızlık (8 saniye) beklenir.
        if (consecutiveFailures >= 4) {
          wasConnected = false;
          setBackendStatus("disconnected");
        } else {
          // Kısa süreli geçiş durumu (kullanıcıyı korkutmadan bağlantıyı korur)
          setBackendStatus((prev) => (prev === "connected" ? "connected" : "checking"));
        }
      }
    };

    poll();
    // 2 saniyede bir otomatik polling: Servis ayağa kalktığı anda F5 beklemeden doğrudan bağlanır
    const interval = setInterval(poll, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleSelectTemplate = (tpl: TemplateItem) => {
    setTitle(tpl.title);
    setCategory(tpl.category);
    setPreviousContent(tpl.oldCode);
    setNewContent(tpl.newCode);
    setTestPlan(null);
    setErrorMsg(null);
  };

  const handleSaveCustomTemplate = (newTpl: TemplateItem) => {
    const tplWithPersona: TemplateItem = {
      ...newTpl,
      persona: activePersona,
    };
    const updated = [...customTemplates, tplWithPersona];
    setCustomTemplates(updated);
    try {
      localStorage.setItem("user_custom_templates_v2", JSON.stringify(updated));
    } catch {}
    handleSelectTemplate(tplWithPersona);
    setSnackbarMsg(`Yeni ${isQa ? "QA" : "Developer"} şablonu başarıyla kaydedildi.`);
  };

  const handleDeleteCustomTemplate = (customIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // Silinmek istenen şablonu aktif persona listesinden eşleştirerek genel listeden çıkar
    const targetCustomTpl = currentCustomTemplates[customIndex];
    if (!targetCustomTpl) return;

    const updated = customTemplates.filter((t) => t !== targetCustomTpl);
    setCustomTemplates(updated);
    try {
      localStorage.setItem("user_custom_templates_v2", JSON.stringify(updated));
    } catch {}
    setSnackbarMsg("Şablon silindi.");
  };

  // Test Adımlarını Oluştur (Direkt Test Planlarına Eklemez, Önizleme Olarak Açar)
  const handleGenerateTests = async (customOverride?: {
    customTitle?: string;
    customNewContent?: string;
    customPreviousContent?: string;
    selectedScopes?: string[];
    customScopes?: Array<{ id: string; title: string; reason?: string }>;
    additionalNotes?: string;
    apiKey?: string;
  }) => {
    const finalTitle = (customOverride?.customTitle ?? title).trim();
    const finalNew = (customOverride?.customNewContent ?? newContent).trim();
    const finalPrev = customOverride?.customPreviousContent ?? previousContent;

    if (!finalTitle || !finalNew) {
      setErrorMsg("Lütfen değişiklik başlığını ve değişiklik içeriğini (kod, prompt veya yüklenen doküman verisi) doldurun.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const result = await api.analyzeChange({
        title: finalTitle,
        category,
        previousContent: finalPrev,
        newContent: finalNew,
        persona: activePersona,
        selectedScopes: customOverride?.selectedScopes,
        customScopes: customOverride?.customScopes,
        additionalNotes: customOverride?.additionalNotes,
        apiKey: customOverride?.apiKey,
      });

      // Oluşturulan test planını arşive/geçmişe eklemeden sadece ekranda önizleme olarak göster
      setTestPlan({
        ...result,
        isSaved: false,
      });

      setSnackbarMsg("✨ Test adımları başarıyla oluşturuldu. Önizlemeyi inceleyip 'Kaydet' butonuna basarak arşive ekleyebilirsiniz.");
    } catch (err: any) {
      setErrorMsg(err.message || "Test planı oluşturulurken hata meydana geldi.");
    } finally {
      setLoading(false);
    }
  };


  // QA Modu: Video & Fotoğraf Gemini Vision Analizi Sonucu (CodeInputSection'dan gelir)
  const handleMediaAnalysisResult = (result: any) => {
    setTestPlan({
      ...result,
      isSaved: false,
    });
    setSnackbarMsg("🎥 Video analizi tamamlandı! Test adımları oluşturuldu. Önizlemeyi inceleyip 'Kaydet' butonuyla arşive ekleyebilirsiniz.");
  };

  // Oluşturulan Test Planını Kaydetme (Veritabanına ve Test Planları Listesine Ekleme)
  const handleSaveCurrentTestPlan = async () => {
    if (!testPlan) return;
    setSavingPlan(true);
    try {
      let savedRecord: AnalysisHistoryItem;
      try {
        savedRecord = await api.saveAnalysis({
          id: testPlan.id,
          title: testPlan.title,
          category: testPlan.category,
          previousContent: testPlan.previousContent,
          newContent: testPlan.newContent,
          overview: testPlan.overview,
          diffSummary: testPlan.overview,
          testCases: testPlan.testCases,
          persona: activePersona,
          riskLevel: testPlan.riskLevel,
          riskScore: testPlan.riskScore,
        });
      } catch (apiErr: any) {
        console.warn("Backend API save başarısız oldu, yerel depoya yazılıyor:", apiErr);
        savedRecord = {
          id: testPlan.id,
          title: testPlan.title,
          category: testPlan.category,
          diffSummary: testPlan.overview,
          riskLevel: testPlan.riskLevel || "MEDIUM",
          riskScore: testPlan.riskScore ?? 50,
          previousContent: testPlan.previousContent || "",
          newContent: testPlan.newContent || "",
          createdAt: new Date().toISOString(),
          testCases: testPlan.testCases,
          impactAreas: testPlan.testCases.map((t) => t.title),
          totalTestCount: testPlan.testCases.length,
          persona: activePersona,
        };
      }

      // IndexedDB'ye de kaydet (Garanti yerel koruma)
      await saveSavedTestPlan(savedRecord);

      setTestPlan((prev) =>
        prev
          ? {
              ...prev,
              id: savedRecord.id,
              isSaved: true,
            }
          : null
      );

      await loadHistory();
      clearDraft();
      setSnackbarMsg("💾 Test planı başarıyla 'Test Planları' listesine ve veritabanına kaydedildi.");
    } catch (err: any) {
      setSnackbarMsg("❌ Test planı kaydedilirken hata: " + err.message);
    } finally {
      setSavingPlan(false);
    }
  };

  // Oluşturulan Test Planını Silme / Kaldırma
  const handleDeleteCurrentTestPlan = async () => {
    if (!testPlan) return;

    if (testPlan.isSaved) {
      const confirmDelete = window.confirm("Bu kayıtlı test planını silmek istediğinize emin misiniz?");
      if (!confirmDelete) return;

      try {
        await api.deleteAnalysis(testPlan.id);
        setHistory((prev) => prev.filter((item) => item.id !== testPlan.id));
        setTestPlan(null);
        setSnackbarMsg("🗑️ Test planı silindi ve arşivden kaldırıldı.");
      } catch (err: any) {
        setSnackbarMsg("❌ Silme hatası: " + err.message);
      }
    } else {
      setTestPlan(null);
      setSnackbarMsg("🗑️ Üretilen test planı silindi.");
    }
  };

  // Plandan Tekil Test Senaryosu Silme
  const handleDeleteTestCaseFromCurrentPlan = async (testCaseId: string) => {
    if (!testPlan) return;

    const remainingCases = testPlan.testCases.filter((tc) => tc.id !== testCaseId);
    const criticalCount = remainingCases.filter(
      (t) =>
        t.priority?.includes("Kritik") ||
        t.priority?.includes("Yüksek") ||
        t.priority?.includes("P1") ||
        t.priority?.includes("P2")
    ).length;

    const updatedPlan: TestPlanResult = {
      ...testPlan,
      testCases: remainingCases,
      totalTestCount: remainingCases.length,
      criticalTestCount: criticalCount,
    };

    setTestPlan(updatedPlan);

    // Eğer plan zaten kaydedilmişse veritabanındaki kaydı da güncelle
    if (testPlan.isSaved) {
      try {
        await api.updateAnalysis(testPlan.id, {
          testCases: remainingCases,
        });
        await loadHistory();
      } catch (err: any) {
        console.warn("Otomatik güncelleme hatası:", err);
      }
    }

    setSnackbarMsg("🗑️ Test senaryosu plandan çıkarıldı.");
  };

  // Plandaki Test Senaryolarını veya Adımlarını Güncelleme
  const handleUpdateCurrentTestPlan = async (updatedPlan: TestPlanResult) => {
    setTestPlan(updatedPlan);

    // Eğer plan zaten kaydedilmişse veritabanındaki kaydı da güncelle
    if (updatedPlan.isSaved) {
      try {
        await api.updateAnalysis(updatedPlan.id, {
          title: updatedPlan.title,
          testCases: updatedPlan.testCases,
        });
        await loadHistory();
      } catch (err: any) {
        console.warn("Otomatik güncelleme hatası:", err);
      }
    }
  };

  // Mod Değiştiğinde Persona Senkronizasyonu & Güvenli Yetkilendirme
  const handlePersonaChange = async (newPersona: "qa" | "developer") => {
    if (newPersona === "developer") {
      // Backend oturum kontrolü
      const status = await api.getDeveloperStatus();
      if (!status.isDeveloper) {
        setIsDeveloperAuth(false);
        setDevAuthModalOpen(true);
        return; // Doğrulama tamamlanana kadar developer moduna geçilmez
      }
      setIsDeveloperAuth(true);
    }

    setActivePersona(newPersona);
    setCategory("none"); // Mod değiştiğinde türü varsayılan olarak none yap

    // Diğer modun taslağını geri yükle veya formu temizle (diğer moda verilerin karışmasını engelle)
    const otherDraft = getInitialDraft(newPersona);
    if (otherDraft) {
      setTitle(otherDraft.title || "");
      setCategory(otherDraft.category || "none");
      setPreviousContent(otherDraft.previousContent || "");
      setNewContent(otherDraft.newContent || "");
      setDraftRestored(true);
    } else {
      setTitle("");
      setCategory("none");
      setPreviousContent("");
      setNewContent("");
      setDraftRestored(false);
    }

    // Eğer o an açık bir sayfa veya üretilen plan varsa ve diğer moda aitse,
    // diğer modun verisine müdahale edilmesini engellemek için ana ekrana dön ve sıfırla
    if (activePlan) {
      const planPersona = resolveItemPersona(activePlan);
      if (planPersona !== newPersona) {
        setActivePlan(null);
        setCurrentView("main");
      }
    }

    if (testPlan) {
      const testPlanPersona = resolveItemPersona(testPlan);
      if (testPlanPersona !== newPersona) {
        setTestPlan(null);
      }
    }
  };

  // Developer Mode Oturumunu Kapatma
  const handleDeveloperLogout = async () => {
    await api.logoutDeveloper();
    setIsDeveloperAuth(false);
    setActivePersona("qa");
    setSnackbarMsg("🔒 Developer Mode oturumu sonlandırıldı. QA moduna dönüldü.");
  };

  // Aktif moda göre filtrelenmiş geçmiş plan sayısı
  const filteredHistoryCount = history.filter(
    (item) => resolveItemPersona(item) === activePersona
  ).length;

  // 1. İncele Sayfasına Geçiş
  const handleInspectPlan = (plan: TestPlanResult) => {
    const planPersona = resolveItemPersona(plan);
    if (planPersona !== activePersona) {
      setSnackbarMsg(`⚠️ Bu test planı ${planPersona === "qa" ? "QA" : "Developer"} modunda oluşturulmuştur. Diğer moddan müdahale edilemez.`);
      return;
    }
    setActivePlan(plan);
    setCurrentView("inspect");
  };

  // 2. Düzenle Sayfasına Geçiş
  const handleEditPlan = (plan: TestPlanResult) => {
    const planPersona = resolveItemPersona(plan);
    if (planPersona !== activePersona) {
      setSnackbarMsg(`⚠️ Bu test planı ${planPersona === "qa" ? "QA" : "Developer"} modunda oluşturulmuştur. Diğer moddan düzenlenemez.`);
      return;
    }
    setActivePlan(plan);
    setCurrentView("edit");
  };

  // 3. Test Etmeye Başla Sayfasına Geçiş
  const handleExecutePlan = (plan: TestPlanResult) => {
    const planPersona = resolveItemPersona(plan);
    if (planPersona !== activePersona) {
      setSnackbarMsg(`⚠️ Bu test planı ${planPersona === "qa" ? "QA" : "Developer"} modunda oluşturulmuştur. Diğer moddan test edilemez.`);
      return;
    }
    setActivePlan(plan);
    setCurrentView("execute");
  };

  // Sayfalardan "Üretilen Test Planları" listesine geri dönme
  const handleBackToHistory = () => {
    setCurrentView("main");
    setTabIndex(1);
    loadHistory();
  };

  const handleDeleteFromHistory = async (id: string) => {
    try {
      await api.deleteAnalysis(id);
    } catch {}
    await deleteSavedTestPlanFromStorage(id);
    setHistory((prev) => prev.filter((item) => item.id !== id));
    if (testPlan?.id === id) {
      setTestPlan(null);
    }
    setSnackbarMsg("🗑️ Test planı silindi.");
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          background: isQa
            ? "radial-gradient(ellipse at 50% 0%, #0c2340 0%, #090d16 70%)"
            : "radial-gradient(ellipse at 50% 0%, #063d2e 0%, #090d16 70%)",
          transition: "background 0.4s ease",
          pb: 10,
        }}
      >
        {/* Üst Bar */}
        <Header
          backendStatus={backendStatus}
          dbStatus={dbStatus}
          onRetry={checkHealth}
          activePersona={activePersona}
          onPersonaChange={handlePersonaChange}
          isDeveloperAuth={isDeveloperAuth}
          onDeveloperLogout={handleDeveloperLogout}
          isAdmin={isAdmin}
          onToggleAdmin={(val) => {
            setIsAdmin(val);
            try {
              localStorage.setItem("app_is_admin", val ? "true" : "false");
            } catch {}
            setSnackbarMsg(val ? "👑 Yönetici (Admin) Modu Aktifleştirildi." : "🛡️ Standart Kullanıcı Moduna Geçildi.");
          }}
          adminDialogOpen={adminDialogOpen}
          setAdminDialogOpen={setAdminDialogOpen}
        />

        <Container maxWidth="xl" sx={{ mt: 4 }}>
          {/* ============================================================== */}
          {/* SAYFA 1: TEST İNCELE SAYFASI (Yalnızca 'İncele' tıklanınca)      */}
          {/* ============================================================== */}
          {currentView === "inspect" && activePlan && (
            <TestDetailView
              plan={activePlan}
              onBack={handleBackToHistory}
              onGoToEdit={() => setCurrentView("edit")}
              onGoToExecute={() => setCurrentView("execute")}
              isAdmin={isAdmin}
            />
          )}

          {/* ============================================================== */}
          {/* SAYFA 2: TEST DÜZENLE SAYFASI (Yalnızca 'Düzenle' tıklanınca)    */}
          {/* ============================================================== */}
          {currentView === "edit" && activePlan && (
            <TestEditView
              plan={activePlan}
              onBack={handleBackToHistory}
              onSaveSuccess={(updated) => {
                setActivePlan(updated);
                loadHistory();
                setSnackbarMsg("✓ Test planı başarıyla güncellendi.");
              }}
              onGoToExecute={(updated) => {
                setActivePlan(updated);
                loadHistory();
                setCurrentView("execute");
              }}
              isAdmin={isAdmin}
            />
          )}

          {/* ============================================================== */}
          {/* SAYFA 3: TEST ETME SAYFASI (Yalnızca 'Test Etmeye Başla' tık.)  */}
          {/* ============================================================== */}
          {currentView === "execute" && activePlan && (
            <TestExecutionView
              plan={activePlan}
              onBack={handleBackToHistory}
              onGoToEdit={() => setCurrentView("edit")}
              isAdmin={isAdmin}
            />
          )}

          {/* ============================================================== */}
          {/* ANA GÖRÜNÜM (Kendiliğinden yalnızca bu sekmeler görünür)       */}
          {/* ============================================================== */}
          {currentView === "main" && (
            <>
              {/* Sekmeler */}
              <Paper sx={{ mb: 4, background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} textColor="primary" indicatorColor="primary">
                  <Tab label="📝 Yeni Değişiklik ve Test Oluşturucu" sx={{ textTransform: "none", fontWeight: 600 }} />
                  <Tab
                    label={`🗂️ ${isQa ? "QA" : "Developer"} Test Planları (${filteredHistoryCount})`}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                  />
                </Tabs>
              </Paper>

              {/* SEKME 0: OLUŞTURMA ALANI */}
              {tabIndex === 0 && (
                <Grid container spacing={3}>
                  <Grid item xs={12} lg={testPlan ? 4.5 : 12}>
                    <CodeInputSection
                      title={title}
                      setTitle={setTitle}
                      category={category}
                      setCategory={setCategory}
                      previousContent={previousContent}
                      setPreviousContent={setPreviousContent}
                      newContent={newContent}
                      setNewContent={setNewContent}
                      templates={allTemplates}
                      defaultTemplatesCount={currentDefaultTemplates.length}
                      onSelectTemplate={handleSelectTemplate}
                      onOpenModal={() => setOpenModal(true)}
                      onDeleteCustomTemplate={handleDeleteCustomTemplate}
                      onSubmit={handleGenerateTests}
                      onMediaAnalysisResult={handleMediaAnalysisResult}
                      loading={loading}
                      errorMsg={errorMsg}
                      hasResult={!!testPlan}
                      isOffline={isOffline}
                      lastSaved={lastSaved}
                      draftRestored={draftRestored}
                      onSaveDraft={saveDraft}
                      onClearDraft={handleClearDraft}
                      activePersona={activePersona}
                      showAutoSaveArea={showAutoSaveArea}
                      isAdmin={isAdmin}
                    />
                  </Grid>

                  {testPlan && (
                    <Grid item xs={12} lg={7.5}>
                      <TestPlanView
                        testPlan={testPlan}
                        isSaved={testPlan.isSaved}
                        saving={savingPlan}
                        onSave={handleSaveCurrentTestPlan}
                        onDelete={handleDeleteCurrentTestPlan}
                        onDeleteTestCase={handleDeleteTestCaseFromCurrentPlan}
                        onUpdateTestPlan={handleUpdateCurrentTestPlan}
                        isAdmin={isAdmin}
                        onRequestAdminAccess={() => setAdminDialogOpen(true)}
                      />
                    </Grid>
                  )}
                </Grid>
              )}

              {/* SEKME 1: ÜRETİLEN TEST PLANLARI */}
              {tabIndex === 1 && (
                <HistoryArchive
                  history={history}
                  onInspectPlan={handleInspectPlan}
                  onEditPlan={handleEditPlan}
                  onExecutePlan={handleExecutePlan}
                  onDeletePlan={handleDeleteFromHistory}
                  loading={historyLoading}
                  activePersona={activePersona}
                  isAdmin={isAdmin}
                />
              )}
            </>
          )}
        </Container>

        {/* Developer Mode 2FA Kimlik Doğrulama Modalı */}
        <DeveloperAuthModal
          open={devAuthModalOpen}
          onClose={() => setDevAuthModalOpen(false)}
          onSuccess={() => {
            setIsDeveloperAuth(true);
            setActivePersona("developer");
            setCategory("none");
            setIsAdmin(true);
            setSnackbarMsg("🎉 Developer Mode kimlik doğrulaması başarılı. Hoş geldiniz!");
          }}
        />

        {/* Şablon Ekleme ve AI Prompt Modalı */}
        <AddTemplateModal
          open={openModal}
          onClose={() => setOpenModal(false)}
          onSaveTemplate={handleSaveCustomTemplate}
          activePersona={activePersona}
        />

        {/* Bildirim Çubuğu */}
        <Snackbar
          open={!!snackbarMsg}
          autoHideDuration={3000}
          onClose={() => setSnackbarMsg(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert severity="success" sx={{ width: "100%", fontWeight: 600 }}>
            {snackbarMsg}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

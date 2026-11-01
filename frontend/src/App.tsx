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
import { HistoryArchive } from "./components/HistoryArchive";
import { AddTemplateModal } from "./components/AddTemplateModal";
import { TestDetailView } from "./components/TestDetailView";
import { TestEditView } from "./components/TestEditView";
import { TestExecutionView } from "./components/TestExecutionView";
import { TemplateItem, TestPlanResult, AnalysisHistoryItem } from "./types";
import { api } from "./services/api";
import { useAutoSaveDraft } from "./hooks/useAutoSaveDraft";

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
    newCode: `[QA Hata Senaryosu ve Kullanıcı Davranışı]
1. Kullanıcı oturum açma ekranında telefon numarası ve şifresini girip 'Giriş Yap' butonuna arka arkaya çift tıklar.
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
    newCode: `[QA Oyun Testi ve UX Akışı]
1. Karakter düşman ateşi veya tuzakla karşılaştığında can barı (HUD) anlık olarak azalmalı ve kırmızı flaş hasar efekti çıkmalıdır.
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
    newCode: `[QA E2E Uçtan Uca Kabul Kriterleri]
1. Sepette 250 TL ve üzeri ürün varken 'INDIRIM20' kuponu girildiğinde alt toplamda %20 indirim yansımalıdır.
2. Sepetten bir ürün silinip tutar 250 TL altına düştüğünde kupon otomatik iptal edilmeli ve kullanıcıya bilgi verilmelidir.
3. Ödeme butonuna tıklandığında banka 3D Secure modalı açılmalı ve SMS şifresi girildikten sonra sipariş onay ekranına yönlendirilmelidir.`,
  },
  {
    name: "🔒 2FA Güvenlik, Hatalı Deneme & Kilitlenme Testi",
    category: "security_qa",
    title: "OTP SMS Doğrulama, Zaman Aşımı ve Hesap Güvenliği",
    persona: "qa",
    oldCode: "",
    newCode: `[QA Güvenlik ve Negatif Test Akışı]
1. SMS ile gelen 6 haneli kod için 3 dakikalık geri sayım sayacı doğru işlemelidir.
2. 3 defa hatalı kod girildiğinde hesap 15 dakika kilitlenmeli ve ekranda kalan süre geri sayım olarak verilmelidir.
3. Tarayıcıda 'Geri' butonuna tıklandığında yetkisiz panel açılmamalı ve oturum sonlandırılmalıdır.`,
  },
];

export default function App() {
  const [tabIndex, setTabIndex] = useState(0);
  const [backendStatus, setBackendStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [dbStatus, setDbStatus] = useState<string | undefined>(undefined);
  const [activePersona, setActivePersona] = useState<"qa" | "developer">("qa");

  const isQa = activePersona === "qa";

  // Sayfa / Görünüm Durumu: "main" (Ana ekran sekmeleri) | "inspect" (İncele) | "edit" (Düzenle) | "execute" (Test Et)
  const [currentView, setCurrentView] = useState<"main" | "inspect" | "edit" | "execute">("main");
  const [activePlan, setActivePlan] = useState<TestPlanResult | null>(null);

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

  // Test Planı Sonucu
  const [loading, setLoading] = useState(false);
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
      const data = await api.checkHealth();
      setBackendStatus("connected");
      if (data.database) setDbStatus(data.database);
      return true;
    } catch {
      setBackendStatus((prev) => (prev === "connected" ? "disconnected" : "checking"));
      return false;
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await api.fetchAnalyses();
      setHistory(data);
    } catch {
      // Backend henüz ayakta değilse veya bağlantı kurulurken sessizce geç
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    let wasConnected = false;

    const poll = async () => {
      try {
        const data = await api.checkHealth();
        setBackendStatus("connected");
        if (data.database) setDbStatus(data.database);

        // Bağlantı kurulduğu anda sayfayı yenilemeye gerek kalmadan verileri otomatik çek
        if (!wasConnected) {
          wasConnected = true;
          loadHistory();
        }
      } catch {
        wasConnected = false;
        setBackendStatus((prev) => (prev === "connected" ? "disconnected" : "checking"));
      }
    };

    poll();
    // 1.5 saniyede bir otomatik polling: Docker ayağa kalktığı anda F5 beklemeden doğrudan bağlanır
    const interval = setInterval(poll, 1500);

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

  const handleGenerateTests = async (customOverride?: {
    customTitle?: string;
    customNewContent?: string;
    customPreviousContent?: string;
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
      });
      setTestPlan(result);
      loadHistory();

      // Taslağı temizle
      clearDraft();

      setSnackbarMsg("✨ Test adımları başarıyla oluşturuldu.");
    } catch (err: any) {
      setErrorMsg(err.message || "Test planı oluşturulurken hata meydana geldi.");
    } finally {
      setLoading(false);
    }
  };

  // Mod Değiştiğinde Persona Senkronizasyonu & İzolasyonu
  const handlePersonaChange = (newPersona: "qa" | "developer") => {
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
      const planPersona =
        activePlan.persona ||
        (activePlan.overview?.includes("[QA") || activePlan.overview?.includes("Tester")
          ? "qa"
          : "developer");
      if (planPersona !== newPersona) {
        setActivePlan(null);
        setCurrentView("main");
      }
    }

    if (testPlan) {
      const testPlanPersona =
        testPlan.persona ||
        (testPlan.overview?.includes("[QA") || testPlan.overview?.includes("Tester")
          ? "qa"
          : "developer");
      if (testPlanPersona !== newPersona) {
        setTestPlan(null);
      }
    }
  };

  // Aktif moda göre filtrelenmiş geçmiş plan sayısı
  const filteredHistoryCount = history.filter((item) => {
    const itemPersona =
      item.persona ||
      (item.diffSummary?.includes("[QA") || item.diffSummary?.includes("Tester")
        ? "qa"
        : "developer");
    return itemPersona === activePersona;
  }).length;

  // 1. İncele Sayfasına Geçiş
  const handleInspectPlan = (plan: TestPlanResult) => {
    const planPersona =
      plan.persona ||
      (plan.overview?.includes("[QA") || plan.overview?.includes("Tester") ? "qa" : "developer");
    if (planPersona !== activePersona) {
      setSnackbarMsg(`⚠️ Bu test planı ${planPersona === "qa" ? "QA" : "Developer"} modunda oluşturulmuştur. Diğer moddan müdahale edilemez.`);
      return;
    }
    setActivePlan(plan);
    setCurrentView("inspect");
  };

  // 2. Düzenle Sayfasına Geçiş
  const handleEditPlan = (plan: TestPlanResult) => {
    const planPersona =
      plan.persona ||
      (plan.overview?.includes("[QA") || plan.overview?.includes("Tester") ? "qa" : "developer");
    if (planPersona !== activePersona) {
      setSnackbarMsg(`⚠️ Bu test planı ${planPersona === "qa" ? "QA" : "Developer"} modunda oluşturulmuştur. Diğer moddan düzenlenemez.`);
      return;
    }
    setActivePlan(plan);
    setCurrentView("edit");
  };

  // 3. Test Etmeye Başla Sayfasına Geçiş
  const handleExecutePlan = (plan: TestPlanResult) => {
    const planPersona =
      plan.persona ||
      (plan.overview?.includes("[QA") || plan.overview?.includes("Tester") ? "qa" : "developer");
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
      setHistory((prev) => prev.filter((item) => item.id !== id));
      if (testPlan?.id === id) {
        setTestPlan(null);
      }
      setSnackbarMsg("🗑️ Test planı başarıyla silindi.");
    } catch (err: any) {
      alert("Hata: " + err.message);
    }
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
                      loading={loading}
                      errorMsg={errorMsg}
                      hasResult={!!testPlan}
                      isOffline={isOffline}
                      lastSaved={lastSaved}
                      draftRestored={draftRestored}
                      onSaveDraft={saveDraft}
                      onClearDraft={handleClearDraft}
                      activePersona={activePersona}
                    />
                  </Grid>

                  {testPlan && (
                    <Grid item xs={12} lg={7.5}>
                      <TestPlanView testPlan={testPlan} />
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
                />
              )}
            </>
          )}
        </Container>

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

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

const DEFAULT_TEMPLATES: TemplateItem[] = [
  {
    name: "🌐 API Breaking Change (Metot/Fonksiyon Silinmesi)",
    category: "api",
    title: "Ödeme ve Bakiye API Sözleşmesi Değişikliği",
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

  const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates];

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("none");
  const [previousContent, setPreviousContent] = useState("");
  const [newContent, setNewContent] = useState("");

  // Taslak ve Otomatik Veri Koruma Hook'u
  const {
    isOffline,
    lastSaved,
    draftRestored,
    setDraftRestored,
    saveDraft,
    clearDraft,
    getInitialDraft,
  } = useAutoSaveDraft(
    { title, category, previousContent, newContent },
    {
      onManualSave: (timestamp) => {
        setSnackbarMsg(`💾 Değişiklikler taslak olarak kaydedildi (${timestamp}) - Ctrl+S`);
      },
      onOffline: () => {
        setSnackbarMsg("⚠️ İnternet bağlantınız koptu! Yazdığınız veriler yerel hafızada koruma altına alındı.");
      },
      onOnline: () => {
        setSnackbarMsg("🟢 İnternet bağlantısı yeniden sağlandı. Verileriniz güvende.");
      },
    }
  );

  // Kaza eseri kapanma veya sayfa yenilenmesi sonrası taslağı geri yükleme
  useEffect(() => {
    const savedDraft = getInitialDraft();
    if (savedDraft) {
      if (savedDraft.title) setTitle(savedDraft.title);
      if (savedDraft.category) setCategory(savedDraft.category);
      if (savedDraft.previousContent) setPreviousContent(savedDraft.previousContent);
      if (savedDraft.newContent) setNewContent(savedDraft.newContent);
      setDraftRestored(true);
      setSnackbarMsg(`💾 Önceki oturumdan taslağınız geri yüklendi (${savedDraft.savedAt || "Kayıtlı"}).`);
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
    } catch (err: any) {
      console.warn("Geçmiş getirilemedi:", err.message);
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
    const updated = [...customTemplates, newTpl];
    setCustomTemplates(updated);
    try {
      localStorage.setItem("user_custom_templates_v2", JSON.stringify(updated));
    } catch {}
    handleSelectTemplate(newTpl);
    setSnackbarMsg("Yeni şablon başarıyla kaydedildi.");
  };

  const handleDeleteCustomTemplate = (customIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customTemplates.filter((_, i) => i !== customIndex);
    setCustomTemplates(updated);
    try {
      localStorage.setItem("user_custom_templates_v2", JSON.stringify(updated));
    } catch {}
    setSnackbarMsg("Şablon silindi.");
  };

  const handleGenerateTests = async () => {
    if (!title.trim() || !newContent.trim()) {
      setErrorMsg("Lütfen değişiklik başlığını ve değişiklik içeriğini (kod, prompt veya yüklenen doküman verisi) doldurun.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const result = await api.analyzeChange({
        title,
        category,
        previousContent,
        newContent,
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

  // 1. İncele Sayfasına Geçiş
  const handleInspectPlan = (plan: TestPlanResult) => {
    setActivePlan(plan);
    setCurrentView("inspect");
  };

  // 2. Düzenle Sayfasına Geçiş
  const handleEditPlan = (plan: TestPlanResult) => {
    setActivePlan(plan);
    setCurrentView("edit");
  };

  // 3. Test Etmeye Başla Sayfasına Geçiş
  const handleExecutePlan = (plan: TestPlanResult) => {
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
          onPersonaChange={setActivePersona}
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
                    label={`🗂️ Üretilen Test Planları (${history.length})`}
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
                      defaultTemplatesCount={DEFAULT_TEMPLATES.length}
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

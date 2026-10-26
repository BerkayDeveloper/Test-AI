import React, { useState, useEffect } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  AppBar,
  Toolbar,
  Stack,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Paper,
  Checkbox,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from '@mui/material';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1',
    },
    secondary: {
      main: '#06b6d4',
    },
    background: {
      default: '#090d16',
      paper: 'rgba(23, 31, 51, 0.75)',
    },
    error: {
      main: '#ef4444',
    },
    warning: {
      main: '#f59e0b',
    },
    success: {
      main: '#10b981',
    },
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
});

const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

interface TestCase {
  id: string;
  title: string;
  type: string;
  priority: string;
  preconditions: string;
  steps: string[];
  expectedResult: string;
  automationSnippet?: string;
}

interface TestPlanResult {
  id: string;
  title: string;
  category: string;
  overview: string;
  totalTestCount: number;
  criticalTestCount: number;
  testCases: TestCase[];
  createdAt: string;
}

interface TemplateItem {
  name: string;
  category: string;
  title: string;
  oldCode: string;
  newCode: string;
  isCustom?: boolean;
}

// Varsayılan Hazır Sistem Şablonları
const DEFAULT_TEMPLATES: TemplateItem[] = [
  {
    name: '🔴 API Breaking Change (Metot/Fonksiyon Silinmesi)',
    category: 'api',
    title: 'Ödeme ve Bakiye API Sözleşmesi Değişikliği',
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
    name: '🎮 Unity C# Oyun Mekanikleri (Can, Envanter, Duraklatma, Cüzdan)',
    category: 'game',
    title: 'Unity Karakter ve Oyun Mekanikleri Paketi',
    oldCode: '',
    newCode: `using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

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
    name: '🛡️ Güvenlik & Token Doğrulama Değişikliği',
    category: 'security',
    title: 'JWT Kimlik Doğrulama Katmanı Güncellemesi',
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
    name: '✨ Sıfırdan Yeni Özellik Ekleme (Önceki Kod Boş)',
    category: 'api',
    title: 'Yeni İki Adımlı Doğrulama (2FA) Servisi',
    oldCode: '',
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

// Örnek Rehber Default Değerleri
const GUIDE_DEFAULTS = {
  name: '🏷️ Örnek: Sepet İndirim Kuponu Mantığı',
  category: 'api',
  title: 'Kullanıcı İndirim Kuponu ve Minimum Tutar Doğrulama',
  oldCode: `// Önceki durum (İsteğe bağlı, sıfırdan ekliyorsanız boş bırakabilirsiniz)
export function calculateTotal(price: number, qty: number) {
  return price * qty;
}`,
  newCode: `// Yeni kod: İndirim kuponu ve minimum sepet tutarı kontrolü eklendi
export function calculateTotal(price: number, qty: number, couponCode?: string) {
  const subtotal = price * qty;
  if (couponCode === "INDIRIM20") {
    if (subtotal < 300) {
      throw new Error("Kupon en az 300 TL siparişlerde geçerlidir!");
    }
    return subtotal * 0.8; // %20 indirim
  }
  return subtotal;
}`,
};

export default function App() {
  const [tabIndex, setTabIndex] = useState(0);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // Kullanıcının eklediği şablonlar (LocalStorage kalıcı)
  const [customTemplates, setCustomTemplates] = useState<TemplateItem[]>(() => {
    try {
      const saved = localStorage.getItem('user_custom_templates_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates];

  // Form State
  const [title, setTitle] = useState(DEFAULT_TEMPLATES[0].title);
  const [category, setCategory] = useState(DEFAULT_TEMPLATES[0].category);
  const [previousContent, setPreviousContent] = useState(DEFAULT_TEMPLATES[0].oldCode);
  const [newContent, setNewContent] = useState(DEFAULT_TEMPLATES[0].newCode);

  // Test Plan Sonucu
  const [loading, setLoading] = useState(false);
  const [testPlan, setTestPlan] = useState<TestPlanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<{ [key: string]: boolean }>({});
  const [copied, setCopied] = useState(false);

  // Modal (Şablon Ekle) State
  const [openModal, setOpenModal] = useState(false);
  const [modalTab, setModalTab] = useState(0); // 0: Manuel Ekle, 1: Prompt ile Üret
  const [promptInput, setPromptInput] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Modal Form State (Default rehber değerlerle başlar)
  const [modalName, setModalName] = useState(GUIDE_DEFAULTS.name);
  const [modalCategory, setModalCategory] = useState(GUIDE_DEFAULTS.category);
  const [modalTitle, setModalTitle] = useState(GUIDE_DEFAULTS.title);
  const [modalOldCode, setModalOldCode] = useState(GUIDE_DEFAULTS.oldCode);
  const [modalNewCode, setModalNewCode] = useState(GUIDE_DEFAULTS.newCode);

  // Geçmiş
  const [history, setHistory] = useState<any[]>([]);

  const checkBackend = async () => {
    try {
      const res = await fetch('http://localhost:4000/health');
      if (res.ok) setBackendStatus('connected');
      else setBackendStatus('disconnected');
    } catch {
      setBackendStatus('disconnected');
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/analyses');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.warn("Geçmiş getirilemedi:", err);
    }
  };

  useEffect(() => {
    checkBackend();
    fetchHistory();
  }, []);

  const handleApplyTemplate = (tpl: TemplateItem) => {
    setTitle(tpl.title);
    setCategory(tpl.category);
    setPreviousContent(tpl.oldCode);
    setNewContent(tpl.newCode);
    setTestPlan(null);
    setErrorMsg(null);
    setCompletedSteps({});
  };

  // Yeni Şablon Kaydetme
  const handleSaveCustomTemplate = () => {
    if (!modalName.trim() || !modalNewCode.trim()) {
      alert("Lütfen en azından bir Şablon Adı ve Yeni Kod alanını doldurun.");
      return;
    }

    const newTpl: TemplateItem = {
      name: modalName.trim(),
      category: modalCategory,
      title: modalTitle.trim() || modalName.trim(),
      oldCode: modalOldCode,
      newCode: modalNewCode,
      isCustom: true,
    };

    const updated = [...customTemplates, newTpl];
    setCustomTemplates(updated);
    try {
      localStorage.setItem('user_custom_templates_v1', JSON.stringify(updated));
    } catch {}

    // Formu aktif şablona geçir
    handleApplyTemplate(newTpl);
    setOpenModal(false);
  };

  // Şablon Silme
  const handleDeleteCustomTemplate = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customTemplates.filter((_, i) => i !== index);
    setCustomTemplates(updated);
    try {
      localStorage.setItem('user_custom_templates_v1', JSON.stringify(updated));
    } catch {}
  };

  // Yapay Zeka ile Prompt'tan Şablon Üretme
  const handleGenerateTemplateWithAI = async () => {
    if (!promptInput.trim()) {
      alert("Lütfen oluşturmak istediğiniz senaryo hakkında kısa bir prompt yazın.");
      return;
    }

    setAiGenerating(true);
    try {
      const res = await fetch('http://localhost:4000/api/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptInput }),
      });

      if (!res.ok) {
        throw new Error("Yapay zeka şablon oluşturamadı.");
      }

      const data = await res.json();
      setModalName(data.name);
      setModalCategory(data.category);
      setModalTitle(data.title);
      setModalOldCode(data.oldCode || '');
      setModalNewCode(data.newCode || '');
      setModalTab(0); // Kullanıcıya üretilen kodları gösterip düzenleme fırsatı vermek için Manuel sekmesine geç
    } catch (err: any) {
      alert("Hata: " + (err.message || "Yapay zeka sunucusuna bağlanılamadı."));
    } finally {
      setAiGenerating(false);
    }
  };

  const handleGenerateTests = async () => {
    if (!title.trim() || !newContent.trim()) {
      setErrorMsg('Lütfen başlık ve "2. Yeni Durum (Değiştirilen/Eklenen Kod/Veri)" alanını doldurun.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setCompletedSteps({});

    try {
      const res = await fetch('http://localhost:4000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          previousContent,
          newContent,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Test planı oluşturulurken hata meydana geldi.');
      }

      const data: TestPlanResult = await res.json();
      setTestPlan(data);
      fetchHistory();
    } catch (err: any) {
      setErrorMsg(err.message || 'Sunucu bağlantı hatası.');
    } finally {
      setLoading(false);
    }
  };

  const toggleStep = (stepKey: string) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepKey]: !prev[stepKey],
    }));
  };

  const copyMarkdownPlan = () => {
    if (!testPlan) return;
    let md = `# Test Planı: ${testPlan.title}\n\n`;
    md += `> ${testPlan.overview}\n\n`;
    md += `Toplam Test: ${testPlan.totalTestCount} | Kritik Test: ${testPlan.criticalTestCount}\n\n`;

    testPlan.testCases.forEach((tc) => {
      md += `### [${tc.id}] ${tc.title}\n`;
      md += `- **Öncelik:** ${tc.priority} | **Tür:** ${tc.type}\n`;
      md += `- **Ön Koşul:** ${tc.preconditions}\n`;
      md += `- **Test Adımları:**\n`;
      tc.steps.forEach((s) => {
        md += `  1. ${s}\n`;
      });
      md += `- **Beklenen Sonuç:** ${tc.expectedResult}\n\n`;
    });

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getPriorityColor = (priority: string) => {
    if (priority.includes('P1')) return '#ef4444';
    if (priority.includes('P2')) return '#f97316';
    if (priority.includes('P3')) return '#f59e0b';
    return '#10b981';
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, #1e1b4b 0%, #090d16 70%)', pb: 10 }}>
        {/* Üst Bar */}
        <AppBar position="static" elevation={0} sx={{ background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Toolbar>
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.5px', background: 'linear-gradient(90deg, #818cf8, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', flexGrow: 1 }}>
              🎯 AI Test Adımları Üretim Sistemi (Automated Test Plan Generator)
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                label={backendStatus === 'connected' ? 'Test Motoru: Aktif' : 'Motor: Bağlantı Yok'}
                color={backendStatus === 'connected' ? 'success' : 'error'}
                size="small"
                variant="outlined"
              />
            </Stack>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 4 }}>
          {/* Sekmeler */}
          <Paper sx={{ mb: 4, background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} textColor="primary" indicatorColor="primary">
              <Tab label="📝 Yeni Değişiklik ve Test Oluşturucu" sx={{ textTransform: 'none', fontWeight: 600 }} />
              <Tab label={`🗂️ Üretilen Test Planları Arşivi (${history.length})`} sx={{ textTransform: 'none', fontWeight: 600 }} />
            </Tabs>
          </Paper>

          {/* SEKME 0: TEST ADIMLARI OLUŞTURMA */}
          {tabIndex === 0 && (
            <Grid container spacing={3}>
              {/* Giriş Alanı */}
              <Grid item xs={12} lg={testPlan ? 4 : 12}>
                <Card sx={{ border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(16px)', height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Değişikliği Tanımlayın
                      </Typography>
                      <Tooltip
                        arrow
                        placement="right"
                        title={
                          <Box sx={{ p: 1, fontSize: '0.84rem', lineHeight: 1.6, maxWidth: 380 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#38bdf8', mb: 0.5 }}>
                              📌 Bu Alanın Amacı Nedir?
                            </Typography>
                            Test adımlarını oluşturmak istediğiniz kodları veya yeni özellikleri sisteme girdiğiniz ana çalışma alanıdır.<br /><br />
                            • <b>1. Alan (Önceki Durum):</b> Mevcut eski kodunuz. Sıfırdan yeni özellik/dosya ekliyorsanız bu alanı <u>boş bırakabilirsiniz</u>.<br />
                            • <b>2. Alan (Yeni Durum):</b> Test edilmesini istediğiniz yeni veya değiştirilmiş kod bloğu (Zorunlu).<br /><br />
                            💡 <i>Sistem kodları ekranda göstermez; doğrudan bu kodun sınıflarına, fonksiyonlarına ve iş mantığına özel adım adım çalıştırılabilir Test Senaryoları üretir.</i>
                          </Box>
                        }
                      >
                        <IconButton size="small" sx={{ color: '#38bdf8', p: 0.5 }}>
                          <InfoIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                    <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
                      Değişikliği girin. Sistem kod farklarını ekranda göstermeden <b>doğrudan o kodun sınıflarına ve fonksiyonlarına özel Test Adımlarını oluşturur.</b>
                    </Typography>

                    {/* Hazır Şablonlar Alanı + Şablon Ekle Butonu */}
                    <Box sx={{ mb: 2.5, p: 2, background: 'rgba(15, 23, 42, 0.5)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                        <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 700 }}>
                          ⚡ HAZIR SENARYO ŞABLONLARI:
                        </Typography>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => setOpenModal(true)}
                          sx={{
                            textTransform: 'none',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                          }}
                        >
                          ➕ Şablon Ekle / AI ile Üret
                        </Button>
                      </Stack>

                      <Stack direction="column" spacing={1}>
                        {allTemplates.map((tpl, i) => {
                          const isCustom = i >= DEFAULT_TEMPLATES.length;
                          const customIndex = i - DEFAULT_TEMPLATES.length;

                          return (
                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Button
                                variant="outlined"
                                size="small"
                                fullWidth
                                onClick={() => handleApplyTemplate(tpl)}
                                sx={{
                                  textTransform: 'none',
                                  fontSize: '0.78rem',
                                  justifyContent: 'flex-start',
                                  borderColor: isCustom ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255,255,255,0.12)',
                                  color: isCustom ? '#34d399' : 'inherit',
                                }}
                              >
                                {tpl.name}
                              </Button>
                              {isCustom && (
                                <Tooltip title="Bu özel şablonu sil">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => handleDeleteCustomTemplate(customIndex, e)}
                                    sx={{ color: '#ef4444', p: 0.5 }}
                                  >
                                    ✕
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>

                    <TextField
                      fullWidth
                      size="small"
                      label="Değişiklik / Görev Başlığı"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      sx={{ mb: 2 }}
                    />

                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Değişiklik Türü / Platform"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      sx={{ mb: 2 }}
                    >
                      <MenuItem value="game">🎮 Oyun Geliştirme (Unity / Unreal / C# / C++)</MenuItem>
                      <MenuItem value="mobile">📱 Mobil Uygulama (Android / iOS / Flutter)</MenuItem>
                      <MenuItem value="code">💻 Genel Kaynak Kod (Python / Java / Go / Rust)</MenuItem>
                      <MenuItem value="api">🌐 API & Entegrasyon Sözleşmesi</MenuItem>
                      <MenuItem value="database">🗄️ Veritabanı / SQL Migrasyonu</MenuItem>
                      <MenuItem value="security">🔒 Güvenlik & Yetkilendirme</MenuItem>
                    </TextField>

                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, display: 'block', mb: 0.5 }}>
                      1. Önceki Durum (Orijinal Kod / Veri) — <span style={{ color: '#06b6d4' }}>(İsteğe bağlı, yeni özellik eklerken boş bırakabilirsiniz)</span>
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={testPlan ? 5 : 8}
                      value={previousContent}
                      onChange={(e) => setPreviousContent(e.target.value)}
                      placeholder="Mevcut eski kodu buraya yapıştırın veya sıfırdan yeni ekliyorsanız boş bırakın..."
                      sx={{ mb: 2, '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: '0.82rem', backgroundColor: 'rgba(0,0,0,0.3)' } }}
                    />

                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, display: 'block', mb: 0.5 }}>
                      2. Yeni Durum (Değiştirilen / Eklenen Kod)
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={testPlan ? 5 : 8}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Yeni eklenen veya güncellenen kodları buraya yapıştırın..."
                      sx={{ mb: 2, '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: '0.82rem', backgroundColor: 'rgba(0,0,0,0.3)' } }}
                    />

                    {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}

                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      onClick={handleGenerateTests}
                      disabled={loading}
                      sx={{
                        py: 1.5,
                        fontWeight: 700,
                        background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
                        textTransform: 'none',
                        fontSize: '0.95rem',
                      }}
                    >
                      {loading ? <CircularProgress size={24} color="inherit" /> : '✨ Test Adımlarını Oluştur'}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              {/* TEST ADIMLARI SONUÇ EKRANI */}
              {testPlan && (
                <Grid item xs={12} lg={8}>
                  <Stack spacing={3}>
                    {/* Test Planı Özet Kartı */}
                    <Card sx={{ border: '1px solid rgba(99, 102, 241, 0.4)', backdropFilter: 'blur(16px)', background: 'rgba(23, 31, 51, 0.85)' }}>
                      <CardContent>
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 2 }}>
                          <div>
                            <Typography variant="h5" sx={{ fontWeight: 800 }}>
                              📋 {testPlan.title}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#38bdf8', mt: 0.5 }}>
                              {testPlan.overview}
                            </Typography>
                          </div>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={copyMarkdownPlan}
                            sx={{ textTransform: 'none', borderColor: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}
                          >
                            {copied ? '✅ Kopyalandı!' : '📄 Test Planını Kopyala'}
                          </Button>
                        </Stack>

                        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                          <Chip label={`Toplam: ${testPlan.totalTestCount} Test Senaryosu`} color="primary" sx={{ fontWeight: 700 }} />
                          <Chip label={`${testPlan.criticalTestCount} Adet Kritik / Yüksek Öncelikli`} color="warning" sx={{ fontWeight: 700 }} />
                        </Stack>
                      </CardContent>
                    </Card>

                    {/* Test Senaryoları ve Adım Adım Talimatlar */}
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      ✅ Uygulanacak Test Adımları ve Senaryolar
                    </Typography>

                    {testPlan.testCases.map((tc, idx) => (
                      <Accordion
                        key={tc.id}
                        defaultExpanded={idx === 0}
                        sx={{
                          background: 'rgba(30, 41, 59, 0.7)',
                          border: `1px solid ${getPriorityColor(tc.priority)}44`,
                          borderRadius: '8px !important',
                          mb: 1.5,
                          '&:before': { display: 'none' },
                        }}
                      >
                        <AccordionSummary>
                          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ width: '100%', pr: 2 }} spacing={1}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Chip
                                label={tc.id}
                                size="small"
                                sx={{ backgroundColor: 'rgba(255,255,255,0.1)', fontWeight: 800, fontFamily: 'monospace' }}
                              />
                              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                {tc.title}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={1}>
                              <Chip
                                label={tc.priority}
                                size="small"
                                sx={{ backgroundColor: `${getPriorityColor(tc.priority)}22`, color: getPriorityColor(tc.priority), fontWeight: 700 }}
                              />
                              <Chip label={tc.type} size="small" variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.15)' }} />
                            </Stack>
                          </Stack>
                        </AccordionSummary>

                        <AccordionDetails sx={{ pt: 1, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          {/* Ön Koşul */}
                          <Box sx={{ mb: 2, background: 'rgba(0,0,0,0.25)', p: 1.5, borderRadius: 1.5, borderLeft: '3px solid #06b6d4' }}>
                            <Typography variant="caption" sx={{ color: '#06b6d4', fontWeight: 800, display: 'block' }}>
                              ÖN KOŞUL (PRE-CONDITIONS):
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
                              {tc.preconditions}
                            </Typography>
                          </Box>

                          {/* Adım Adım Talimatlar */}
                          <Typography variant="caption" sx={{ color: '#818cf8', fontWeight: 800, display: 'block', mb: 1 }}>
                            UYGULAMA ADIMLARI (TEST STEPS):
                          </Typography>
                          <Stack spacing={1} sx={{ mb: 2.5 }}>
                            {tc.steps.map((step, sIdx) => {
                              const stepKey = `${tc.id}-step-${sIdx}`;
                              const isChecked = !!completedSteps[stepKey];

                              return (
                                <Paper
                                  key={sIdx}
                                  sx={{
                                    p: 1.2,
                                    background: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.6)',
                                    border: isChecked ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: 1.5,
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        checked={isChecked}
                                        onChange={() => toggleStep(stepKey)}
                                        color="success"
                                        size="small"
                                      />
                                    }
                                    label={
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          color: isChecked ? '#a7f3d0' : '#f1f5f9',
                                          textDecoration: isChecked ? 'line-through' : 'none',
                                          fontSize: '0.88rem',
                                        }}
                                      >
                                        {step}
                                      </Typography>
                                    }
                                  />
                                </Paper>
                              );
                            })}
                          </Stack>

                          {/* Beklenen Sonuç */}
                          <Box sx={{ background: 'rgba(16, 185, 129, 0.1)', p: 1.5, borderRadius: 1.5, borderLeft: '3px solid #10b981' }}>
                            <Typography variant="caption" sx={{ color: '#34d399', fontWeight: 800, display: 'block' }}>
                              🎯 BEKLENEN SONUÇ (EXPECTED RESULT):
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#e2e8f0', mt: 0.5 }}>
                              {tc.expectedResult}
                            </Typography>
                          </Box>

                          {/* Otomasyon Test Kodu (Varsa) */}
                          {tc.automationSnippet && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, display: 'block', mb: 0.5 }}>
                                💻 Örnek Otomatik Test Kodu (Jest / Supertest):
                              </Typography>
                              <Paper sx={{ p: 1.5, background: '#05070d', borderRadius: 1, border: '1px solid rgba(255,255,255,0.08)' }}>
                                <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace', color: '#38bdf8', whiteSpace: 'pre-wrap', m: 0 }}>
                                  {tc.automationSnippet}
                                </Typography>
                              </Paper>
                            </Box>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Stack>
                </Grid>
              )}
            </Grid>
          )}

          {/* SEKME 1: GEÇMİŞ TEST PLANLARI */}
          {tabIndex === 1 && (
            <Card sx={{ border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(16px)' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Önceden Üretilen Test Planları
                </Typography>
                {history.length === 0 ? (
                  <Alert severity="info">Henüz kaydedilmiş bir test planı bulunmuyor.</Alert>
                ) : (
                  <Stack spacing={2}>
                    {history.map((item, idx) => (
                      <Paper
                        key={idx}
                        sx={{
                          p: 2.5,
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 2,
                        }}
                      >
                        <div>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                            {item.title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            Tarih: {new Date(item.createdAt).toLocaleString('tr-TR')} • Kategori: {item.category.toUpperCase()}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#cbd5e1', mt: 1 }}>
                            {item.diffSummary}
                          </Typography>
                        </div>
                        <Chip
                          label={`Önem: ${item.riskLevel}`}
                          sx={{
                            backgroundColor: `${getPriorityColor(item.riskLevel)}22`,
                            color: getPriorityColor(item.riskLevel),
                            border: `1px solid ${getPriorityColor(item.riskLevel)}`,
                            fontWeight: 700,
                          }}
                        />
                      </Paper>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          )}
        </Container>

        {/* 🌟 YENİ ŞABLON EKLEME / AI PROMPT DIALOG */}
        <Dialog
          open={openModal}
          onClose={() => setOpenModal(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              background: '#0e1424',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 3,
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, background: 'rgba(30, 41, 59, 0.6)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <span>✨ Hazır Şablon Ekle veya Yapay Zekaya Üret</span>
              <Tooltip
                arrow
                placement="bottom"
                title={
                  <Box sx={{ p: 1, fontSize: '0.84rem', lineHeight: 1.6, maxWidth: 380 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#06b6d4', mb: 0.5 }}>
                      💡 Bu Ekranın Amacı Nedir?
                    </Typography>
                    Sık test ettiğiniz kod yapılarını veya karmaşık senaryoları tek tıkla kullanabileceğiniz butonlar olarak kaydetmenizi sağlar.<br /><br />
                    • <b>1. Manuel Düzenle Sekmesi:</b> Size bir şablonun nasıl yazılacağını gösteren hazır rehber kodlarla açılır. İstediğiniz gibi düzenleyip şablonlarınıza ekleyebilirsiniz.<br />
                    • <b>2. AI Prompt ile Üret Sekmesi:</b> Kod yazmak yerine Türkçe prompt ile (Örn: <i>"Karakterin mana harcadığı büyü sistemi oluştur"</i>) tarif edebilir, yapay zekanın kodu oluşturmasını sağlayabilirsiniz.<br /><br />
                    💾 <i>Kaydettiğiniz şablonlar tarayıcınızda saklanır ve her zaman kullanıma hazır olur.</i>
                  </Box>
                }
              >
                <IconButton size="small" sx={{ color: '#06b6d4', p: 0.5 }}>
                  <InfoIcon />
                </IconButton>
              </Tooltip>
            </Stack>
            <IconButton size="small" onClick={() => setOpenModal(false)} sx={{ color: '#94a3b8' }}>
              ✕
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Tabs
              value={modalTab}
              onChange={(_, v) => setModalTab(v)}
              textColor="secondary"
              indicatorColor="secondary"
              sx={{ mb: 3, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Tab label="✍️ 1. Örnek Değerlerle Manuel Düzenle" sx={{ textTransform: 'none', fontWeight: 700 }} />
              <Tab label="🤖 2. Prompt Yazarak AI ile Otomatik Üret" sx={{ textTransform: 'none', fontWeight: 700 }} />
            </Tabs>

            {/* MODAL SEKME 0: MANUEL / REHBERLİ DEĞERLERLE */}
            {modalTab === 0 && (
              <Stack spacing={2}>
                <Alert severity="info" sx={{ background: 'rgba(6, 182, 212, 0.1)', color: '#67e8f9' }}>
                  Aşağıda örnek bir şablonun nasıl oluşturulacağı hazır rehber değerlerle doldurulmuştur. Bu değerleri silip kendi senaryonuzu yazabilirsiniz.
                </Alert>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Şablon Buton Adı"
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
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                />

                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                  1. Önceki Durum (Orijinal Kod) — (İsteğe bağlı, boş bırakılabilir):
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={modalOldCode}
                  onChange={(e) => setModalOldCode(e.target.value)}
                  sx={{ '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: '0.82rem', backgroundColor: 'rgba(0,0,0,0.3)' } }}
                />

                <Typography variant="caption" sx={{ color: '#34d399', fontWeight: 600 }}>
                  2. Yeni Durum (Değiştirilen / Eklenen Kod):
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  value={modalNewCode}
                  onChange={(e) => setModalNewCode(e.target.value)}
                  sx={{ '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: '0.82rem', backgroundColor: 'rgba(0,0,0,0.3)' } }}
                />
              </Stack>
            )}

            {/* MODAL SEKME 1: AI PROMPT İLE ÜRETME */}
            {modalTab === 1 && (
              <Stack spacing={2.5}>
                <Alert severity="success" sx={{ background: 'rgba(16, 185, 129, 0.1)', color: '#6ee7b7' }}>
                  Aklınızdaki oyun mekaniğini, API servisini veya kod senaryosunu Türkçe olarak tarif edin. Yapay zeka bunu anlayıp çalışan bir kod şablonuna dönüştürecektir!
                </Alert>

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Yapay Zekaya Prompt Yazın"
                  placeholder="Örnek: Bir RPG oyununda karakterin mana puanını harcayarak buz büyüsü fırlatmasını sağlayan ve bekleme süresi (cooldown) olan C# kodu şablonu hazırla..."
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                />

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={aiGenerating}
                  onClick={handleGenerateTemplateWithAI}
                  sx={{
                    py: 1.5,
                    fontWeight: 700,
                    background: 'linear-gradient(90deg, #06b6d4, #6366f1)',
                    textTransform: 'none',
                  }}
                >
                  {aiGenerating ? <CircularProgress size={24} color="inherit" /> : '🤖 Yapay Zeka ile Şablonu Oluştur'}
                </Button>
              </Stack>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Button onClick={() => setOpenModal(false)} sx={{ color: '#94a3b8', textTransform: 'none' }}>
              Vazgeç
            </Button>
            {modalTab === 0 && (
              <Button
                variant="contained"
                onClick={handleSaveCustomTemplate}
                sx={{
                  background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                  fontWeight: 700,
                  textTransform: 'none',
                  px: 3,
                }}
              >
                💾 Şablonlarıma Kaydet
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}

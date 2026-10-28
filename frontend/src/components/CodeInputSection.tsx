import React, { useState, useRef } from "react";
import {
  Card,
  CardContent,
  Stack,
  Typography,
  Tooltip,
  IconButton,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Box,
  Tabs,
  Tab,
  Chip,
  Paper,
  Divider,
} from "@mui/material";
import { TemplateSelector } from "./TemplateSelector";
import { DiffViewer } from "./DiffViewer";
import { TemplateItem } from "../types";
import { parseDocument, ParsedDocumentResult } from "../utils/documentParser";
import { api } from "../services/api";

const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle" }}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

const UploadIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle" }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const QUICK_PROMPTS = [
  {
    label: "📱 SMS OTP & 2FA Doğrulama",
    title: "Kullanıcı Girişi İçin İki Adımlı SMS/OTP Doğrulama Akışı",
    category: "security",
    prompt: `Kullanıcı giriş ve kayıt akışına 2FA SMS doğrulama mekanizması eklendi.
1. Kullanıcı telefon numarası ile giriş talep ettiğinde 6 haneli rastgele bir doğrulama kodu üretilir ve SMS servisine iletilir.
2. Üretilen OTP kodu 3 dakika geçerlidir ve Redis üzerinde saklanır.
3. Kullanıcı 3 defa hatalı kod girerse telefon numarası 15 dakika boyunca bloke edilir (Rate Limiting).
4. Doğru kod girildiğinde kullanıcı durumu 'ACTIVE' yapılır ve 1 saatlik JWT access token ile 7 günlük refresh token üretilir.
5. Süresi dolmuş kod ile giriş denendiğinde '401 - Kodun süresi doldu' hatası dönülmelidir.`,
  },
  {
    label: "🎮 Unity Can, Hasar & Yeniden Doğma",
    title: "Karakter Can Sistemi, Hasar Alma ve Checkpoint Mekaniği",
    category: "game",
    prompt: `Unity C# ile geliştirilen karakter kontrolcüsüne gelişmiş can ve hasar mekanikleri eklendi:
1. Karakterin başlangıç canı 150 birimdir (maxHealth = 150).
2. TakeDamage fonksiyonu ile hasar alındığında can azalır; can asla 0'ın altına düşemez (Mathf.Max).
3. Can 0 olduğunda IsDead bayrağı true olur ve karakter kontrolü devre dışı bırakılır.
4. Ölü karakter tekrar hasar alamaz veya iyileştirilemez.
5. Heal fonksiyonu ile iyileşme sağlanır ancak maxHealth tavanını aşamaz.
6. Karakter öldükten 3 saniye sonra en son ulaşılan Checkpoint pozisyonunda tam canla yeniden doğar (Respawn).`,
  },
  {
    label: "🛒 Sepet İndirim & Kupon Validasyonu",
    title: "E-Ticaret Sepet Fiyatlandırma, Kupon İndirimi ve Sepet Kuralları",
    category: "api",
    prompt: `Sepet ve ödeme servisine kupon uygulama ve sepet hesaplama mantığı eklendi:
1. Sepete ürün eklendiğinde alt toplam (subtotal) otomatik hesaplanır; adet ve birim fiyat pozitif sayı olmak zorundadır.
2. Sepet tutarı en az 250 TL olduğunda 'INDIRIM20' kupon kodu aktifleşir ve sepet tutarına %20 indirim uygular.
3. Sepet tutarı minimum sepet tutarının altına düşerse kupon otomatik olarak iptal edilir.
4. Kupon bir kullanıcı tarafından yalnızca 1 kez kullanılabilir; mükerrer kullanımda 'Kupon kotası doldu' hatası döner.
5. İndirimli toplam tutar asla kargo bedelinin altına düşemez.`,
  },
  {
    label: "🔒 Rate Limiting & Güvenlik Katmanı",
    title: "API Endpointleri İçin IP Tabanlı İstek Sınırlama ve Koruması",
    category: "security",
    prompt: `Halka açık API uç noktalarına IP tabanlı Rate Limiting katmanı entegre edildi:
1. Aynı IP adresinden dakikada en fazla 60 istek kabul edilir.
2. İstek sayısı 60'ı aştığında 429 Too Many Requests durum kodu ve Retry-After başlığı döndürülür.
3. Yetkili kullanıcılar (JWT Authorization başlığı taşıyanlar) için sınır dakikada 300 isteğe yükseltilir.
4. X-Forwarded-For başlığı güvenli ters proxy (Nginx) yapılandırmasıyla doğrulanır.`,
  },
];

interface CodeInputSectionProps {
  title: string;
  setTitle: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  previousContent: string;
  setPreviousContent: (val: string) => void;
  newContent: string;
  setNewContent: (val: string) => void;
  templates: TemplateItem[];
  defaultTemplatesCount: number;
  onSelectTemplate: (tpl: TemplateItem) => void;
  onOpenModal: () => void;
  onDeleteCustomTemplate: (customIndex: number, e: React.MouseEvent) => void;
  onSubmit: () => void;
  loading: boolean;
  errorMsg: string | null;
  hasResult: boolean;
  isOffline?: boolean;
  lastSaved?: string | null;
  draftRestored?: boolean;
  onSaveDraft?: () => void;
  onClearDraft?: () => void;
}

export const CodeInputSection: React.FC<CodeInputSectionProps> = ({
  title,
  setTitle,
  category,
  setCategory,
  previousContent,
  setPreviousContent,
  newContent,
  setNewContent,
  templates,
  defaultTemplatesCount,
  onSelectTemplate,
  onOpenModal,
  onDeleteCustomTemplate,
  onSubmit,
  loading,
  errorMsg,
  hasResult,
  isOffline,
  lastSaved,
  draftRestored,
  onSaveDraft,
  onClearDraft,
}) => {
  // Giriş Modu: 0 = Kod Karşılaştırma, 1 = Doğrudan Prompt / Metin, 2 = Belge / Dosya Yükleme (PDF, Word, Kod)
  const [inputMode, setInputMode] = useState<number>(0);

  // Prompt Modu State
  const [promptText, setPromptText] = useState("");
  const [generatingCodeFromPrompt, setGeneratingCodeFromPrompt] = useState(false);
  const [promptSuccessMsg, setPromptSuccessMsg] = useState<string | null>(null);

  // Dosya Yükleme Modu State
  const [fileParsing, setFileParsing] = useState(false);
  const [parsedFileInfo, setParsedFileInfo] = useState<ParsedDocumentResult | null>(null);
  const [compareMode, setCompareMode] = useState<"single" | "dual">("single");
  const [parsedOldFileInfo, setParsedOldFileInfo] = useState<ParsedDocumentResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const oldFileInputRef = useRef<HTMLInputElement>(null);

  // Hızlı Senaryo Seçimi
  const handleSelectQuickPrompt = (qp: (typeof QUICK_PROMPTS)[0]) => {
    setTitle(qp.title);
    setCategory(qp.category);
    setPromptText(qp.prompt);
    setPromptSuccessMsg(`"${qp.label}" hazır senaryosu yüklendi.`);
    setTimeout(() => setPromptSuccessMsg(null), 3000);
  };

  // Prompt'u doğrudan yeni içerik olarak atayıp Test Adımlarını Oluştur
  const handleSubmitFromPrompt = () => {
    if (!promptText.trim()) {
      alert("Lütfen bir senaryo veya değişiklik açıklaması (prompt) girin.");
      return;
    }
    // Başlık boşsa ilk satırdan üret
    if (!title.trim()) {
      const firstLine = promptText.trim().split("\n")[0].replace(/^#+\s*/, "").slice(0, 60);
      setTitle(firstLine || "Özel Değişiklik Talebi");
    }
    setNewContent(promptText);
    setTimeout(() => {
      onSubmit();
    }, 50);
  };

  // Prompt'tan Kod Şablonuna Dönüştürme (AI / Akıllı Motor)
  const handleConvertPromptToCode = async () => {
    if (!promptText.trim()) {
      alert("Lütfen önce bir senaryo veya değişiklik açıklaması (prompt) girin.");
      return;
    }
    setGeneratingCodeFromPrompt(true);
    try {
      const res = await api.generateTemplateWithAI(promptText);
      setTitle(res.title || title || "AI Tarafından Üretilen Değişiklik");
      setCategory(res.category || category || "code");
      setPreviousContent(res.oldCode || "");
      setNewContent(res.newCode || promptText);
      setInputMode(0); // Kod moduna geç
      setPromptSuccessMsg("✨ Senaryonuz kod değişikliklerine dönüştürüldü ve Kod alanına aktarıldı!");
      setTimeout(() => setPromptSuccessMsg(null), 4000);
    } catch (err: any) {
      alert("Kod üretilirken hata oluştu: " + err.message);
    } finally {
      setGeneratingCodeFromPrompt(false);
    }
  };

  // Tek Dosya Yükleme (PDF, Word, TXT, Kod vb.)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileParsing(true);
    try {
      const result = await parseDocument(file);
      setParsedFileInfo(result);

      // Başlık boşsa dosya adından ata
      if (!title.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        setTitle(`${cleanName} Değişiklik Analizi`);
      }

      // Yeni durum alanına metni aktar
      setNewContent(result.text);

      // Kategori tahmini
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "cs") setCategory("game");
      else if (ext === "sql") setCategory("database");
      else if (ext === "ts" || ext === "js" || ext === "py") setCategory("code");
    } catch (err: any) {
      alert("Dosya okunurken hata oluştu: " + err.message);
    } finally {
      setFileParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Çift Dosya Modunda Önceki Versiyon Dosyasını Yükleme
  const handleOldFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileParsing(true);
    try {
      const result = await parseDocument(file);
      setParsedOldFileInfo(result);
      setPreviousContent(result.text);
    } catch (err: any) {
      alert("Önceki versiyon dosyası okunurken hata oluştu: " + err.message);
    } finally {
      setFileParsing(false);
      if (oldFileInputRef.current) oldFileInputRef.current.value = "";
    }
  };

  // Sürükle Bırak (Drag & Drop) Desteği
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      setFileParsing(true);
      try {
        const result = await parseDocument(file);
        setParsedFileInfo(result);
        if (!title.trim()) {
          const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
          setTitle(`${cleanName} Değişiklik Analizi`);
        }
        setNewContent(result.text);
      } catch (err: any) {
        alert("Dosya okunurken hata: " + err.message);
      } finally {
        setFileParsing(false);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Card
      sx={{
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(16px)",
        height: "100%",
      }}
    >
      <CardContent>
        {/* Üst Başlık ve Bilgilendirme */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Değişikliği Tanımlayın
          </Typography>
          <Tooltip
            arrow
            placement="right"
            title={
              <Box sx={{ p: 1, fontSize: "0.84rem", lineHeight: 1.6, maxWidth: 380 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#38bdf8", mb: 0.5 }}>
                  📌 Değişiklik Verisi Giriş Yolları
                </Typography>
                Değişikliği 3 farklı formatta verebilirsiniz:<br /><br />
                • <b>1. Kod Karşılaştırma:</b> Eski ve yeni kodları yapıştırarak semantik diff analizi yapın.<br />
                • <b>2. Prompt / Doğrudan Metin:</b> Değişiklik senaryosunu veya kullanıcı hikayesini serbest metin olarak yazın.<br />
                • <b>3. PDF / Dosya Yükleme:</b> PDF, Word (.docx), metin veya kod dosyalarını sürükleyip bırakarak doğrudan metin ayıklayın.<br /><br />
                💡 <i>Sistem her formattaki değişikliği analiz ederek adım adım çalıştırılabilir Test Senaryoları üretir.</i>
              </Box>
            }
          >
            <IconButton size="small" sx={{ color: "#38bdf8", p: 0.5 }}>
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        <Typography variant="body2" sx={{ color: "#94a3b8", mb: 1.5 }}>
          Değişiklik verilerini <b>kod</b>, <b>prompt / senaryo metni</b> veya <b>PDF / dosya</b> formatlarında sağlayın.
        </Typography>

        {/* Çevrimdışı Mod Uyarısı */}
        {isOffline && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            ⚠️ <b>İnternet bağlantınız koptu!</b> Çevrimdışı moddasınız; girdiğiniz veriler yerel hafızada güvenle korunuyor.
          </Alert>
        )}

        {/* Kurtarılan Taslak Bildirimi */}
        {draftRestored && (
          <Alert
            severity="info"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={onClearDraft}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Taslağı Temizle
              </Button>
            }
            sx={{ mb: 2 }}
          >
            💾 <b>Kurtarılan Taslak Yüklendi:</b> Önceki oturumda girdiğiniz veriler otomatik geri yüklendi.
          </Alert>
        )}

        {/* Otomatik Veri Koruma & Ctrl + S Bilgi Çubuğu */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 1,
            px: 1.5,
            mb: 2,
            background: "rgba(99, 102, 241, 0.08)",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            borderRadius: 2,
            fontSize: "0.78rem",
            color: "#c7d2fe",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <span style={{ fontSize: "1rem" }}>🛡️</span>
            <span>
              <b>Otomatik Veri Koruma</b> — <span style={{ opacity: 0.85 }}>Kaydetmek için <kbd style={{ background: "rgba(0,0,0,0.4)", padding: "2px 6px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.15)", fontSize: "0.74rem" }}>Ctrl + S</kbd></span>
            </span>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            {lastSaved ? (
              <span style={{ color: "#34d399", fontWeight: 600 }}>
                ✓ Son kayıt: {lastSaved}
              </span>
            ) : (
              <span style={{ opacity: 0.7 }}>Hazır</span>
            )}
            {onSaveDraft && (
              <Tooltip title="Taslağı şimdi kaydet (Ctrl + S)">
                <Button
                  size="small"
                  variant="text"
                  onClick={onSaveDraft}
                  sx={{
                    color: "#38bdf8",
                    minWidth: "auto",
                    p: "2px 8px",
                    fontSize: "0.75rem",
                    textTransform: "none",
                    fontWeight: 700,
                  }}
                >
                  Kaydet
                </Button>
              </Tooltip>
            )}
          </Stack>
        </Box>

        {/* Giriş Yöntemi / Formatı Seçim Sekmeleri */}
        <Paper
          elevation={0}
          sx={{
            background: "rgba(15, 23, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 2,
            p: 0.5,
            mb: 2,
          }}
        >
          <Tabs
            value={inputMode}
            onChange={(_, val) => setInputMode(val)}
            variant="fullWidth"
            textColor="inherit"
            indicatorColor="primary"
            sx={{
              minHeight: 40,
              "& .MuiTab-root": {
                minHeight: 40,
                fontSize: "0.85rem",
                fontWeight: 600,
                textTransform: "none",
                borderRadius: 1.5,
                transition: "all 0.2s",
                "&.Mui-selected": {
                  background: "rgba(99, 102, 241, 0.2)",
                  color: "#38bdf8",
                },
              },
            }}
          >
            <Tab label="💻 Kod Karşılaştırma" />
            <Tab label="💬 Prompt / Doğrudan Metin" />
            <Tab label="📄 PDF & Dosya Yükleme" />
          </Tabs>
        </Paper>

        {promptSuccessMsg && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {promptSuccessMsg}
          </Alert>
        )}

        {/* Ortak Alanlar: Başlık ve Kategori */}
        <TextField
          fullWidth
          size="small"
          label="Değişiklik / Görev Başlığı"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Örn: 2FA SMS Doğrulama Entegrasyonu veya Karakter Can Sistemi"
          sx={{ mb: 1.5 }}
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
          <MenuItem value="none">Seçilmedi (Otomatik Belirle)</MenuItem>
          <MenuItem value="game">🎮 Oyun Geliştirme (Unity / Unreal / C# / C++)</MenuItem>
          <MenuItem value="mobile">📱 Mobil Uygulama (Android / iOS / Flutter)</MenuItem>
          <MenuItem value="code">💻 Genel Kaynak Kod (Python / Java / Go / Rust)</MenuItem>
          <MenuItem value="api">🌐 API & Entegrasyon Sözleşmesi</MenuItem>
          <MenuItem value="database">🗄️ Veritabanı / SQL Migrasyonu</MenuItem>
          <MenuItem value="security">🔒 Güvenlik & Yetkilendirme</MenuItem>
        </TextField>

        {/* ======================= MOD 0: KOD KARŞILAŞTIRMA ======================= */}
        {inputMode === 0 && (
          <Box>
            <TemplateSelector
              templates={templates}
              defaultTemplatesCount={defaultTemplatesCount}
              onSelectTemplate={onSelectTemplate}
              onOpenModal={onOpenModal}
              onDeleteCustomTemplate={onDeleteCustomTemplate}
            />

            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 600, display: "block", mb: 0.5 }}>
              1. Önceki Durum (Orijinal Kod / Veri) — <span style={{ color: "#06b6d4" }}>(Yeni özellik eklerken boş bırakılabilir)</span>
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={hasResult ? 4 : 6}
              value={previousContent}
              onChange={(e) => setPreviousContent(e.target.value)}
              placeholder="Mevcut eski kodu buraya yapıştırın veya sıfırdan ekliyorsanız boş bırakın..."
              sx={{
                mb: 2,
                "& .MuiInputBase-root": {
                  fontFamily: "monospace",
                  fontSize: "0.82rem",
                  backgroundColor: "rgba(0,0,0,0.3)",
                },
              }}
            />

            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 600, display: "block", mb: 0.5 }}>
              2. Yeni Durum (Değiştirilen / Eklenen Kod)
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={hasResult ? 5 : 7}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Yeni eklenen veya güncellenen kodları buraya yapıştırın..."
              sx={{
                mb: 2,
                "& .MuiInputBase-root": {
                  fontFamily: "monospace",
                  fontSize: "0.82rem",
                  backgroundColor: "rgba(0,0,0,0.3)",
                },
              }}
            />

            {/* Kod Diff Görüntüleyici */}
            <DiffViewer oldCode={previousContent} newCode={newContent} />
          </Box>
        )}

        {/* ======================= MOD 1: PROMPT / DOĞRUDAN METİN ======================= */}
        {inputMode === 1 && (
          <Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700, display: "block", mb: 1 }}>
                ⚡ Hızlı Senaryo Şablonları (Tek Tıkla Yükle):
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                {QUICK_PROMPTS.map((qp, idx) => (
                  <Chip
                    key={idx}
                    label={qp.label}
                    size="small"
                    onClick={() => handleSelectQuickPrompt(qp)}
                    clickable
                    sx={{
                      fontSize: "0.76rem",
                      background: "rgba(99, 102, 241, 0.15)",
                      border: "1px solid rgba(99, 102, 241, 0.3)",
                      color: "#c7d2fe",
                      "&:hover": { background: "rgba(99, 102, 241, 0.3)" },
                    }}
                  />
                ))}
              </Stack>
            </Box>

            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 600, display: "block", mb: 0.5 }}>
              💬 Değişiklik veya İhtiyaç Prompt'u (Gereksinimler, İş Kuralları, Senaryo):
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={hasResult ? 6 : 9}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder={`Örnek Prompt:
"Yeni bir kupon indirim sistemi geliştirdik.
- Sepet tutarı en az 200 TL ise 'BAHAR20' kuponu %20 indirim uygular.
- Kupon bir kullanıcı tarafından en fazla 1 kez kullanılabilir.
- Hatalı veya süresi dolmuş kuponlarda anlaşılır hata mesajı dönmelidir.
- Maksimum indirim tutarı 100 TL ile sınırlandırılmıştır."`}
              sx={{
                mb: 2,
                "& .MuiInputBase-root": {
                  fontSize: "0.85rem",
                  backgroundColor: "rgba(0,0,0,0.3)",
                  lineHeight: 1.6,
                },
              }}
            />

            <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                color="secondary"
                size="medium"
                onClick={handleConvertPromptToCode}
                disabled={generatingCodeFromPrompt || !promptText.trim()}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  borderColor: "rgba(6, 182, 212, 0.4)",
                  "&:hover": { borderColor: "#06b6d4" },
                }}
              >
                {generatingCodeFromPrompt ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={16} color="inherit" />
                    <span>Koda Dönüştürülüyor...</span>
                  </Stack>
                ) : (
                  "🔄 Prompt'u Kod Şablonuna Dönüştür"
                )}
              </Button>

              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setNewContent(promptText);
                  setPromptSuccessMsg("Metin 'Yeni Durum' alanına aktarıldı.");
                  setTimeout(() => setPromptSuccessMsg(null), 3000);
                }}
                disabled={!promptText.trim()}
                sx={{
                  textTransform: "none",
                  color: "#94a3b8",
                  fontSize: "0.8rem",
                }}
              >
                İçeriğe Aktar
              </Button>
            </Stack>
          </Box>
        )}

        {/* ======================= MOD 2: BELGE / DOSYA YÜKLEME (PDF, WORD, KOD) ======================= */}
        {inputMode === 2 && (
          <Box>
            {/* Karşılaştırma Modu Seçici (Tek Dosya vs İki Dosya) */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700 }}>
                📁 Desteklenen Formatlar: <b>PDF (.pdf), Word (.docx), Metin (.txt, .md), Kod (.cs, .ts, .py, .java, .sql, .diff)</b>
              </Typography>
              <Stack direction="row" spacing={1}>
                <Chip
                  label="Tek Dosya"
                  size="small"
                  variant={compareMode === "single" ? "filled" : "outlined"}
                  color={compareMode === "single" ? "primary" : "default"}
                  onClick={() => setCompareMode("single")}
                  sx={{ fontSize: "0.72rem", cursor: "pointer" }}
                />
                <Chip
                  label="İki Dosya (Eski vs Yeni)"
                  size="small"
                  variant={compareMode === "dual" ? "filled" : "outlined"}
                  color={compareMode === "dual" ? "primary" : "default"}
                  onClick={() => setCompareMode("dual")}
                  sx={{ fontSize: "0.72rem", cursor: "pointer" }}
                />
              </Stack>
            </Stack>

            {/* Çift Dosya Modunda Önceki Versiyon Dosyası Yükleme Alanı */}
            {compareMode === "dual" && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: "#38bdf8", fontWeight: 700, display: "block", mb: 0.5 }}>
                  1. Önceki Durum Dosyası (Eski Versiyon):
                </Typography>
                <input
                  type="file"
                  ref={oldFileInputRef}
                  style={{ display: "none" }}
                  accept=".pdf,.docx,.txt,.md,.cs,.ts,.js,.py,.java,.sql,.json,.diff,.patch"
                  onChange={handleOldFileUpload}
                />
                <Paper
                  variant="outlined"
                  onClick={() => oldFileInputRef.current?.click()}
                  sx={{
                    p: 2,
                    border: "1px dashed rgba(255, 255, 255, 0.2)",
                    borderRadius: 2,
                    textAlign: "center",
                    cursor: "pointer",
                    background: "rgba(0, 0, 0, 0.2)",
                    transition: "all 0.2s",
                    "&:hover": { borderColor: "#38bdf8", background: "rgba(56, 189, 248, 0.05)" },
                  }}
                >
                  {parsedOldFileInfo ? (
                    <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.5}>
                      <span style={{ fontSize: "1.2rem" }}>📄</span>
                      <Box sx={{ textAlign: "left" }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "#38bdf8" }}>
                          {parsedOldFileInfo.fileName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                          {parsedOldFileInfo.fileType} • {parsedOldFileInfo.fileSizeFormatted} • {parsedOldFileInfo.lineCount} satır
                        </Typography>
                      </Box>
                    </Stack>
                  ) : (
                    <Typography variant="body2" sx={{ color: "#94a3b8", fontSize: "0.82rem" }}>
                      Önceki versiyon dosyasını seçmek için tıklayın (PDF, Word veya Kod)
                    </Typography>
                  )}
                </Paper>
              </Box>
            )}

            {/* Ana / Yeni Durum Dosyası Sürükle Bırak Alanı */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept=".pdf,.docx,.txt,.md,.cs,.ts,.js,.py,.java,.sql,.json,.diff,.patch"
              onChange={handleFileUpload}
            />

            <Paper
              variant="outlined"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                p: 3,
                border: "2px dashed rgba(99, 102, 241, 0.4)",
                borderRadius: 2.5,
                textAlign: "center",
                cursor: "pointer",
                background: "rgba(99, 102, 241, 0.04)",
                transition: "all 0.2s",
                mb: 2,
                "&:hover": {
                  borderColor: "#6366f1",
                  background: "rgba(99, 102, 241, 0.08)",
                },
              }}
            >
              {fileParsing ? (
                <Stack direction="column" alignItems="center" spacing={1}>
                  <CircularProgress size={32} color="primary" />
                  <Typography variant="body2" sx={{ color: "#c7d2fe", fontWeight: 600 }}>
                    Belge taranıyor ve metin ayıklanıyor...
                  </Typography>
                </Stack>
              ) : parsedFileInfo ? (
                <Box>
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.5} sx={{ mb: 1 }}>
                    <span style={{ fontSize: "1.8rem" }}>📑</span>
                    <Box sx={{ textAlign: "left" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#34d399" }}>
                        {parsedFileInfo.fileName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                        {parsedFileInfo.fileType} • {parsedFileInfo.fileSizeFormatted} • {parsedFileInfo.lineCount} satır • {parsedFileInfo.charCount} karakter
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography variant="caption" sx={{ color: "#38bdf8", display: "block" }}>
                    ✓ Metin başarıyla çıkarıldı! Farklı dosya seçmek için tıklayın veya sürükleyin.
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Box sx={{ color: "#6366f1", mb: 1 }}>
                    <UploadIcon />
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#e2e8f0", mb: 0.5 }}>
                    {compareMode === "dual" ? "2. Yeni Durum / Değişiklik Dosyasını Yükleyin" : "Değişiklik Belgesini veya Kodunu Buraya Sürükleyin"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                    Dosya seçmek için tıklayın veya sürükleyip bırakın (PDF, Word, TXT, MD, C#, TS, Py, SQL vb.)
                  </Typography>
                </Box>
              )}
            </Paper>

            {/* Çıkarılan Metin Önizlemesi ve Düzenleme */}
            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 600, display: "block", mb: 0.5 }}>
              Ayrıştırılan Değişiklik İçeriği (Gerektiğinde düzenleyebilirsiniz):
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={hasResult ? 5 : 8}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Yüklediğiniz PDF veya dosyadan çıkarılan metin burada listelenir..."
              sx={{
                mb: 2,
                "& .MuiInputBase-root": {
                  fontFamily: "monospace",
                  fontSize: "0.82rem",
                  backgroundColor: "rgba(0,0,0,0.3)",
                },
              }}
            />

            {compareMode === "dual" && previousContent && (
              <DiffViewer oldCode={previousContent} newCode={newContent} />
            )}
          </Box>
        )}

        {/* Hata Mesajı */}
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMsg}
          </Alert>
        )}

        {/* Ana Aksiyon Butonu */}
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={inputMode === 1 ? handleSubmitFromPrompt : onSubmit}
          disabled={loading || (inputMode === 1 ? !promptText.trim() : !newContent.trim())}
          sx={{
            py: 1.5,
            fontWeight: 700,
            background: "linear-gradient(90deg, #6366f1, #06b6d4)",
            textTransform: "none",
            fontSize: "0.95rem",
            boxShadow: "0 4px 14px 0 rgba(99, 102, 241, 0.39)",
            "&:hover": {
              background: "linear-gradient(90deg, #4f46e5, #0891b2)",
            },
          }}
        >
          {loading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={22} color="inherit" />
              <span>Test Adımları Oluşturuluyor...</span>
            </Stack>
          ) : (
            `✨ ${inputMode === 1 ? "Prompt İle Test Adımlarını Oluştur" : inputMode === 2 ? "Yüklenen Belgeyle Test Adımlarını Oluştur" : "Test Adımlarını Oluştur"}`
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

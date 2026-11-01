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
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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

const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle" }}>
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const QA_QUICK_PROMPTS = [
  {
    label: "📱 UI Donması & Çift Tıklama",
    title: "Giriş Butonuna Çift Tıklamada UI Kilitlenmesi ve Sonsuz Spinner",
    category: "ui_ux",
    prompt: `Kullanıcı mobil veya web arayüzünde işlem butonuna arka arkaya hızlıca tıkladığında:
1. İlk tıklamada buton derhal disable ve loading durumuna geçmeli, mükerrer istekler bloke edilmelidir.
2. İşlem tamamlanmadan ekranın donması, beyaz ekrana düşmesi veya kontrolsüz 500 hatası üretmesi engellenmelidir.
3. Ağ gecikmesi durumunda kullanıcıya anlaşılır bekleme göstergesi sunulmalıdır.`,
  },
  {
    label: "💳 Kupon & İndirim Validasyonu",
    title: "Sepette Kupon İndirimi, Minimum Sepet Tutarı ve Hata Bildirimi",
    category: "functional",
    prompt: `E-ticaret ödeme ve sepet akışında kupon doğrulama testi:
1. En az 250 TL alt toplam sağlandığında kupon %20 indirim yapmalıdır.
2. Sepetten ürün çıkarılıp limitin altına inilirse indirim anında iptal edilmeli ve sepet güncellenmelidir.
3. Süresi geçmiş veya kullanılmış kupon kodlarında kullanıcıya toast ile 'Kupon geçersiz' uyarısı gösterilmelidir.`,
  },
  {
    label: "🎮 Oyun Hasar, Can & Respawn",
    title: "Oyun İçi Can Azalması, Hasar Görseli ve Doğru Pozisyonda Yeniden Doğma",
    category: "gameplay",
    prompt: `Oyun içi karakter can sistemi ve kullanıcı deneyimi testi:
1. Karakter hasar aldığında can barı yumuşak bir animasyonla azalmalı ve kırmızı ekran flaşı tetiklenmelidir.
2. Can 0 olduğunda karakter animasyonu ölü durumuna geçmeli ve kontroller kilitlenmelidir.
3. 3 saniye sonra karakter en son ulaştığı Checkpoint noktasında tam canla sorunsuz yeniden doğmalıdır.`,
  },
  {
    label: "🔒 2FA SMS & Hesap Kilidi",
    title: "Hatalı SMS Kodu Girişi, Geri Sayım Sayacı ve Brute-Force Engeli",
    category: "security_qa",
    prompt: `Kullanıcı doğrulama ve güvenlik kabul testi:
1. Kullanıcı 3 defa yanlış OTP kodu girdiğinde hesap 15 dakika askıya alınmalıdır.
2. Ekranda kalan süreyi gösteren canlı geri sayım sayacı yer almalıdır.
3. Tarayıcı yenilendiğinde veya geri gelindiğinde oturum yetkisiz açılmamalıdır.`,
  },
];

const DEV_QUICK_PROMPTS = [
  {
    label: "🔒 SMS OTP & 2FA Doğrulama",
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
    label: "🌐 Sepet İndirim & Kupon Validasyonu",
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
  onSubmit: (customOverride?: {
    customTitle?: string;
    customNewContent?: string;
    customPreviousContent?: string;
  }) => void;
  loading: boolean;
  errorMsg: string | null;
  hasResult: boolean;
  isOffline?: boolean;
  lastSaved?: string | null;
  draftRestored?: boolean;
  onSaveDraft?: () => void;
  onClearDraft?: () => void;
  activePersona?: "qa" | "developer";
}

// Varsayılan Kategoriler
const INITIAL_DEV_CATEGORIES = [
  { value: "none", label: "Seçilmedi (Otomatik Belirle)" },
  { value: "game", label: "🎮 Oyun Geliştirme (Unity / Unreal / C# / C++)" },
  { value: "mobile", label: "📱 Mobil Uygulama (Android / iOS / Flutter)" },
  { value: "code", label: "💻 Genel Kaynak Kod (Python / Java / Go / Rust)" },
  { value: "api", label: "🌐 API & Entegrasyon Sözleşmesi" },
  { value: "database", label: "🗄️ Veritabanı / SQL Migrasyonu" },
  { value: "security", label: "🔒 Güvenlik & Yetkilendirme" },
];

const INITIAL_QA_CATEGORIES = [
  { value: "none", label: "Seçilmedi (Otomatik Belirle)" },
  { value: "ui_ux", label: "🎨 Kullanıcı Arayüzü & Görsel Regresyon (UI/UX)" },
  { value: "functional", label: "⚙️ Fonksiyonel & Uçtan Uca Kabul Testi (E2E)" },
  { value: "mobile_app", label: "📱 Mobil Uygulama & Dokunmatik Deneyim" },
  { value: "gameplay", label: "🎮 Oyun Mekaniği & Kullanıcı Deneyimi" },
  { value: "api_contract", label: "🌐 API Entegrasyonu & Ağ Dayanıklılığı" },
  { value: "security_qa", label: "🔒 Güvenlik, Oturum & Negatif Senaryolar" },
  { value: "performance", label: "⚡ Performans, Gecikme & Donma Testi" },
];

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
  activePersona = "qa",
}) => {
  const isQa = activePersona === "qa";
  // Giriş Modu: 0 = İlk Sekme (Developer modunda Kod Karşılaştırma, QA modunda Video & Fotoğraf), 1 = Doğrudan Prompt / Metin, 2 = Belge / Dosya Yükleme (PDF, Word, Kod)
  const [inputMode, setInputMode] = useState<number>(0);

  // QA ve Dev Modu Kategorileri (Varsayılanlar ve Kullanıcı Tarafından Eklenen/Çıkarılanlar)
  const [qaCategories, setQaCategories] = useState<Array<{ value: string; label: string }>>(() => {
    try {
      const saved = localStorage.getItem("qa_categories_list_v2");
      return saved ? JSON.parse(saved) : INITIAL_QA_CATEGORIES;
    } catch {
      return INITIAL_QA_CATEGORIES;
    }
  });

  const [devCategories, setDevCategories] = useState<Array<{ value: string; label: string }>>(() => {
    try {
      const saved = localStorage.getItem("dev_categories_list_v2");
      return saved ? JSON.parse(saved) : INITIAL_DEV_CATEGORIES;
    } catch {
      return INITIAL_DEV_CATEGORIES;
    }
  });

  // Tür Yönetimi & Ekleme Dialogu State'i
  const [openCategoryManageDialog, setOpenCategoryManageDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    const valueKey = `custom_${Date.now()}_${trimmed.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    const newEntry = {
      value: valueKey,
      label: `🏷️ ${trimmed}`,
    };

    if (isQa) {
      const updated = [...qaCategories, newEntry];
      setQaCategories(updated);
      try {
        localStorage.setItem("qa_categories_list_v2", JSON.stringify(updated));
      } catch {}
    } else {
      const updated = [...devCategories, newEntry];
      setDevCategories(updated);
      try {
        localStorage.setItem("dev_categories_list_v2", JSON.stringify(updated));
      } catch {}
    }

    setCategory(valueKey);
    setNewCategoryName("");
  };

  const handleDeleteCategory = (categoryValue: string) => {
    if (categoryValue === "none") return; // "Seçilmedi" silinemez

    if (isQa) {
      const updated = qaCategories.filter((c) => c.value !== categoryValue);
      setQaCategories(updated);
      try {
        localStorage.setItem("qa_categories_list_v2", JSON.stringify(updated));
      } catch {}
    } else {
      const updated = devCategories.filter((c) => c.value !== categoryValue);
      setDevCategories(updated);
      try {
        localStorage.setItem("dev_categories_list_v2", JSON.stringify(updated));
      } catch {}
    }

    if (category === categoryValue) {
      setCategory("none");
    }
  };

  const handleResetCategoriesToDefault = () => {
    if (isQa) {
      setQaCategories(INITIAL_QA_CATEGORIES);
      try {
        localStorage.setItem("qa_categories_list_v2", JSON.stringify(INITIAL_QA_CATEGORIES));
      } catch {}
    } else {
      setDevCategories(INITIAL_DEV_CATEGORIES);
      try {
        localStorage.setItem("dev_categories_list_v2", JSON.stringify(INITIAL_DEV_CATEGORIES));
      } catch {}
    }
    setCategory("none");
  };

  const currentCategories = isQa ? qaCategories : devCategories;

  // QA Modu: Video ve Fotoğraf Yükleme State'i
  interface MediaItem {
    id: string;
    file: File;
    name: string;
    sizeFormatted: string;
    type: "image" | "video";
    previewUrl: string;
    note?: string;
  }
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [mediaNotes, setMediaNotes] = useState("");
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: MediaItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(file.name);
      const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(file.name);

      if (!isVideo && !isImage) {
        continue;
      }

      const sizeFormatted = file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

      newItems.push({
        id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        file,
        name: file.name,
        sizeFormatted,
        type: isVideo ? "video" : "image",
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (newItems.length > 0) {
      setMediaList((prev) => [...prev, ...newItems]);
      // Başlık boşsa ilk dosya adından öner
      if (!title.trim()) {
        const cleanName = newItems[0].name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        setTitle(`${cleanName} QA İncelemesi`);
      }
      // Otomatik yeni içerik metnini güncelle
      syncMediaContent([...mediaList, ...newItems], mediaNotes);
    }

    // Reset input
    if (mediaInputRef.current) {
      mediaInputRef.current.value = "";
    }
  };

  const handleRemoveMedia = (id: string) => {
    setMediaList((prev) => {
      const filtered = prev.filter((m) => {
        if (m.id === id) {
          URL.revokeObjectURL(m.previewUrl);
          return false;
        }
        return true;
      });
      syncMediaContent(filtered, mediaNotes);
      return filtered;
    });
  };

  const syncMediaContent = (items: MediaItem[], notes: string) => {
    const summaryLines: string[] = [
      `[QA Medya İncelemesi ve Test Talebi]`,
      `Toplam Eklenen Medya Sayısı: ${items.length}`,
    ];

    if (items.length > 0) {
      summaryLines.push("\nEklenen Ekran Görüntüleri ve Hata Videoları:");
      items.forEach((item, idx) => {
        summaryLines.push(
          `${idx + 1}. [${item.type === "video" ? "VİDEO KAYDI" : "FOTOĞRAF / EKRAN GÖRÜNTÜSÜ"}] ${item.name} (${item.sizeFormatted})`
        );
      });
    }

    if (notes.trim()) {
      summaryLines.push(`\nQA Test Notları ve Gözlemlenen Davranış:`);
      summaryLines.push(notes.trim());
    } else {
      summaryLines.push(`\nQA Test Kapsamı: Kullanıcı arayüzü görsel doğrulaması, hata/regresyon tespiti ve ekran kayıtlarındaki beklenen kullanıcı adımları.`);
    }

    const compiledText = summaryLines.join("\n");
    setNewContent(compiledText);
  };

  const handleMediaNotesChange = (val: string) => {
    setMediaNotes(val);
    syncMediaContent(mediaList, val);
  };

  // Prompt Modu State
  const [promptText, setPromptText] = useState("");
  const [generatingCodeFromPrompt, setGeneratingCodeFromPrompt] = useState(false);
  const [promptSuccessMsg, setPromptSuccessMsg] = useState<string | null>(null);

  // Dosya Yükleme Modu State
  const [fileParsing, setFileParsing] = useState(false);
  const [parsedFileInfo, setParsedFileInfo] = useState<ParsedDocumentResult | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [fileOldContent, setFileOldContent] = useState("");
  const [compareMode, setCompareMode] = useState<"single" | "dual">("single");
  const [parsedOldFileInfo, setParsedOldFileInfo] = useState<ParsedDocumentResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const oldFileInputRef = useRef<HTMLInputElement>(null);

  // Hızlı Senaryo Seçimi
  const handleSelectQuickPrompt = (qp: { label: string; title: string; category: string; prompt: string }) => {
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
    const derivedTitle = title.trim() || promptText.trim().split("\n")[0].replace(/^#+\s*/, "").slice(0, 60) || "Özel Değişiklik Talebi";
    if (!title.trim()) {
      setTitle(derivedTitle);
    }
    setNewContent(promptText);
    onSubmit({
      customTitle: derivedTitle,
      customNewContent: promptText,
    });
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

      // Dosya içeriği alanına aktar ve senkronize et
      setFileContent(result.text);
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
      setFileOldContent(result.text);
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
        setFileContent(result.text);
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
        border: isQa ? "1px solid rgba(6, 182, 212, 0.3)" : "1px solid rgba(16, 185, 129, 0.3)",
        boxShadow: isQa
          ? "0 8px 32px -4px rgba(6, 182, 212, 0.15)"
          : "0 8px 32px -4px rgba(16, 185, 129, 0.15)",
        backdropFilter: "blur(16px)",
        height: "100%",
        transition: "all 0.3s ease-in-out",
      }}
    >
      <CardContent>
        {/* Aktif Mod Rozeti (QA / Developer) */}
        <Box
          sx={{
            mb: 2,
            p: 1.2,
            px: 2,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: isQa
              ? "linear-gradient(90deg, rgba(6, 182, 212, 0.12) 0%, rgba(99, 102, 241, 0.08) 100%)"
              : "linear-gradient(90deg, rgba(16, 185, 129, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)",
            border: isQa ? "1px solid rgba(6, 182, 212, 0.3)" : "1px solid rgba(16, 185, 129, 0.3)",
          }}
        >
          <Stack direction="row" spacing={1.2} alignItems="center">
            <span style={{ fontSize: "1.25rem" }}>{isQa ? "🧪" : "💻"}</span>
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  color: isQa ? "#38bdf8" : "#34d399",
                  lineHeight: 1.2,
                }}
              >
                {isQa ? "QA / Test Mühendisi Bakış Açısı Aktif" : "Developer / Yazılım Geliştirici Bakış Açısı Aktif"}
              </Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>
                {isQa
                  ? "Sistem kullanıcı deneyimi, E2E yolculuk, sınır değerler ve negatif senaryoları analiz eder."
                  : "Sistem kod sözleşmeleri, exception yakalama, unit testler ve refactor risklerini analiz eder."}
              </Typography>
            </Box>
          </Stack>
          <Chip
            size="small"
            label={isQa ? "QA Motoru" : "Dev Motoru"}
            sx={{
              fontWeight: 700,
              fontSize: "0.72rem",
              background: isQa ? "rgba(6, 182, 212, 0.2)" : "rgba(16, 185, 129, 0.2)",
              color: isQa ? "#38bdf8" : "#34d399",
              border: isQa ? "1px solid rgba(6, 182, 212, 0.4)" : "1px solid rgba(16, 185, 129, 0.4)",
            }}
          />
        </Box>

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
                {isQa ? (
                  <>
                    QA modunda değişikliği 3 farklı formatta verebilirsiniz:<br /><br />
                    • <b>1. Video & Fotoğraf Ekleme:</b> Hata kayıtları, ekran görüntüleri veya test videolarını yükleyip QA incelemesi oluşturun.<br />
                    • <b>2. Prompt / Doğrudan Metin:</b> Test gereksinimlerini, kullanıcı hikayesini veya hata senaryosunu serbest metin olarak yazın.<br />
                    • <b>3. PDF / Dosya Yükleme:</b> PDF, Word (.docx), metin veya şartname dosyalarından doğrudan metin ayıklayın.<br /><br />
                  </>
                ) : (
                  <>
                    Değişikliği 3 farklı formatta verebilirsiniz:<br /><br />
                    • <b>1. Kod Karşılaştırma:</b> Eski ve yeni kodları yapıştırarak semantik diff analizi yapın.<br />
                    • <b>2. Prompt / Doğrudan Metin:</b> Değişiklik senaryosunu veya gereksinimleri serbest metin olarak yazın.<br />
                    • <b>3. PDF / Dosya Yükleme:</b> PDF, Word (.docx), metin veya kod dosyalarını sürükleyip bırakarak doğrudan metin ayıklayın.<br /><br />
                  </>
                )}
                💡 <i>Sistem girilen veriyi analiz ederek adım adım çalıştırılabilir Test Senaryoları üretir.</i>
              </Box>
            }
          >
            <IconButton size="small" sx={{ color: "#38bdf8", p: 0.5 }}>
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        <Typography variant="body2" sx={{ color: "#94a3b8", mb: 1.5 }}>
          {isQa ? (
            <>Değişiklik verilerini <b>video & fotoğraf</b>, <b>prompt / test senaryosu metni</b> veya <b>PDF / dosya</b> formatlarında sağlayın.</>
          ) : (
            <>Değişiklik verilerini <b>kod</b>, <b>prompt / senaryo metni</b> veya <b>PDF / dosya</b> formatlarında sağlayın.</>
          )}
        </Typography>

        {/* Çevrimdışı Mod Uyarısı */}
        {isOffline && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            ⚠️ <b>İnternet bağlantınız koptu!</b> Çevrimdışı moddasınız; girdiğiniz veriler yerel hafızada güvenle korunuyor.
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
          <Stack direction="row" alignItems="center" spacing={1.5}>
            {lastSaved ? (
              <span style={{ color: "#34d399", fontWeight: 600 }}>
                ✓ Son kayıt: {lastSaved}
              </span>
            ) : (
              <span style={{ opacity: 0.7 }}>Hazır</span>
            )}
            {draftRestored && onClearDraft && (
              <Tooltip title="Kaydedilen verileri sil ve formu temizle">
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  onClick={onClearDraft}
                  sx={{
                    textTransform: "none",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    px: 1,
                    py: 0.2,
                    minWidth: "auto",
                    borderColor: "rgba(255, 255, 255, 0.25)",
                    color: "#f87171",
                    "&:hover": {
                      borderColor: "#ef4444",
                      background: "rgba(239, 68, 68, 0.1)",
                    },
                  }}
                >
                  Kaydedilen Verileri Sil
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
                  background: isQa ? "rgba(6, 182, 212, 0.2)" : "rgba(99, 102, 241, 0.2)",
                  color: isQa ? "#38bdf8" : "#818cf8",
                },
              },
            }}
          >
            {isQa ? (
              <Tab label="🎥 Video & Fotoğraf Ekleme" />
            ) : (
              <Tab label="💻 Kod Karşılaştırma" />
            )}
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

        {/* Kategori Seçici ve Tür Yönetimi Butonu */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <TextField
            select
            fullWidth
            size="small"
            label={isQa ? "QA Test & İnceleme Türü" : "Değişiklik Türü / Platform"}
            value={category || "none"}
            onChange={(e) => setCategory(e.target.value)}
          >
            {currentCategories.map((cat) => {
              const canDelete = cat.value !== "none";
              return (
                <MenuItem
                  key={cat.value}
                  value={cat.value}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    py: 1,
                  }}
                >
                  <Box component="span" sx={{ fontWeight: 500, flex: 1, pr: 1, fontSize: "0.875rem" }}>
                    {cat.label}
                  </Box>
                  {canDelete && (
                    <Box
                      component="span"
                      role="button"
                      aria-label="Bu türü kaldır"
                      title="Bu türü kaldır"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleDeleteCategory(cat.value);
                      }}
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        p: 0.5,
                        borderRadius: "50%",
                        color: "#ef4444",
                        cursor: "pointer",
                        "&:hover": {
                          background: "rgba(239, 68, 68, 0.15)",
                        },
                      }}
                    >
                      <TrashIcon />
                    </Box>
                  )}
                </MenuItem>
              );
            })}
          </TextField>

          <Tooltip title={`Yeni tür ekle veya mevcut türleri yönet/çıkar`}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setNewCategoryName("");
                setOpenCategoryManageDialog(true);
              }}
              sx={{
                minWidth: "auto",
                px: 1.8,
                py: 0.85,
                whiteSpace: "nowrap",
                fontWeight: 700,
                fontSize: "0.82rem",
                textTransform: "none",
                borderColor: isQa ? "rgba(6, 182, 212, 0.4)" : "rgba(99, 102, 241, 0.4)",
                color: isQa ? "#38bdf8" : "#818cf8",
                "&:hover": {
                  borderColor: isQa ? "#06b6d4" : "#6366f1",
                  background: isQa ? "rgba(6, 182, 212, 0.08)" : "rgba(99, 102, 241, 0.08)",
                },
              }}
            >
              ⚙️ Türleri Yönet / Ekle
            </Button>
          </Tooltip>
        </Stack>

        {/* Tür Yönetimi & Ekleme / Çıkarma Dialogu */}
        <Dialog
          open={openCategoryManageDialog}
          onClose={() => setOpenCategoryManageDialog(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              background: "#0f172a",
              border: isQa ? "1px solid rgba(6, 182, 212, 0.3)" : "1px solid rgba(99, 102, 241, 0.3)",
              borderRadius: 3,
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, fontSize: "1.05rem", color: isQa ? "#38bdf8" : "#818cf8" }}>
            ⚙️ {isQa ? "QA Test & İnceleme Türleri Yönetimi" : "Değişiklik Türleri Yönetimi"}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: "#94a3b8", mb: 2 }}>
              {isQa
                ? "Test türlerini yönetebilir, istemediklerinizi çıkarabilir veya yeni özel QA test türleri ekleyebilirsiniz:"
                : "Geliştirici platform/değişiklik türlerini yönetebilir, istemediklerinizi çıkarabilir veya yeni türler ekleyebilirsiniz:"}
            </Typography>

            {/* Yeni Tür Ekleme Inputu */}
            <Stack direction="row" spacing={1} sx={{ mb: 2.5 }}>
              <TextField
                autoFocus
                fullWidth
                size="small"
                label="Yeni Tür Adı"
                placeholder={isQa ? "Örn: Sesli Komut & Mikrofon Doğrulaması" : "Örn: GraphQL API & Subscription"}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCategory();
                  }
                }}
              />
              <Button
                variant="contained"
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim()}
                sx={{
                  whiteSpace: "nowrap",
                  textTransform: "none",
                  fontWeight: 700,
                  px: 2.5,
                  background: isQa
                    ? "linear-gradient(90deg, #06b6d4, #6366f1)"
                    : "linear-gradient(90deg, #10b981, #06b6d4)",
                }}
              >
                ➕ Ekle
              </Button>
            </Stack>

            <Divider sx={{ my: 2, borderColor: "rgba(255, 255, 255, 0.08)" }} />

            {/* Mevcut Türleri Listeleme ve Çıkarma */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: "#cbd5e1", fontWeight: 700 }}>
                  Aktif Türler ({currentCategories.filter((c) => c.value !== "none").length}):
                </Typography>
                <Button
                  size="small"
                  onClick={handleResetCategoriesToDefault}
                  sx={{
                    textTransform: "none",
                    fontSize: "0.75rem",
                    color: "#94a3b8",
                    "&:hover": { color: "#38bdf8" },
                  }}
                >
                  🔄 Varsayılanlara Sıfırla
                </Button>
              </Stack>

              <Stack spacing={0.8} sx={{ maxHeight: 240, overflowY: "auto", pr: 0.5 }}>
                {currentCategories
                  .filter((c) => c.value !== "none")
                  .map((c) => (
                    <Box
                      key={c.value}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: 1.5,
                        px: 1.5,
                        py: 0.9,
                      }}
                    >
                      <Typography variant="body2" sx={{ color: "#f1f5f9", fontSize: "0.85rem", fontWeight: 500 }}>
                        {c.label}
                      </Typography>
                      <Tooltip title="Bu türü listeden çıkar">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteCategory(c.value)}
                          sx={{
                            color: "#ef4444",
                            p: 0.5,
                            "&:hover": { background: "rgba(239, 68, 68, 0.15)" },
                          }}
                        >
                          <TrashIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ))}
              </Stack>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button
              variant="outlined"
              onClick={() => setOpenCategoryManageDialog(false)}
              sx={{ color: "#94a3b8", borderColor: "rgba(255, 255, 255, 0.2)", textTransform: "none" }}
            >
              Kapat
            </Button>
          </DialogActions>
        </Dialog>

        {/* ======================= MOD 0: QA İSE VİDEO & FOTOĞRAF, DEVELOPER İSE KOD KARŞILAŞTIRMA ======================= */}
        {inputMode === 0 && isQa && (
          <Box>
            {/* QA Hazır Şablonları & Yeni Şablon Ekle Butonu */}
            <TemplateSelector
              templates={templates}
              defaultTemplatesCount={defaultTemplatesCount}
              onSelectTemplate={(tpl) => {
                onSelectTemplate(tpl);
                if (tpl.newCode) {
                  setMediaNotes(tpl.newCode);
                }
              }}
              onOpenModal={onOpenModal}
              onDeleteCustomTemplate={onDeleteCustomTemplate}
              isQa={true}
            />

            {/* Gizli Dosya Girişi (Video & Fotoğraf) */}
            <input
              type="file"
              ref={mediaInputRef}
              style={{ display: "none" }}
              multiple
              accept="image/*,video/*,.mp4,.webm,.ogg,.mov,.avi,.mkv,.png,.jpg,.jpeg,.gif,.webp"
              onChange={handleMediaUpload}
            />

            {/* Sürükle-Bırak / Tıkla-Yükle Alanı */}
            <Paper
              variant="outlined"
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  const pseudoEvent = {
                    target: { files: e.dataTransfer.files },
                  } as unknown as React.ChangeEvent<HTMLInputElement>;
                  handleMediaUpload(pseudoEvent);
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => mediaInputRef.current?.click()}
              sx={{
                p: 3,
                border: "2px dashed rgba(6, 182, 212, 0.45)",
                borderRadius: 2.5,
                textAlign: "center",
                cursor: "pointer",
                background: "rgba(6, 182, 212, 0.04)",
                transition: "all 0.2s ease-in-out",
                mb: 2,
                "&:hover": {
                  borderColor: "#06b6d4",
                  background: "rgba(6, 182, 212, 0.08)",
                },
              }}
            >
              <Box sx={{ color: "#06b6d4", mb: 1 }}>
                <UploadIcon />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#e2e8f0", mb: 0.5 }}>
                Test Videosu ve Ekran Görüntülerini (Fotoğraf) Buraya Yükleyin
              </Typography>
              <Typography variant="body2" sx={{ color: "#94a3b8", mb: 1 }}>
                Dosyaları sürükleyip bırakın veya seçmek için tıklayın
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                <Chip size="small" label="📷 PNG, JPG, WEBP, GIF Ekran Görüntüleri" sx={{ background: "rgba(6, 182, 212, 0.15)", color: "#67e8f9", fontSize: "0.75rem" }} />
                <Chip size="small" label="🎬 MP4, WEBM, MOV Test Kayıtları" sx={{ background: "rgba(99, 102, 241, 0.15)", color: "#a5b4fc", fontSize: "0.75rem" }} />
              </Stack>
            </Paper>

            {/* Yüklenen Medyaların Önizleme Listesi */}
            {mediaList.length > 0 && (
              <Box sx={{ mb: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ color: "#38bdf8", fontWeight: 700 }}>
                    📎 Eklenen Medyalar ({mediaList.length} dosya):
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      mediaList.forEach((m) => URL.revokeObjectURL(m.previewUrl));
                      setMediaList([]);
                      syncMediaContent([], mediaNotes);
                    }}
                    sx={{ textTransform: "none", fontSize: "0.74rem", py: 0.2 }}
                  >
                    Tümünü Temizle
                  </Button>
                </Stack>

                <Grid container spacing={1.5}>
                  {mediaList.map((m) => (
                    <Grid item xs={12} sm={6} key={m.id}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.2,
                          borderRadius: 2,
                          background: "rgba(15, 23, 42, 0.8)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          display: "flex",
                          gap: 1.5,
                          alignItems: "center",
                          position: "relative",
                        }}
                      >
                        {m.type === "image" ? (
                          <Box
                            component="img"
                            src={m.previewUrl}
                            alt={m.name}
                            sx={{
                              width: 58,
                              height: 58,
                              objectFit: "cover",
                              borderRadius: 1.5,
                              border: "1px solid rgba(6, 182, 212, 0.3)",
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 58,
                              height: 58,
                              borderRadius: 1.5,
                              background: "rgba(99, 102, 241, 0.2)",
                              border: "1px solid rgba(99, 102, 241, 0.4)",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <span style={{ fontSize: "1.4rem" }}>🎬</span>
                            <span style={{ fontSize: "0.6rem", color: "#a5b4fc", fontWeight: 700 }}>VIDEO</span>
                          </Box>
                        )}

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="subtitle2"
                            noWrap
                            sx={{ fontWeight: 700, fontSize: "0.82rem", color: "#f1f5f9" }}
                            title={m.name}
                          >
                            {m.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>
                            {m.type === "video" ? "Video Kaydı" : "Fotoğraf / Ekran"} • {m.sizeFormatted}
                          </Typography>
                        </Box>

                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveMedia(m.id)}
                          title="Medyayı kaldır"
                          sx={{ p: 0.5 }}
                        >
                          ✕
                        </IconButton>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* QA Test Notu / Açıklama Alanı */}
            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 600, display: "block", mb: 0.5 }}>
              📝 QA İnceleme Notu & Beklenen Davranış (İsteğe Bağlı):
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={hasResult ? 3 : 5}
              value={mediaNotes}
              onChange={(e) => handleMediaNotesChange(e.target.value)}
              placeholder="Örn: Butona tıklandığında ekte videoda görüldüğü gibi animasyon donuyor veya ekran görüntüsündeki hata mesajı kullanıcıyı yönlendirmiyor..."
              sx={{
                mb: 2,
                "& .MuiInputBase-root": {
                  fontSize: "0.85rem",
                  backgroundColor: "rgba(0,0,0,0.25)",
                },
              }}
            />
          </Box>
        )}

        {/* ======================= MOD 0: DEVELOPER İSE KOD KARŞILAŞTIRMA ======================= */}
        {inputMode === 0 && !isQa && (
          <Box>
            <TemplateSelector
              templates={templates}
              defaultTemplatesCount={defaultTemplatesCount}
              onSelectTemplate={onSelectTemplate}
              onOpenModal={onOpenModal}
              onDeleteCustomTemplate={onDeleteCustomTemplate}
              isQa={false}
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
              <Typography variant="caption" sx={{ color: isQa ? "#38bdf8" : "#94a3b8", fontWeight: 700, display: "block", mb: 1 }}>
                ⚡ {isQa ? "Hızlı QA Test Senaryoları (Tek Tıkla Yükle):" : "Hızlı Geliştirici Senaryoları (Tek Tıkla Yükle):"}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                {(isQa ? QA_QUICK_PROMPTS : DEV_QUICK_PROMPTS).map((qp, idx) => (
                  <Chip
                    key={idx}
                    label={qp.label}
                    size="small"
                    onClick={() => handleSelectQuickPrompt(qp)}
                    clickable
                    sx={{
                      fontSize: "0.76rem",
                      background: isQa ? "rgba(6, 182, 212, 0.15)" : "rgba(99, 102, 241, 0.15)",
                      border: isQa ? "1px solid rgba(6, 182, 212, 0.3)" : "1px solid rgba(99, 102, 241, 0.3)",
                      color: isQa ? "#67e8f9" : "#c7d2fe",
                      "&:hover": { background: isQa ? "rgba(6, 182, 212, 0.25)" : "rgba(99, 102, 241, 0.3)" },
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
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      const file = files[0];
                      setFileParsing(true);
                      parseDocument(file)
                        .then((res) => {
                          setParsedOldFileInfo(res);
                          setFileOldContent(res.text);
                          setPreviousContent(res.text);
                        })
                        .catch((err) => alert("Önceki dosya okunurken hata: " + err.message))
                        .finally(() => setFileParsing(false));
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => oldFileInputRef.current?.click()}
                  sx={{
                    p: 3,
                    border: "2px dashed rgba(56, 189, 248, 0.4)",
                    borderRadius: 2.5,
                    textAlign: "center",
                    cursor: "pointer",
                    background: "rgba(56, 189, 248, 0.04)",
                    transition: "all 0.2s",
                    "&:hover": {
                      borderColor: "#38bdf8",
                      background: "rgba(56, 189, 248, 0.08)",
                    },
                  }}
                >
                  {parsedOldFileInfo ? (
                    <Box>
                      <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.5} sx={{ mb: 1 }}>
                        <span style={{ fontSize: "1.8rem" }}>📑</span>
                        <Box sx={{ textAlign: "left" }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#38bdf8" }}>
                            {parsedOldFileInfo.fileName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                            {parsedOldFileInfo.fileType} • {parsedOldFileInfo.fileSizeFormatted} • {parsedOldFileInfo.lineCount} satır • {parsedOldFileInfo.charCount} karakter
                          </Typography>
                        </Box>
                      </Stack>
                      <Typography variant="caption" sx={{ color: "#38bdf8", display: "block" }}>
                        ✓ Önceki versiyon başarıyla yüklendi! Farklı dosya seçmek için tıklayın veya sürükleyin.
                      </Typography>
                    </Box>
                  ) : (
                    <Box>
                      <Box sx={{ color: "#38bdf8", mb: 1 }}>
                        <UploadIcon />
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#e2e8f0", mb: 0.5 }}>
                        1. Önceki Durum / Eski Versiyon Dosyasını Yükleyin
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                        Dosya seçmek için tıklayın veya sürükleyip bırakın (PDF, Word, TXT, MD, C#, TS, Py, SQL vb.)
                      </Typography>
                    </Box>
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
              value={fileContent}
              onChange={(e) => {
                setFileContent(e.target.value);
                setNewContent(e.target.value);
              }}
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

            {compareMode === "dual" && fileOldContent && (
              <DiffViewer oldCode={fileOldContent} newCode={fileContent} />
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
          onClick={() => {
            if (inputMode === 1) {
              handleSubmitFromPrompt();
            } else if (inputMode === 2) {
              setNewContent(fileContent);
              if (compareMode === "dual") {
                setPreviousContent(fileOldContent);
              }
              onSubmit({
                customNewContent: fileContent,
                customPreviousContent: compareMode === "dual" ? fileOldContent : previousContent,
              });
            } else {
              onSubmit();
            }
          }}
          disabled={
            loading ||
            (inputMode === 1
              ? !promptText.trim()
              : inputMode === 2
              ? !fileContent.trim()
              : isQa
              ? mediaList.length === 0 && !mediaNotes.trim() && !newContent.trim()
              : !newContent.trim())
          }
          sx={{
            py: 1.5,
            fontWeight: 700,
            background: isQa
              ? "linear-gradient(90deg, #06b6d4, #6366f1)"
              : "linear-gradient(90deg, #10b981, #0ea5e9)",
            textTransform: "none",
            fontSize: "0.95rem",
            boxShadow: isQa
              ? "0 4px 14px 0 rgba(6, 182, 212, 0.45)"
              : "0 4px 14px 0 rgba(16, 185, 129, 0.45)",
            "&:hover": {
              background: isQa
                ? "linear-gradient(90deg, #0891b2, #4f46e5)"
                : "linear-gradient(90deg, #059669, #0284c7)",
            },
            transition: "all 0.3s ease",
          }}
        >
          {loading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={22} color="inherit" />
              <span>{isQa ? "QA Senaryoları & E2E Test Adımları Oluşturuluyor..." : "Developer Unit & Kod Test Adımları Oluşturuluyor..."}</span>
            </Stack>
          ) : (
            `✨ ${isQa ? "QA Test Adımlarını Oluştur" : "Developer Test Adımlarını Oluştur"}`
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

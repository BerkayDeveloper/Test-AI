import React from "react";
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
} from "@mui/material";
import { TemplateSelector } from "./TemplateSelector";
import { DiffViewer } from "./DiffViewer";
import { TemplateItem } from "../types";

const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle" }}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

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
  return (
    <Card
      sx={{
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(16px)",
        height: "100%",
      }}
    >
      <CardContent>
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
                  📌 Bu Alanın Amacı Nedir?
                </Typography>
                Test adımlarını oluşturmak istediğiniz kodları veya yeni özellikleri sisteme girdiğiniz ana çalışma alanıdır.<br /><br />
                • <b>1. Alan (Önceki Durum):</b> Mevcut eski kodunuz. Sıfırdan yeni ekliyorsanız <u>boş bırakabilirsiniz</u>.<br />
                • <b>2. Alan (Yeni Durum):</b> Test edilmesini istediğiniz yeni veya değiştirilmiş kod (Zorunlu).<br /><br />
                💡 <i>Sistem doğrudan bu kodun sınıflarına, fonksiyonlarına ve iş mantığına özel adım adım çalıştırılabilir Test Senaryoları üretir.</i>
              </Box>
            }
          >
            <IconButton size="small" sx={{ color: "#38bdf8", p: 0.5 }}>
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        <Typography variant="body2" sx={{ color: "#94a3b8", mb: 2 }}>
          Değişikliği girin. Sistem kodun sınıflarına ve işlevlerine özel <b>çalıştırılabilir Test Adımlarını</b> oluşturur.
        </Typography>

        {/* Çevrimdışı Mod Uyarısı */}
        {isOffline && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            ⚠️ <b>İnternet bağlantınız koptu!</b> Çevrimdışı moddasınız; girdiğiniz kodlar ve değişiklikler yerel hafızada güvenle korunuyor.
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
            💾 <b>Kurtarılan Taslak Yüklendi:</b> Beklenmedik kapanma veya kesinti öncesi girdiğiniz veriler otomatik geri yüklendi.
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

        <TemplateSelector
          templates={templates}
          defaultTemplatesCount={defaultTemplatesCount}
          onSelectTemplate={onSelectTemplate}
          onOpenModal={onOpenModal}
          onDeleteCustomTemplate={onDeleteCustomTemplate}
        />

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
          <MenuItem value="none">None</MenuItem>
          <MenuItem value="game">🎮 Oyun Geliştirme (Unity / Unreal / C# / C++)</MenuItem>
          <MenuItem value="mobile">📱 Mobil Uygulama (Android / iOS / Flutter)</MenuItem>
          <MenuItem value="code">💻 Genel Kaynak Kod (Python / Java / Go / Rust)</MenuItem>
          <MenuItem value="api">🌐 API & Entegrasyon Sözleşmesi</MenuItem>
          <MenuItem value="database">🗄️ Veritabanı / SQL Migrasyonu</MenuItem>
          <MenuItem value="security">🔒 Güvenlik & Yetkilendirme</MenuItem>
        </TextField>

        <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 600, display: "block", mb: 0.5 }}>
          1. Önceki Durum (Orijinal Kod / Veri) — <span style={{ color: "#06b6d4" }}>(Yeni özellik eklerken boş bırakılabilir)</span>
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={hasResult ? 4 : 7}
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
          rows={hasResult ? 5 : 8}
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

        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMsg}
          </Alert>
        )}

        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={onSubmit}
          disabled={loading}
          sx={{
            py: 1.5,
            fontWeight: 700,
            background: "linear-gradient(90deg, #6366f1, #06b6d4)",
            textTransform: "none",
            fontSize: "0.95rem",
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "✨ Test Adımlarını Oluştur"}
        </Button>
      </CardContent>
    </Card>
  );
};

import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Box,
  Button,
  TextField,
  MenuItem,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Chip,
  Divider,
} from "@mui/material";
import { TestPlanResult, TestCase } from "../types";
import { api } from "../services/api";

interface TestEditViewProps {
  plan: TestPlanResult;
  onBack: () => void;
  onSaveSuccess: (updatedPlan: TestPlanResult) => void;
  onGoToExecute: (updatedPlan: TestPlanResult) => void;
}

export const TestEditView: React.FC<TestEditViewProps> = ({
  plan,
  onBack,
  onSaveSuccess,
  onGoToExecute,
}) => {
  const [title, setTitle] = useState(plan.title);
  const [category, setCategory] = useState(plan.category);
  const [overview, setOverview] = useState(plan.overview);
  const [testCases, setTestCases] = useState<TestCase[]>(() => {
    return JSON.parse(JSON.stringify(plan.testCases || []));
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Test Senaryosu Alanı Güncelleme
  const handleUpdateTestCase = (index: number, field: keyof TestCase, value: any) => {
    setTestCases((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Belirli bir testin adımını güncelleme
  const handleUpdateStep = (tcIndex: number, stepIndex: number, value: string) => {
    setTestCases((prev) => {
      const updated = [...prev];
      const newSteps = [...updated[tcIndex].steps];
      newSteps[stepIndex] = value;
      updated[tcIndex] = { ...updated[tcIndex], steps: newSteps };
      return updated;
    });
  };

  // Yeni Adım Ekleme
  const handleAddStep = (tcIndex: number) => {
    setTestCases((prev) => {
      const updated = [...prev];
      const newSteps = [...updated[tcIndex].steps, `Adım ${updated[tcIndex].steps.length + 1}: `];
      updated[tcIndex] = { ...updated[tcIndex], steps: newSteps };
      return updated;
    });
  };

  // Adım Silme
  const handleRemoveStep = (tcIndex: number, stepIndex: number) => {
    setTestCases((prev) => {
      const updated = [...prev];
      const newSteps = updated[tcIndex].steps.filter((_, i) => i !== stepIndex);
      updated[tcIndex] = { ...updated[tcIndex], steps: newSteps };
      return updated;
    });
  };

  // Yeni Test Senaryosu Ekleme
  const handleAddNewTestCase = () => {
    const nextNum = testCases.length + 1;
    const newCase: TestCase = {
      id: `TC-${String(nextNum).padStart(3, "0")}`,
      title: "Yeni Test Senaryosu",
      type: "Fonksiyonel Test",
      priority: "P2 (Yüksek)",
      preconditions: "Sistem ve test verileri hazır olmalı.",
      steps: ["Adım 1: Test işlemini standart parametrelerle başlatın.", "Adım 2: Çıktıyı doğrulayın."],
      expectedResult: "İşlem hatasız tamamlanmalıdır.",
    };
    setTestCases((prev) => [...prev, newCase]);
  };

  // Test Senaryosu Silme
  const handleRemoveTestCase = (index: number) => {
    setTestCases((prev) => prev.filter((_, i) => i !== index));
  };

  // Kaydetme İşlemi
  const handleSave = async (shouldNavigateToExecute = false) => {
    if (!title.trim()) {
      setErrorMsg("Lütfen plan başlığını boş bırakmayın.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const updated = await api.updateAnalysis(plan.id, {
        title,
        category,
        diffSummary: overview,
        testCases,
      });

      const fullPlan: TestPlanResult = {
        ...plan,
        ...updated,
        title,
        category,
        overview,
        testCases,
        totalTestCount: testCases.length,
        criticalTestCount: testCases.filter((t) => t.priority.includes("P1") || t.priority.includes("P2")).length,
      };

      setSuccessMsg("✓ Test planı başarıyla kaydedildi.");
      onSaveSuccess(fullPlan);

      if (shouldNavigateToExecute) {
        onGoToExecute(fullPlan);
      } else {
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Kaydedilirken hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {/* Üst Navigasyon */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Button
          variant="outlined"
          onClick={onBack}
          sx={{
            color: "#94a3b8",
            borderColor: "rgba(255, 255, 255, 0.15)",
            textTransform: "none",
            fontWeight: 700,
            "&:hover": { borderColor: "#38bdf8", color: "#38bdf8" },
          }}
        >
          ← İptal ve Geri Dön
        </Button>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleSave(false)}
            disabled={saving}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              background: "linear-gradient(90deg, #6366f1, #06b6d4)",
            }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : "💾 Değişiklikleri Kaydet"}
          </Button>

          <Button
            variant="contained"
            onClick={() => handleSave(true)}
            disabled={saving}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              background: "linear-gradient(90deg, #10b981, #06b6d4)",
            }}
          >
            🚀 Kaydet ve Test Etmeye Başla
          </Button>
        </Stack>
      </Stack>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMsg}
        </Alert>
      )}

      {/* Plan Genel Bilgileri Kartı */}
      <Card sx={{ mb: 3, border: "1px solid rgba(255, 255, 255, 0.1)", backdropFilter: "blur(16px)" }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: "#f8fafc" }}>
            ✏️ Test Planı Genel Bilgilerini Düzenle
          </Typography>

          <Stack spacing={2}>
            <TextField
              fullWidth
              size="small"
              label="Test Planı Başlığı"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <TextField
              select
              fullWidth
              size="small"
              label="Kategori / Platform"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <MenuItem value="none">Seçilmedi</MenuItem>
              <MenuItem value="game">🎮 Oyun Geliştirme (Unity / Unreal)</MenuItem>
              <MenuItem value="mobile">📱 Mobil Uygulama</MenuItem>
              <MenuItem value="code">💻 Genel Kaynak Kod</MenuItem>
              <MenuItem value="api">🌐 API & Entegrasyon</MenuItem>
              <MenuItem value="database">🗄️ Veritabanı / SQL</MenuItem>
              <MenuItem value="security">🔒 Güvenlik & Yetkilendirme</MenuItem>
            </TextField>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Analiz ve Değişiklik Özeti"
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Test Senaryoları Başlığı ve Yeni Ekle Butonu */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          📋 Test Senaryolarını Düzenle ({testCases.length})
        </Typography>

        <Button
          variant="outlined"
          color="secondary"
          size="small"
          onClick={handleAddNewTestCase}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            borderColor: "rgba(6, 182, 212, 0.4)",
            "&:hover": { borderColor: "#06b6d4" },
          }}
        >
          ➕ Yeni Test Senaryosu Ekle
        </Button>
      </Stack>

      {/* Senaryo Kartları */}
      <Stack spacing={2.5}>
        {testCases.map((tc, index) => (
          <Paper
            key={index}
            sx={{
              p: 2.5,
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 2,
            }}
          >
            {/* Kart Üst Başlık ve Sil Butonu */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Chip
                  label={tc.id || `TC-${index + 1}`}
                  size="small"
                  sx={{ fontWeight: 800, backgroundColor: "rgba(99, 102, 241, 0.2)", color: "#818cf8" }}
                />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#e2e8f0" }}>
                  Senaryo #{index + 1}
                </Typography>
              </Stack>

              <Tooltip title="Bu senaryoyu tamamen sil">
                <Button
                  size="small"
                  color="error"
                  onClick={() => handleRemoveTestCase(index)}
                  sx={{ textTransform: "none", fontSize: "0.78rem" }}
                >
                  🗑️ Senaryoyu Kaldır
                </Button>
              </Tooltip>
            </Stack>

            <Stack spacing={1.5}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField
                  fullWidth
                  size="small"
                  label="Senaryo Başlığı"
                  value={tc.title}
                  onChange={(e) => handleUpdateTestCase(index, "title", e.target.value)}
                />
                <TextField
                  select
                  size="small"
                  label="Öncelik"
                  value={tc.priority}
                  onChange={(e) => handleUpdateTestCase(index, "priority", e.target.value)}
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="P1 (Kritik)">P1 (Kritik)</MenuItem>
                  <MenuItem value="P2 (Yüksek)">P2 (Yüksek)</MenuItem>
                  <MenuItem value="P3 (Orta)">P3 (Orta)</MenuItem>
                </TextField>
                <TextField
                  size="small"
                  label="Test Türü"
                  value={tc.type}
                  onChange={(e) => handleUpdateTestCase(index, "type", e.target.value)}
                  sx={{ minWidth: 160 }}
                />
              </Stack>

              <TextField
                fullWidth
                size="small"
                label="Ön Koşul (Preconditions)"
                value={tc.preconditions}
                onChange={(e) => handleUpdateTestCase(index, "preconditions", e.target.value)}
              />

              {/* Adımlar Listesi */}
              <Box sx={{ p: 1.5, background: "rgba(0, 0, 0, 0.2)", borderRadius: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ color: "#38bdf8", fontWeight: 700 }}>
                    Test Adımları:
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => handleAddStep(index)}
                    sx={{ textTransform: "none", fontSize: "0.74rem", color: "#38bdf8" }}
                  >
                    + Adım Ekle
                  </Button>
                </Stack>

                <Stack spacing={1}>
                  {tc.steps.map((step, sIdx) => (
                    <Stack key={sIdx} direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" sx={{ color: "#94a3b8", minWidth: 20 }}>
                        {sIdx + 1}.
                      </Typography>
                      <TextField
                        fullWidth
                        size="small"
                        value={step}
                        onChange={(e) => handleUpdateStep(index, sIdx, e.target.value)}
                        sx={{
                          "& .MuiInputBase-input": { fontSize: "0.82rem", py: 0.8 },
                        }}
                      />
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveStep(index, sIdx)}
                        disabled={tc.steps.length <= 1}
                        sx={{ p: 0.5 }}
                      >
                        ✕
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              </Box>

              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                label="Beklenen Sonuç (Expected Result)"
                value={tc.expectedResult}
                onChange={(e) => handleUpdateTestCase(index, "expectedResult", e.target.value)}
              />
            </Stack>
          </Paper>
        ))}
      </Stack>

      {/* Alt Aksiyon Butonları */}
      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3, mb: 5 }}>
        <Button
          variant="outlined"
          onClick={onBack}
          sx={{ textTransform: "none", color: "#94a3b8", borderColor: "rgba(255,255,255,0.15)" }}
        >
          İptal
        </Button>
        <Button
          variant="contained"
          onClick={() => handleSave(false)}
          disabled={saving}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            background: "linear-gradient(90deg, #6366f1, #06b6d4)",
          }}
        >
          {saving ? <CircularProgress size={20} color="inherit" /> : "💾 Değişiklikleri Kaydet"}
        </Button>
      </Stack>
    </Box>
  );
};


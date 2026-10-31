import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Paper,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Alert,
  IconButton,
  Tooltip,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { AnalysisHistoryItem, TestPlanResult } from "../types";
import { cleanTitle } from "../utils/titleCleaner";

interface HistoryArchiveProps {
  history: AnalysisHistoryItem[];
  onInspectPlan: (plan: TestPlanResult) => void;
  onEditPlan: (plan: TestPlanResult) => void;
  onExecutePlan: (plan: TestPlanResult) => void;
  onDeletePlan: (id: string) => void;
  loading: boolean;
}

export const HistoryArchive: React.FC<HistoryArchiveProps> = ({
  history = [],
  onInspectPlan,
  onEditPlan,
  onExecutePlan,
  onDeletePlan,
  loading,
}) => {
  const [search, setSearch] = useState("");
  // Silme Onay Modalı State'i (Silinmek istenen planın id ve title'ı)
  const [planToDelete, setPlanToDelete] = useState<{ id: string; title: string } | null>(null);

  const safeHistory = Array.isArray(history) ? history : [];

  const filteredHistory = safeHistory.filter((h) => {
    const q = search.toLowerCase();
    const title = (h.title || "").toLowerCase();
    const cat = (h.category || "").toLowerCase();
    const summary = (h.diffSummary || "").toLowerCase();
    return title.includes(q) || cat.includes(q) || summary.includes(q);
  });

  const getPriorityColor = (risk: string = "") => {
    const r = risk.toLowerCase();
    if (r === "critical" || r.includes("kritik") || r.includes("p1")) return "#ef4444";
    if (r === "high" || r.includes("yüksek") || r.includes("p2")) return "#f97316";
    if (r === "medium" || r.includes("orta") || r.includes("normal") || r.includes("p3")) return "#f59e0b";
    return "#10b981";
  };

  const convertToTestPlanResult = (item: AnalysisHistoryItem): TestPlanResult => {
    const rawCases = Array.isArray(item.testCases) ? item.testCases : [];
    const cases = rawCases.map((tc) => ({
      ...tc,
      title: cleanTitle(tc.title),
    }));
    return {
      id: item.id,
      title: item.title || "İsimsiz Test Planı",
      category: item.category || "code",
      overview: item.diffSummary || "",
      totalTestCount: item.totalTestCount || cases.length,
      criticalTestCount: cases.filter(
        (t) => t?.priority?.includes("Kritik") || t?.priority?.includes("Yüksek") || t?.priority?.includes("P1") || t?.priority?.includes("P2")
      ).length,
      testCases: cases,
      createdAt: item.createdAt || new Date().toISOString(),
      previousContent: item.previousContent || "",
      newContent: item.newContent || "",
    };
  };

  // Onaylandığında silme işlemini gerçekleştir
  const handleConfirmDelete = () => {
    if (planToDelete) {
      onDeletePlan(planToDelete.id);
      setPlanToDelete(null);
    }
  };

  return (
    <Card sx={{ border: "1px solid rgba(255, 255, 255, 0.1)", backdropFilter: "blur(16px)" }}>
      <CardContent>
        {/* Üst Başlık ve Arama */}
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <div>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              🗂️ Önceden Üretilen Test Planları
            </Typography>
            <Typography variant="body2" sx={{ color: "#94a3b8" }}>
              Kayıtlı test planlarını inceleyebilir, adımlarını düzenleyebilir ve canlı test koşumunu başlatabilirsiniz.
            </Typography>
          </div>

          <TextField
            size="small"
            placeholder="Planlarda ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start">🔎</InputAdornment>,
            }}
            sx={{ width: { xs: "100%", sm: 260 } }}
          />
        </Stack>

        {filteredHistory.length === 0 ? (
          <Alert severity="info" sx={{ background: "rgba(14, 165, 233, 0.1)", color: "#7dd3fc" }}>
            {safeHistory.length === 0
              ? "Henüz kaydedilmiş bir test planı bulunmuyor. Yeni bir analiz başlattığınızda burada listelenecektir."
              : "Arama kriterinize uygun test planı bulunamadı."}
          </Alert>
        ) : (
          <Stack spacing={2}>
            {filteredHistory.map((item) => {
              const cases = Array.isArray(item.testCases) ? item.testCases : [];
              const testCount = item.totalTestCount || cases.length || 0;
              const formattedDate = item.createdAt ? new Date(item.createdAt).toLocaleString("tr-TR") : "Bilinmiyor";
              const planResult = convertToTestPlanResult(item);

              return (
                <Paper
                  key={item.id}
                  sx={{
                    p: 2.5,
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2,
                    transition: "all 0.2s",
                    "&:hover": {
                      borderColor: "rgba(99, 102, 241, 0.4)",
                      background: "rgba(30, 41, 59, 0.6)",
                    },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 280 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#f8fafc" }}>
                        {item.title}
                      </Typography>
                      <Chip
                        size="small"
                        label={(item.category || "GENEL").toUpperCase()}
                        sx={{ backgroundColor: "rgba(255,255,255,0.08)", fontSize: "0.72rem" }}
                      />
                    </Stack>

                    <Typography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>
                      Tarih: {formattedDate} • Toplam Test: {testCount}
                    </Typography>

                    {item.diffSummary && (
                      <Typography variant="body2" sx={{ color: "#cbd5e1", mt: 1, fontSize: "0.86rem" }}>
                        {item.diffSummary}
                      </Typography>
                    )}
                  </Box>

                  {/* 3 Buton + Silme Butonu */}
                  <Stack direction="row" spacing={1.2} alignItems="center" flexWrap="wrap">
                    <Chip
                      label={`Önem: ${item.riskLevel || "NORMAL"}`}
                      sx={{
                        backgroundColor: `${getPriorityColor(item.riskLevel)}22`,
                        color: getPriorityColor(item.riskLevel),
                        border: `1px solid ${getPriorityColor(item.riskLevel)}`,
                        fontWeight: 700,
                        mr: 0.5,
                      }}
                    />

                    {/* 1. Buton: İncele */}
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => onInspectPlan(planResult)}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        color: "#93c5fd",
                        borderColor: "rgba(147, 197, 253, 0.3)",
                        "&:hover": { borderColor: "#60a5fa", background: "rgba(96, 165, 250, 0.1)" },
                      }}
                    >
                      🔍 İncele
                    </Button>

                    {/* 2. Buton: Düzenle */}
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => onEditPlan(planResult)}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        color: "#06b6d4",
                        borderColor: "rgba(6, 182, 212, 0.4)",
                        "&:hover": { borderColor: "#06b6d4", background: "rgba(6, 182, 212, 0.1)" },
                      }}
                    >
                      ✏️ Düzenle
                    </Button>

                    {/* 3. Buton: Test Etmeye Başla */}
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => onExecutePlan(planResult)}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        background: "linear-gradient(90deg, #10b981, #06b6d4)",
                        boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                        "&:hover": { background: "linear-gradient(90deg, #059669, #0891b2)" },
                      }}
                    >
                      🚀 Test Etmeye Başla
                    </Button>

                    {/* Sil Butonu: Tıklandığında Özel Onay Modalı Açılır */}
                    <Tooltip title="Bu test planını sil">
                      <IconButton
                        size="small"
                        onClick={() => setPlanToDelete({ id: item.id, title: item.title })}
                        disabled={loading}
                        sx={{ color: "#ef4444", "&:hover": { backgroundColor: "rgba(239, 68, 68, 0.1)" } }}
                      >
                        🗑️
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}

        {/* ============================================================== */}
        {/* SİLME ONAY UYARI MODALI (Ekran üzerinde açılan modern dialog)  */}
        {/* ============================================================== */}
        <Dialog
          open={!!planToDelete}
          onClose={() => setPlanToDelete(null)}
          PaperProps={{
            sx: {
              background: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              backdropFilter: "blur(20px)",
              borderRadius: 3,
              p: 1,
              maxWidth: 460,
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: "#f87171", display: "flex", alignItems: "center", gap: 1 }}>
            <span style={{ fontSize: "1.4rem" }}>⚠️</span> Test Planını Silmek İstiyor Musunuz?
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: "#cbd5e1", fontSize: "0.92rem", lineHeight: 1.6 }}>
              <b style={{ color: "#f8fafc" }}>"{planToDelete?.title}"</b> başlıklı test planı ve oluşturulmuş olan tüm test adımları kalıcı olarak silinecektir.
              <br /><br />
              <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                Bu işlem geri alınamaz. Silme işlemini onaylıyor musunuz?
              </span>
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0, gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => setPlanToDelete(null)}
              sx={{
                textTransform: "none",
                color: "#94a3b8",
                borderColor: "rgba(255, 255, 255, 0.15)",
                "&:hover": { borderColor: "#cbd5e1", color: "#f1f5f9" },
              }}
            >
              Vazgeç
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleConfirmDelete}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                background: "linear-gradient(90deg, #ef4444, #dc2626)",
                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)",
              }}
            >
              🗑️ Evet, Test Planını Sil
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

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
} from "@mui/material";
import { AnalysisHistoryItem, TestPlanResult } from "../types";

interface HistoryArchiveProps {
  history: AnalysisHistoryItem[];
  onLoadPlan: (plan: TestPlanResult) => void;
  onDeletePlan: (id: string) => void;
  loading: boolean;
}

export const HistoryArchive: React.FC<HistoryArchiveProps> = ({
  history,
  onLoadPlan,
  onDeletePlan,
  loading,
}) => {
  const [search, setSearch] = useState("");

  const filteredHistory = history.filter(
    (h) =>
      h.title.toLowerCase().includes(search.toLowerCase()) ||
      h.category.toLowerCase().includes(search.toLowerCase()) ||
      h.diffSummary.toLowerCase().includes(search.toLowerCase())
  );

  const getPriorityColor = (risk: string) => {
    if (risk === "CRITICAL" || risk.includes("P1")) return "#ef4444";
    if (risk === "HIGH" || risk.includes("P2")) return "#f97316";
    if (risk === "MEDIUM" || risk.includes("P3")) return "#f59e0b";
    return "#10b981";
  };

  const handleSelect = (item: AnalysisHistoryItem) => {
    const plan: TestPlanResult = {
      id: item.id,
      title: item.title,
      category: item.category,
      overview: item.diffSummary,
      totalTestCount: item.totalTestCount || item.testCases.length,
      criticalTestCount: item.testCases.filter(
        (t) => t.priority.includes("P1") || t.priority.includes("P2")
      ).length,
      testCases: item.testCases,
      createdAt: item.createdAt,
      previousContent: item.previousContent,
      newContent: item.newContent,
    };
    onLoadPlan(plan);
  };

  return (
    <Card sx={{ border: "1px solid rgba(255, 255, 255, 0.1)", backdropFilter: "blur(16px)" }}>
      <CardContent>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <div>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              🗂️ Önceden Üretilen Test Planları Arşivi
            </Typography>
            <Typography variant="body2" sx={{ color: "#94a3b8" }}>
              Veritabanında kayıtlı analizleri inceleyebilir, çalışma alanınıza yükleyebilir veya silebilirsiniz.
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
            {history.length === 0
              ? "Henüz kaydedilmiş bir test planı bulunmuyor. Yeni bir analiz başlattığınızda burada listelenecektir."
              : "Arama kriterinize uygun test planı bulunamadı."}
          </Alert>
        ) : (
          <Stack spacing={2}>
            {filteredHistory.map((item) => (
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
                      label={item.category.toUpperCase()}
                      sx={{ backgroundColor: "rgba(255,255,255,0.08)", fontSize: "0.72rem" }}
                    />
                  </Stack>

                  <Typography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>
                    Tarih: {new Date(item.createdAt).toLocaleString("tr-TR")} • Toplam Test: {item.totalTestCount || item.testCases?.length || 0}
                  </Typography>

                  <Typography variant="body2" sx={{ color: "#cbd5e1", mt: 1, fontSize: "0.86rem" }}>
                    {item.diffSummary}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Chip
                    label={`Önem: ${item.riskLevel}`}
                    sx={{
                      backgroundColor: `${getPriorityColor(item.riskLevel)}22`,
                      color: getPriorityColor(item.riskLevel),
                      border: `1px solid ${getPriorityColor(item.riskLevel)}`,
                      fontWeight: 700,
                    }}
                  />

                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleSelect(item)}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      background: "linear-gradient(90deg, #6366f1, #06b6d4)",
                    }}
                  >
                    📂 İncele & Yükle
                  </Button>

                  <Tooltip title="Bu test planını arşivden sil">
                    <IconButton
                      size="small"
                      onClick={() => onDeletePlan(item.id)}
                      disabled={loading}
                      sx={{ color: "#ef4444", "&:hover": { backgroundColor: "rgba(239, 68, 68, 0.1)" } }}
                    >
                      🗑️
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  Paper,
} from "@mui/material";
import { TestPlanResult } from "../types";
import {
  generatePlaywrightCode,
  generateCypressCode,
  generateJestCode,
  generatePostmanCollection,
} from "../utils/automationCodeGenerator";

interface ExportAutomationModalProps {
  open: boolean;
  onClose: () => void;
  plan: TestPlanResult | null;
}

export const ExportAutomationModal: React.FC<ExportAutomationModalProps> = ({
  open,
  onClose,
  plan,
}) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!plan) return null;

  const getCode = () => {
    switch (tabIndex) {
      case 0:
        return { code: generatePlaywrightCode(plan), ext: "spec.ts", type: "Playwright E2E" };
      case 1:
        return { code: generateCypressCode(plan), ext: "cy.ts", type: "Cypress E2E" };
      case 2:
        return { code: generateJestCode(plan), ext: "test.ts", type: "Jest / Vitest" };
      case 3:
        return { code: generatePostmanCollection(plan), ext: "postman_collection.json", type: "Postman Collection v2.1" };
      default:
        return { code: "", ext: "txt", type: "Text" };
    }
  };

  const current = getCode();

  const handleCopy = () => {
    navigator.clipboard.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const filename = `${plan.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${current.ext}`;
    const blob = new Blob([current.code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ background: "rgba(15, 23, 42, 0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#f8fafc" }}>
              ⚡ Test Otomasyon Kodu Üretici
            </Typography>
            <Typography variant="caption" sx={{ color: "#94a3b8" }}>
              Test senaryolarını popüler test çerçevelerine (Playwright, Cypress, Jest, Postman) tek tıkla aktarın.
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: "rgba(255,255,255,0.08)", background: "#0b1120" }}>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => {
            setTabIndex(v);
            setCopied(false);
          }}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="🎭 Playwright (.spec.ts)" sx={{ textTransform: "none", fontWeight: 600 }} />
          <Tab label="🌲 Cypress (.cy.ts)" sx={{ textTransform: "none", fontWeight: 600 }} />
          <Tab label="🃏 Jest / Vitest (.test.ts)" sx={{ textTransform: "none", fontWeight: 600 }} />
          <Tab label="📮 Postman Collection (.json)" sx={{ textTransform: "none", fontWeight: 600 }} />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 2, background: "#060913" }}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            background: "#0a0f1d",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 2,
            maxHeight: "440px",
            overflow: "auto",
            fontFamily: "monospace",
            fontSize: "0.85rem",
            color: "#e2e8f0",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {current.code}
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 2, background: "rgba(15, 23, 42, 0.95)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <Button onClick={onClose} sx={{ color: "#94a3b8", textTransform: "none" }}>
          Kapat
        </Button>
        <Button
          variant="outlined"
          onClick={handleCopy}
          sx={{
            borderColor: "rgba(99, 102, 241, 0.5)",
            color: "#a5b4fc",
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          {copied ? "✓ Kopyalandı!" : "📋 Kodu Kopyala"}
        </Button>
        <Button
          variant="contained"
          onClick={handleDownload}
          sx={{
            background: "linear-gradient(90deg, #6366f1, #06b6d4)",
            textTransform: "none",
            fontWeight: 700,
          }}
        >
          📥 Dosyayı İndir (.{current.ext})
        </Button>
      </DialogActions>
    </Dialog>
  );
};


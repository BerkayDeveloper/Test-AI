import { useState, useEffect, useRef, useCallback } from "react";

export interface DraftData {
  title: string;
  category: string;
  previousContent: string;
  newContent: string;
  savedAt?: string;
}

const DRAFT_STORAGE_KEY = "active_draft_change_analysis_v1";

interface UseAutoSaveDraftOptions {
  onManualSave?: (timestamp: string) => void;
  onAutoSave?: (timestamp: string) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

export function useAutoSaveDraft(
  currentData: DraftData,
  options?: UseAutoSaveDraftOptions
) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  // Reference to always have latest data in event listeners
  const dataRef = useRef<DraftData>(currentData);
  dataRef.current = currentData;

  const saveToStorage = useCallback(
    (data: DraftData, isManual = false) => {
      const hasContent =
        Boolean(data.title.trim()) ||
        Boolean(data.previousContent.trim()) ||
        Boolean(data.newContent.trim());

      if (!hasContent) {
        return false;
      }

      const timestamp = new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const payload: DraftData = {
        ...data,
        savedAt: timestamp,
      };

      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
        setLastSaved(timestamp);
        if (isManual) {
          options?.onManualSave?.(timestamp);
        } else {
          options?.onAutoSave?.(timestamp);
        }
        return true;
      } catch (err) {
        console.error("Taslak kaydedilirken hata oluştu:", err);
        return false;
      }
    },
    [options]
  );

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setLastSaved(null);
      setDraftRestored(false);
    } catch (err) {
      console.error("Taslak silinirken hata:", err);
    }
  }, []);

  // 1. Initial Load: Check for saved draft on mount
  const getInitialDraft = useCallback((): DraftData | null => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return null;
      const parsed: DraftData = JSON.parse(raw);
      const hasContent =
        Boolean(parsed.title?.trim()) ||
        Boolean(parsed.previousContent?.trim()) ||
        Boolean(parsed.newContent?.trim());

      if (hasContent) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // 2. Keyboard shortcut: Ctrl + S / Cmd + S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        saveToStorage(dataRef.current, true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveToStorage]);

  // 3. Tab close, refresh, visibility change protection
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveToStorage(dataRef.current, false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveToStorage(dataRef.current, false);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [saveToStorage]);

  // 4. Online / Offline network listeners
  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      // Immediately protect data when network drops
      saveToStorage(dataRef.current, false);
      options?.onOffline?.();
    };

    const handleOnline = () => {
      setIsOffline(false);
      options?.onOnline?.();
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [saveToStorage, options]);

  // 5. Debounced auto-save when user types
  useEffect(() => {
    const hasContent =
      Boolean(currentData.title.trim()) ||
      Boolean(currentData.previousContent.trim()) ||
      Boolean(currentData.newContent.trim());

    if (!hasContent) return;

    const timer = setTimeout(() => {
      saveToStorage(currentData, false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [
    currentData.title,
    currentData.category,
    currentData.previousContent,
    currentData.newContent,
    saveToStorage,
  ]);

  return {
    isOffline,
    lastSaved,
    draftRestored,
    setDraftRestored,
    saveDraft: () => saveToStorage(dataRef.current, true),
    clearDraft,
    getInitialDraft,
  };
}

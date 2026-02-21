"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AUTO_SAVE_INTERVAL_MS } from "@/lib/constants";

interface UseAutoSaveOptions {
  documentId: string;
  content: string;
  enabled?: boolean;
}

export function useAutoSave({ documentId, content, enabled = true }: UseAutoSaveOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const lastSavedContentRef = useRef(content);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track content changes
  useEffect(() => {
    if (content !== lastSavedContentRef.current) {
      setIsDirty(true);
    }
  }, [content]);

  const save = useCallback(async () => {
    if (!isDirty || isSaving) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        lastSavedContentRef.current = content;
        setLastSavedAt(new Date());
        setIsDirty(false);
        setErrorCount(0);
      } else {
        setErrorCount((c) => c + 1);
      }
    } catch {
      setErrorCount((c) => c + 1);
    } finally {
      setIsSaving(false);
    }
  }, [documentId, content, isDirty, isSaving]);

  // Auto-save timer
  useEffect(() => {
    if (!enabled || !isDirty) return;

    timerRef.current = setTimeout(save, AUTO_SAVE_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, isDirty, save]);

  return { isSaving, isDirty, lastSavedAt, errorCount, save };
}

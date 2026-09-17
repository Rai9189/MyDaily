import { useEffect, useState } from 'react';

export function useAutoSave(content: string, onSave: () => Promise<void>) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState(content);

  useEffect(() => {
    if (content === lastSavedContent) return;

    const timeoutId = setTimeout(async () => {
      setIsSaving(true);
      try {
        await onSave();
        setLastSavedContent(content);
      } finally {
        setIsSaving(false);
      }
    }, 2000); // Save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [content, lastSavedContent, onSave]);

  return { isSaving, hasUnsavedChanges: content !== lastSavedContent };
}

import { useEffect, useRef, useState } from 'react';
import { onChange } from './github';

const STORAGE_PREFIX = 'hundeapp.';

export function useLiveReload(reload: () => void) {
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    const fire = () => reloadRef.current();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith(STORAGE_PREFIX)) fire();
    };
    const unsubscribe = onChange(fire);
    window.addEventListener('storage', onStorage);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', onStorage);
    };
  }, []);
}

// Gemeinsame Speichern-Logik für Formulare: saving-/error-State und der
// try/catch um den Save-Aufruf sind in allen CRUD-Modals identisch.
export function useFormSave(save: () => Promise<void>, onSuccess: () => void) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setSaving(true);
    setError(null);
    try {
      await save();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
      setSaving(false);
    }
  };

  return { saving, error, run, setError };
}

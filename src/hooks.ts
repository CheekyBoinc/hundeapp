import { useEffect, useRef } from 'react';
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

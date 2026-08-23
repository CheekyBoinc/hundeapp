import { useEffect, type ReactNode } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  headerExtra?: ReactNode;
  children: ReactNode;
}

export default function Modal({ title, onClose, headerExtra, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-stone-900/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[95dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:max-w-lg sm:rounded-3xl sm:pb-5"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{title}</h2>
            {headerExtra}
          </div>
          <button className="btn-secondary shrink-0 px-3 py-1.5" onClick={onClose}>
            Schließen
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

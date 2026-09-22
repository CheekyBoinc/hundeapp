import { useEffect, useRef, useState, type ReactNode } from 'react';
import { isTopModal, nextModalId, popModal, pushModal } from '../modalStack';

interface Props {
  title: string;
  // Optional: macht die Überschrift antippbar (Prüf-Zugang im Sync-Dialog).
  onTitleClick?: () => void;
  onClose: () => void;
  headerExtra?: ReactNode;
  // Vollbild statt Dialog: füllt den Bildschirm, inklusive Safe-Areas.
  fullScreen?: boolean;
  // Blendet den Schließen-Button aus, wenn der Inhalt die Navigation übernimmt.
  hideClose?: boolean;
  children: ReactNode;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({
  title,
  onTitleClick,
  onClose,
  headerExtra,
  fullScreen,
  hideClose,
  children
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [id] = useState(nextModalId);
  // onClose wird von Eltern oft inline neu erzeugt; über ein Ref bleibt der
  // Effekt stabil und setzt den Fokus nicht bei jedem Re-Render zurück.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    pushModal(id, () => onCloseRef.current());

    // Fokus ins Modal lenken (erstes fokussierbares Element).
    const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isTopModal(id)) return;
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusables.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previousFocus.current?.focus();
      popModal(id);
    };
  }, [id]);

  return (
    <div
      className={`fixed inset-0 z-50 ${
        fullScreen ? '' : 'flex items-end justify-center sm:items-center'
      }`}
    >
      <div
        className={`absolute inset-0 ${fullScreen ? 'bg-white' : 'bg-black/60'}`}
        onClick={fullScreen ? undefined : onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={
          fullScreen
            ? 'relative mx-auto flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-white px-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))]'
            : 'relative max-h-[95dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:max-w-lg sm:rounded-3xl sm:pb-5'
        }
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold" onClick={onTitleClick}>
              {title}
            </h2>
            {headerExtra}
          </div>
          {!hideClose && (
            <button className="btn-secondary shrink-0 px-3 py-1.5" onClick={onClose}>
              Schließen
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

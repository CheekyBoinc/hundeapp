import { useEffect, useState } from 'react';
import Modal from './Modal';

// Lizenztexte der Open-Source-Bausteine. Die Datei licenses.txt entsteht beim
// Build (vite.config.ts, thirdPartyLicenses) und liegt lokal neben der App.
export default function LicensesModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('./licenses.txt')
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(String(res.status)))))
      .then((t) => {
        if (!cancelled) setText(t);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Modal title="Lizenzen" onClose={onClose}>
      <p className="mb-3 text-sm text-stone-600">
        Hundeapp © 2026 Stefan Dehnert. Alle Rechte vorbehalten. Die App enthält
        Open-Source-Bausteine; ihre Lizenzen stehen hier vollständig.
      </p>
      {failed ? (
        <p className="text-sm text-stone-500">
          Die Lizenzliste entsteht beim Bauen der App und ist in dieser Fassung nicht enthalten.
        </p>
      ) : text === null ? (
        <p className="text-sm text-stone-500">Wird geladen…</p>
      ) : (
        // Absätze neu umbrechen: Die Lizenztexte sind hart auf 80 Zeichen
        // umbrochen und würden auf dem Handy sonst ausgefranst wirken.
        text
          .split(/\n\s*\n/)
          .map((block) => block.trim())
          .filter(Boolean)
          .map((block, i) =>
            block.startsWith('== ') ? (
              <h3 key={i} className="mt-5 text-sm font-semibold text-stone-800">
                {block.replace(/^== | ==$/g, '')}
              </h3>
            ) : (
              <p key={i} className="mt-2 text-xs leading-relaxed break-words text-stone-600">
                {block.replace(/\s*\n\s*/g, ' ')}
              </p>
            )
          )
      )}
    </Modal>
  );
}

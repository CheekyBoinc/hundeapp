// Fehlerzeile über Listen und Tabs: Meldung plus „Erneut versuchen", das die
// Seite neu lädt. Ohne Fehler wird nichts gezeichnet.
export default function ErrorBanner({
  error,
  onRetry
}: {
  error: string | null;
  onRetry: () => void;
}) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <span>{error}</span>
      <button type="button" className="shrink-0 font-semibold underline" onClick={onRetry}>
        Erneut versuchen
      </button>
    </div>
  );
}

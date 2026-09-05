// Markenzeichen der App: Hundemarke mit Öse und Pfote. Entspricht dem
// App-Icon und dem Avatar (DogTag), damit alles aus einem Guss ist.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path
        d="M50 11c-17.7 0-32 12.2-32 30.2v20.4C18 78.4 32.3 89 50 89s32-10.6 32-27.4V41.2C82 23.2 67.7 11 50 11z"
        fill="currentColor"
      />
      <circle cx="50" cy="21.5" r="6.8" fill="none" stroke="#b5561a" strokeWidth="2.3" />
      <circle cx="50" cy="21.5" r="4.5" fill="var(--color-surface)" />
      <g fill="#fffaf4">
        <circle cx="40" cy="50" r="4.3" />
        <circle cx="47" cy="45" r="4.8" />
        <circle cx="53" cy="45" r="4.8" />
        <circle cx="60" cy="50" r="4.3" />
        <ellipse cx="50" cy="66.5" rx="10.5" ry="7.5" />
      </g>
    </svg>
  );
}

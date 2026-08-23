export function PawIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g fill="currentColor">
        <circle cx="30" cy="34" r="8.5" />
        <circle cx="44" cy="24" r="9.5" />
        <circle cx="56" cy="24" r="9.5" />
        <circle cx="70" cy="34" r="8.5" />
        <ellipse cx="50" cy="67" rx="21" ry="15" />
      </g>
    </svg>
  );
}

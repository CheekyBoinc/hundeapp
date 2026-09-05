// Symbole für die Tab-Leiste. Outline-Stil, erben Farbe über currentColor.

interface IconProps {
  className?: string;
}

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true
};

export function NotebookIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 4h11a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <path d="M9 4v16" />
      <path d="M12 8h3M12 12h3" />
    </svg>
  );
}

export function ListCheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7l2 2 3-3" />
      <path d="M4 15l2 2 3-3" />
      <path d="M13 7h7M13 15h7" />
    </svg>
  );
}

export function PawOutlineIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="7" cy="8.5" r="1.8" />
      <circle cx="11" cy="5.5" r="1.8" />
      <circle cx="15.5" cy="6.5" r="1.8" />
      <circle cx="18.5" cy="10.5" r="1.8" />
      <path d="M12 12c-3 0-5.5 2.4-5.5 4.6 0 1.6 1.2 2.4 2.5 2.4 1 0 1.8-.5 3-.5s2 .5 3 .5c1.3 0 2.5-.8 2.5-2.4C17.5 14.4 15 12 12 12z" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4" />
      <path d="M9 14h2M13 14h2M9 17h2" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function CoffeeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 9h12v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9z" />
      <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M7 5c0 1 1 1 1 2M10 5c0 1 1 1 1 2M13 5c0 1 1 1 1 2" />
    </svg>
  );
}

export function PencilIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
      <path d="M13.5 6.5l3 3" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}

// Kompakter Icon-Button für Bearbeiten/Löschen in Listen (44 px Trefferfläche).
export function IconButton({
  label,
  onClick,
  danger = false,
  children
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-stone-400 ${
        danger
          ? 'hover:bg-red-50 hover:text-red-600'
          : 'hover:bg-stone-100 hover:text-accent-strong'
      }`}
    >
      {children}
    </button>
  );
}

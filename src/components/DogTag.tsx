import { useId } from 'react';
import { PHOTO_PREFIX } from '../types';

interface Props {
  name: string;
  size?: number; // Höhe in px
  // Kleines JPEG als Data-URL; ersetzt den Anfangsbuchstaben.
  photo?: string | null;
  className?: string;
}

// Hundemarke als Avatar: Anhänger mit Öse, darin der Anfangsbuchstabe oder das
// Foto des Hundes.
export default function DogTag({ name, size = 56, photo, className = '' }: Props) {
  const letter = name.trim().slice(0, 1).toUpperCase() || '?';
  // Nur ein geprüftes Datenbild rendern; alles andere fällt auf den Buchstaben
  // zurück.
  const bild = photo && photo.startsWith(PHOTO_PREFIX) ? photo : null;
  const width = Math.round(size * 0.86);
  // useId enthält Doppelpunkte; die sind in url(#…) nicht brauchbar.
  const clipId = `dogtag-${useId().replace(/:/g, '')}`;
  return (
    <svg
      viewBox="0 0 43 50"
      width={width}
      height={size}
      className={`shrink-0 ${className}`}
      role="img"
      aria-label={`Hundemarke ${name}`}
    >
      <path
        d="M21.5 4.5c-11.5 0-19 6.6-19 17.4v10.8c0 8 7.3 14.8 19 14.8s19-6.8 19-14.8V21.9C40.5 11.1 33 4.5 21.5 4.5z"
        fill="var(--color-accent)"
      />
      <circle cx="21.5" cy="9.6" r="3" fill="var(--color-surface)" />
      <circle
        cx="21.5"
        cy="9.6"
        r="4.4"
        fill="none"
        stroke="var(--color-accent-deep)"
        strokeWidth="1.2"
      />
      {bild ? (
        <>
          <defs>
            <clipPath id={clipId}>
              <rect x="4.5" y="18" width="34" height="28" rx="5" />
            </clipPath>
          </defs>
          <image
            href={bild}
            x="4.5"
            y="18"
            width="34"
            height="28"
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
        </>
      ) : (
        <text
          x="21.5"
          y="34.5"
          textAnchor="middle"
          fontSize="20"
          fontWeight="700"
          fontFamily="inherit"
          fill="#fffaf4"
        >
          {letter}
        </text>
      )}
    </svg>
  );
}

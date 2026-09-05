import { dateParts } from '../utils';

interface Props {
  date: string; // YYYY-MM-DD
  size?: 'md' | 'sm';
}

// Datumsmarke am linken Rand einer Eintragskarte: Wochentag klein in
// Akzentfarbe, Tag groß, Monat klein. Rechts eine gestrichelte Trennlinie
// wie eine Perforation – das Wiedererkennungsmerkmal des Feldbuchs.
export default function DateStamp({ date, size = 'md' }: Props) {
  const { weekday, day, month } = dateParts(date);
  const md = size === 'md';
  return (
    <div
      className={`flex shrink-0 flex-col items-center justify-center self-start border-r border-dashed border-accent-mid/60 py-1 pr-3 text-center ${
        md ? 'w-14' : 'w-12'
      }`}
      aria-label={`${weekday} ${day}. ${month}`}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-accent-strong">
        {weekday}
      </span>
      <span
        className={`font-bold leading-none tracking-tight text-stone-900 ${md ? 'text-[26px]' : 'text-xl'}`}
      >
        {day}
      </span>
      <span className="text-[11px] text-stone-500">{month}</span>
    </div>
  );
}

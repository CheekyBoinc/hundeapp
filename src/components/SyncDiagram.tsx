// Schematische Darstellung des Abgleichs: beide Handys schreiben in dasselbe
// private Repo. Bewusst ohne Abbild der Oberfläche, damit es nicht veraltet.
// Die umgebenden Absätze erklären dasselbe, deshalb für Vorleseprogramme
// ausgeblendet.
export default function SyncDiagram() {
  return (
    <svg
      viewBox="0 0 240 88"
      className="mt-4 w-full text-stone-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Zwei Handys */}
      <rect x="10" y="10" width="30" height="54" rx="6" />
      <path d="M21 57h8" />
      <rect x="50" y="10" width="30" height="54" rx="6" />
      <path d="M61 57h8" />

      {/* Beide Richtungen */}
      <path d="M92 25h44" />
      <path d="M136 25l-6-4M136 25l-6 4" />
      <path d="M136 45H92" />
      <path d="M92 45l6-4M92 45l6 4" />

      {/* Privates Repo mit der Datendatei */}
      <rect x="152" y="8" width="80" height="58" rx="8" />
      <rect x="179" y="20" width="26" height="34" rx="3" />
      <path d="M185 29h14M185 35h14M185 41h9" />

      {/* Beschriftungen */}
      <g stroke="none" className="fill-stone-500" fontSize="9" textAnchor="middle">
        <text x="45" y="80">
          Handys
        </text>
        <text x="192" y="80">
          Privates Repo
        </text>
      </g>
    </svg>
  );
}

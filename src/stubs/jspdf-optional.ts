// jspdf lädt html2canvas, dompurify und canvg nur für html() und SVG nach.
// Der PDF-Bericht nutzt nur Text und Tabellen; siehe vite.config.ts.
function nichtEingebunden(): never {
  throw new Error(
    'html2canvas, dompurify und canvg sind absichtlich nicht eingebunden (siehe vite.config.ts).'
  );
}

// Der Stub wird erst beim Benutzen geworfen, nie beim Laden.
const stub = nichtEingebunden as typeof nichtEingebunden & {
  sanitize: () => never; // Form von dompurify
  fromString: () => never; // Form von canvg
};
stub.sanitize = nichtEingebunden;
stub.fromString = nichtEingebunden;

export default stub;

// Stapel offener Modale. Nur das oberste reagiert auf Escape bzw. auf die
// Android-Zurück-Taste, damit ein verschachteltes Modal (z. B. Detail über
// Tagesansicht) nicht alles auf einmal schließt.

let counter = 0;
const stack: number[] = [];
const closers = new Map<number, () => void>();

export function nextModalId(): number {
  return ++counter;
}

export function pushModal(id: number, close: () => void): void {
  stack.push(id);
  closers.set(id, close);
}

export function popModal(id: number): void {
  const idx = stack.lastIndexOf(id);
  if (idx !== -1) stack.splice(idx, 1);
  closers.delete(id);
}

export function isTopModal(id: number): boolean {
  return stack[stack.length - 1] === id;
}

// Schließt das oberste Modal. Liefert false, wenn keines offen ist.
export function closeTopModal(): boolean {
  const top = stack[stack.length - 1];
  if (top === undefined) return false;
  closers.get(top)?.();
  return true;
}

import { useEffect, useRef, useState, type ReactElement } from 'react';
import Modal from './Modal';
import { BrandMark } from './BrandMark';
import { CalendarIcon, NotebookIcon, PawOutlineIcon, ShieldIcon } from './NavIcons';

interface Props {
  onClose: () => void;
}

interface Step {
  title: string;
  paragraphs: string[];
  // Symbol des Bereichs, in derselben Optik wie die Tab-Leiste. Schritt 1
  // lässt es weg und zeigt stattdessen die Hundemarke.
  Icon?: (p: { className?: string }) => ReactElement;
}

const STEPS: Step[] = [
  {
    title: 'Willkommen',
    paragraphs: [
      'Die Hundeapp ist ein Trainingstagebuch für die Hundeschule. Du hältst darin fest, was ihr geübt habt, und behältst Übungen, Gesundheit und Termine an einer Stelle.',
      'Alles liegt auf dem Gerät. Ein Konto brauchst du nicht.'
    ]
  },
  {
    title: 'Training festhalten',
    Icon: NotebookIcon,
    paragraphs: [
      'Unter „Einträge" steht jeder Besuch in der Hundeschule: Datum, Ort, geübte Kommandos, Aufgaben und die Tipps der Trainerin. Ein Haken markiert, was erledigt ist.',
      'Unter „Kommandos" sammelst du die Übungen mit Beschreibung und Tipp. Die App zeigt dir, was du lange nicht geübt hast.'
    ]
  },
  {
    title: 'Der Hund',
    Icon: PawOutlineIcon,
    paragraphs: [
      'Unter „Hunde" legst du Profil, Gewicht, Kot-Tagebuch, Tierarztbesuche und Impfungen an.',
      'Beim Gewicht siehst du den Verlauf und ob er im Idealbereich für die Rasse liegt.'
    ]
  },
  {
    title: 'Den Überblick behalten',
    Icon: CalendarIcon,
    paragraphs: [
      'Der „Kalender" zeigt den Monat mit allen Trainings und markiert die Tage, an denen ihr geübt habt.',
      'Darunter stehen fällige Impfungen und Folgetermine, damit nichts untergeht.'
    ]
  },
  {
    title: 'Deine Daten',
    Icon: ShieldIcon,
    paragraphs: [
      'Alles bleibt auf dem Gerät. Über Einstellungen → Sicherung schreibst du eine Datei, die du für den Handywechsel oder ein zweites Gerät nutzen kannst.',
      'Wenn sich zwei Geräte von selbst abgleichen sollen, verbindest du sie in den Einstellungen: mit einem Konto per E-Mail-Code oder mit einem eigenen privaten GitHub-Repo. Wie das geht, steht in den Einstellungen unter Hilfe.'
    ]
  }
];

function Progress({ current }: { current: number }) {
  return (
    <span
      className="flex items-center gap-1.5"
      role="img"
      aria-label={`Schritt ${current + 1} von ${STEPS.length}`}
    >
      {STEPS.map((step, index) => (
        <span
          key={step.title}
          className={`h-2 w-2 rounded-full ${index <= current ? 'bg-accent' : 'bg-stone-300'}`}
        />
      ))}
    </span>
  );
}

export default function Onboarding({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const current = STEPS[step];
  const last = step === STEPS.length - 1;
  const Icon = current.Icon;

  // Beim Schrittwechsel den Fokus auf die Überschrift setzen. Das Modal setzt
  // ihn nur beim Öffnen, sonst bliebe er auf dem Knopf der vorigen Seite.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  return (
    <Modal
      title="Einführung"
      onClose={onClose}
      fullScreen
      hideClose
      headerExtra={<Progress current={step} />}
    >
      <div className="flex flex-1 flex-col">
        <div className="flex-1 pt-2">
          {Icon ? (
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
              <Icon className="h-7 w-7" />
            </span>
          ) : (
            <BrandMark className="mx-auto h-20 w-20 text-accent" />
          )}
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="mt-6 text-center font-serif text-2xl font-semibold tracking-tight focus:outline-none"
          >
            {current.title}
          </h3>
          <div className="mt-3 space-y-3">
            {current.paragraphs.map((paragraph) => (
              <p key={paragraph} className="prose-serif text-base leading-relaxed text-stone-600">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStep((s) => s - 1)}
              >
                Zurück
              </button>
            )}
            <button
              type="button"
              className="btn-primary ml-auto"
              onClick={() => (last ? onClose() : setStep((s) => s + 1))}
            >
              {last ? 'Fertig' : 'Weiter'}
            </button>
          </div>
          {!last && (
            <button
              type="button"
              className="tap-target mx-auto mt-3 block text-sm text-stone-500 underline"
              onClick={onClose}
            >
              Überspringen
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

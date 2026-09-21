import { useState } from 'react';
import Modal from './Modal';
import SyncDiagram from './SyncDiagram';
import { HELP_TOPICS, type HelpTopic } from '../helpTopics';
import { ChevronRightIcon } from './NavIcons';

interface Props {
  onOpenSyncSetup: () => void;
  onOpenAccountSetup: () => void;
  onStartOnboarding: () => void;
  onClose: () => void;
}

// Kurze Hilfe mit Themenliste. Die Texte stehen in src/helpTopics.ts.
export default function HelpModal({
  onOpenSyncSetup,
  onOpenAccountSetup,
  onStartOnboarding,
  onClose
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const topic = HELP_TOPICS.find((t) => t.id === openId) ?? null;

  function runAction(t: HelpTopic) {
    if (t.action === 'cloud') onOpenAccountSetup();
    if (t.action === 'github') onOpenSyncSetup();
    if (t.action === 'onboarding') onStartOnboarding();
  }

  return (
    <Modal title={topic ? topic.title : 'Hilfe'} onClose={onClose}>
      {topic ? (
        <div>
          <button
            type="button"
            className="btn-secondary mb-4 w-full"
            onClick={() => setOpenId(null)}
          >
            Zurück zur Übersicht
          </button>

          <div className="space-y-3">
            {topic.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-stone-600">
                {paragraph}
              </p>
            ))}
          </div>

          {topic.diagram === 'sync' && <SyncDiagram />}

          {topic.steps && (
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-stone-600">
              {topic.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}

          {topic.action && (
            <button
              type="button"
              className="btn-primary mt-4 w-full"
              onClick={() => runAction(topic)}
            >
              {topic.action === 'cloud'
                ? 'Konto verbinden'
                : topic.action === 'github'
                  ? 'GitHub-Repo einrichten'
                  : 'Einführung starten'}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {HELP_TOPICS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setOpenId(t.id)}
              className="flex w-full items-start gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-stone-800">{t.title}</span>
                <span className="mt-0.5 block text-xs text-stone-500">{t.summary}</span>
              </span>
              <ChevronRightIcon className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

import { useEffect, useState } from 'react';

interface Props {
  onComplete: () => void;
}

interface Step {
  target: string;
  title: string;
  description: string;
  position: 'bottom' | 'top' | 'left' | 'right';
}

const steps: Step[] = [
  {
    target: '',
    title: 'Welcome to Frontly',
    description: 'Your new tab is now your workspace. Organize bookmarks, notes, and widgets in a beautiful bento grid.',
    position: 'bottom',
  },
  {
    target: '.td-workspace-tabs',
    title: 'Workspaces',
    description: 'Separate your projects, personal links, and everything else. Right-click a tab to rename or export it.',
    position: 'bottom',
  },
  {
    target: '.td-create-board-btn',
    title: 'Boards & Widgets',
    description: 'Create bookmark boards, notes, todos, weather, and clock widgets. Drag to rearrange, resize from corners.',
    position: 'bottom',
  },
  {
    target: '.td-toolbar-trigger',
    title: 'Toolbar',
    description: 'Import browser bookmarks, set wallpapers (image, GIF, or video), and export backups from here.',
    position: 'left',
  },
  {
    target: '',
    title: 'You\'re ready',
    description: 'Right-click boards for options. Use Ctrl+Z to undo, Alt+L to lock layout. Check Settings (bottom-right) for more.',
    position: 'bottom',
  },
];

export function Onboarding({ onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  useEffect(() => {
    if (!step.target) {
      setSpotlightRect(null);
      return;
    }

    const el = document.querySelector(step.target);
    if (el) {
      setSpotlightRect(el.getBoundingClientRect());
    } else {
      setSpotlightRect(null);
    }
  }, [currentStep, step.target]);

  const getTooltipStyle = (): React.CSSProperties => {
    if (!spotlightRect) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const pad = 16;
    const tooltipW = 300;
    const tooltipH = 180;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let style: React.CSSProperties = {};

    switch (step.position) {
      case 'bottom': {
        let top = spotlightRect.bottom + pad;
        let left = spotlightRect.left + spotlightRect.width / 2 - tooltipW / 2;
        if (left < 12) left = 12;
        if (left + tooltipW > vw - 12) left = vw - 12 - tooltipW;
        if (top + tooltipH > vh - 12) top = spotlightRect.top - pad - tooltipH;
        style = { top, left };
        break;
      }
      case 'top': {
        let top = spotlightRect.top - pad - tooltipH;
        let left = spotlightRect.left + spotlightRect.width / 2 - tooltipW / 2;
        if (left < 12) left = 12;
        if (left + tooltipW > vw - 12) left = vw - 12 - tooltipW;
        if (top < 12) top = spotlightRect.bottom + pad;
        style = { top, left };
        break;
      }
      case 'left': {
        let top = spotlightRect.top + spotlightRect.height / 2 - tooltipH / 2;
        let left = spotlightRect.left - pad - tooltipW;
        if (top < 12) top = 12;
        if (top + tooltipH > vh - 12) top = vh - 12 - tooltipH;
        if (left < 12) left = spotlightRect.right + pad;
        style = { top, left };
        break;
      }
      case 'right': {
        let top = spotlightRect.top + spotlightRect.height / 2 - tooltipH / 2;
        let left = spotlightRect.right + pad;
        if (top < 12) top = 12;
        if (top + tooltipH > vh - 12) top = vh - 12 - tooltipH;
        if (left + tooltipW > vw - 12) left = spotlightRect.left - pad - tooltipW;
        style = { top, left };
        break;
      }
    }

    return style;
  };

  return (
    <div className="td-onboarding-overlay">
      {spotlightRect && (
        <div
          className="td-onboarding-spotlight"
          style={{
            top: spotlightRect.top - 6,
            left: spotlightRect.left - 6,
            width: spotlightRect.width + 12,
            height: spotlightRect.height + 12,
          }}
        />
      )}

      <div className="td-onboarding-tooltip" style={getTooltipStyle()}>
        <div className="td-onboarding-step-num">
          {currentStep + 1} / {steps.length}
        </div>
        <h3 className="td-onboarding-title">{step.title}</h3>
        <p className="td-onboarding-desc">{step.description}</p>

        <div className="td-onboarding-footer">
          <div className="td-onboarding-dots">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`td-onboarding-dot ${i === currentStep ? 'is-active' : ''} ${i < currentStep ? 'is-done' : ''}`}
              />
            ))}
          </div>

          <div className="td-onboarding-actions">
            {!isFirst && (
              <button
                className="td-onboarding-btn td-onboarding-back"
                type="button"
                onClick={() => setCurrentStep((s) => s - 1)}
              >
                Back
              </button>
            )}
            <button
              className="td-onboarding-btn td-onboarding-next"
              type="button"
              onClick={() => {
                if (isLast) onComplete();
                else setCurrentStep((s) => s + 1);
              }}
            >
              {isFirst ? "Let's go" : isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>

        <button className="td-onboarding-skip" type="button" onClick={onComplete}>
          Skip tour
        </button>
      </div>
    </div>
  );
}

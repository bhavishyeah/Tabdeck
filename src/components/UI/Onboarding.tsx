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
    title: 'Welcome to TabDeck',
    description: 'Your new tab is now a beautiful, draggable bento grid for organizing bookmarks. Let me show you around!',
    position: 'bottom',
  },
  {
    target: '.td-create-board-btn',
    title: 'Create Boards & Notes',
    description: 'Click + for a bookmark board, or the sticky note icon for a note board. Right-click board names for more options.',
    position: 'bottom',
  },
  {
    target: '.td-toolbar-trigger',
    title: 'Toolbar Menu (⋯)',
    description: 'Access: Import Bookmarks, Export/Import JSON backup, Set wallpaper (image/GIF/video), Clear wallpaper.',
    position: 'left',
  },
  {
    target: '.td-workspace-tabs',
    title: 'Workspaces',
    description: 'Create workspaces to organize contexts. Right-click tabs to rename, export as JSON, or delete.',
    position: 'bottom',
  },
  {
    target: '.td-search-input',
    title: 'Search',
    description: 'Instantly filter boards and links by keyword.',
    position: 'bottom',
  },
  {
    target: '.td-lock-btn',
    title: 'Lock Layout (Ctrl+M)',
    description: 'Lock to prevent accidental moves. Unlock to rearrange boards freely.',
    position: 'bottom',
  },
  {
    target: '',
    title: 'Keyboard Shortcuts',
    description: 'Ctrl+B: New board\nCtrl+Shift+B: New note\nCtrl+M: Lock/Unlock\nCtrl+Z: Undo\nCtrl+Shift+Z: Redo\nCtrl+Shift+Y: Quick save tab',
    position: 'bottom',
  },
];

export function Onboarding({ onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  useEffect(() => {
    if (!step.target) {
      setSpotlightRect(null);
      return;
    }

    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setSpotlightRect(rect);
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
        // Clamp horizontal
        if (left < 12) left = 12;
        if (left + tooltipW > vw - 12) left = vw - 12 - tooltipW;
        // Clamp vertical — flip to top if no room below
        if (top + tooltipH > vh - 12) {
          top = spotlightRect.top - pad - tooltipH;
        }
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
        <h3 className="td-onboarding-title">{step.title}</h3>
        <p className="td-onboarding-desc">{step.description}</p>

        <div className="td-onboarding-footer">
          <div className="td-onboarding-dots">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`td-onboarding-dot ${i === currentStep ? 'is-active' : ''}`}
              />
            ))}
          </div>

          <div className="td-onboarding-actions">
            {currentStep > 0 && (
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
              {isLast ? 'Done' : 'Next'}
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

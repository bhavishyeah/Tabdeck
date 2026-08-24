import { useEffect } from 'react';
import { Check, Info, AlertTriangle, X } from 'lucide-react';
import { useUiStore } from '../../store/useUiStore';

const ICON_MAP = {
  success: Check,
  info: Info,
  error: X,
  warning: AlertTriangle,
};

const DURATION_MAP = {
  success: 2000,
  info: 2500,
  error: 3500,
  warning: 3000,
};

export function Toast() {
  const { toastMessage, toastTone, clearToast } = useUiStore();

  useEffect(() => {
    if (!toastMessage) return;
    const duration = DURATION_MAP[toastTone as keyof typeof DURATION_MAP] || 2500;
    const timer = setTimeout(clearToast, duration);
    return () => clearTimeout(timer);
  }, [toastMessage, toastTone, clearToast]);

  if (!toastMessage) return null;

  const Icon = ICON_MAP[toastTone as keyof typeof ICON_MAP] || Info;

  return (
    <div className={`td-toast td-toast-${toastTone}`}>
      <Icon size={14} strokeWidth={2.2} />
      <span>{toastMessage}</span>
    </div>
  );
}

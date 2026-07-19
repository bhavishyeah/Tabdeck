import { useEffect } from 'react';
import { useUiStore } from '../../store/useUiStore';

export function Toast() {
  const { toastMessage, toastTone, clearToast } = useUiStore();

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(clearToast, 1800);
    return () => clearTimeout(timer);
  }, [toastMessage, clearToast]);

  if (!toastMessage) return null;

  return <div className={`td-toast td-toast-${toastTone}`}>{toastMessage}</div>;
}
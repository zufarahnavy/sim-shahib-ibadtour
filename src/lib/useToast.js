import { useState, useCallback } from "react";

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((message, type = "") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return { toasts, toast };
}

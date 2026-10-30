import { useEffect, useRef, useState } from 'react';

// A text field over a value the server owns: it follows the server (another tab's save shows here) until the manager
// starts typing, then keeps their draft until they save or undo.

export function useDraft(server: string) {
  const [value, setValue] = useState(server);
  const [base, setBase] = useState(server);
  if (server !== base) {
    setBase(server);
    if (value === base) setValue(server);
  }
  return { value, set: setValue, dirty: value !== server, reset: () => setValue(server) };
}

/** A "Saved" flag that clears itself a few seconds after flash(). */
export function useSavedFlag(ms = 3000) {
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const flash = () => {
    setSaved(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), ms);
  };
  return { saved, flash };
}

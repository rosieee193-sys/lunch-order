import {
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
} from 'react';

interface Props
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onCommit: (value: string) => void;
  debounceMs?: number;
}

/** Input text đồng bộ server — debounce + hỗ trợ bộ gõ tiếng Việt (IME). */
export function SyncedTextInput({
  value,
  onCommit,
  debounceMs = 400,
  onBlur,
  onFocus,
  ...rest
}: Props) {
  const [draft, setDraft] = useState(value);
  const composingRef = useRef(false);
  const focusedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastSentRef = useRef(value);

  useEffect(() => {
    lastSentRef.current = value;
    if (!focusedRef.current && !composingRef.current) {
      setDraft(value);
    }
  }, [value]);

  const commit = (next: string) => {
    if (next === lastSentRef.current) return;
    lastSentRef.current = next;
    onCommit(next);
  };

  const scheduleCommit = (next: string) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!composingRef.current) commit(next);
    }, debounceMs);
  };

  return (
    <input
      {...rest}
      value={draft}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);
        scheduleCommit(next);
      }}
      onCompositionStart={() => {
        composingRef.current = true;
        clearTimeout(timerRef.current);
      }}
      onCompositionEnd={(e) => {
        composingRef.current = false;
        const next = e.currentTarget.value;
        setDraft(next);
        scheduleCommit(next);
      }}
      onFocus={(e) => {
        focusedRef.current = true;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focusedRef.current = false;
        clearTimeout(timerRef.current);
        const next = e.target.value;
        setDraft(next);
        commit(next);
        onBlur?.(e);
      }}
    />
  );
}

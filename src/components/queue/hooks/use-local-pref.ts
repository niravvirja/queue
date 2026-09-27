import { useEffect, useState } from "react";

function localPref(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(`queue:pref:${key}`);
  return raw === null ? fallback : raw === "1";
}

export function useLocalPref(key: string, fallback: boolean) {
  const [value, setValue] = useState(fallback);
  useEffect(() => setValue(localPref(key, fallback)), [key, fallback]);
  const update = (next: boolean) => {
    setValue(next);
    window.localStorage.setItem(`queue:pref:${key}`, next ? "1" : "0");
  };
  return [value, update] as const;
}

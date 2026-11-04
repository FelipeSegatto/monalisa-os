import { useEffect, useState } from "react";

/** Keep in sync with the public catalog media query in catalog.css. */
export const PUBLIC_COMPACT_QUERY = "(max-width: 760px)";

export function useCompactViewport(): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(PUBLIC_COMPACT_QUERY).matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia(PUBLIC_COMPACT_QUERY);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return matches;
}

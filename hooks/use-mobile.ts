"use client";

import * as React from "react";

// Tailwind 'md' breakpoint je přesně 768px
const MOBILE_BREAKPOINT = 768;

export function useMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false);

  React.useEffect(() => {
    // 1. Ochrana proti Server-Side Render chybám
    if (typeof window === "undefined") return;

    // 2. Definice matchMedia
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // 3. Posluchač pro změny (otočení displeje atd.)
    mql.addEventListener("change", onChange);
    
    // 4. Okamžitý první check při načtení komponenty
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    // 5. Cleanup
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
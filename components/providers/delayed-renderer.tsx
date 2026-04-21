"use client";
import { useState, useEffect, ReactNode } from "react";

export const DelayedRenderer = ({ children, delay = 1000 }: { children: ReactNode, delay?: number }) => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShouldRender(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!shouldRender) return null;
  return <>{children}</>;
};
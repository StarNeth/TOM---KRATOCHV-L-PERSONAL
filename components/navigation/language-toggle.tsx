"use client";

import { createContext, useContext, useState } from "react";

// 1. ROZŠÍŘÍME TYP O FUNKCI 't'
type LanguageContextType = {
  language: "cs" | "en";
  setLanguage: (lang: "cs" | "en") => void;
  t: (dict: { cs: any; en: any }) => any; // Funkce t přijme objekt s cs/en a vrátí správnou verzi
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<"cs" | "en">("en");

  // 2. DEFINICE FUNKCE t
  const t = (dict: { cs: any; en: any }) => {
    return dict[language] || dict["en"]; // Fallback na angličtinu, kdyby čeština chyběla
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};
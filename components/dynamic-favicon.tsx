"use client";

import { useEffect } from "react";

export function DynamicFavicon() {
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = currentY / maxScroll;

      // Najdeme VŠECHNY ikony (někdy jich tam Next.js nasází víc)
      const links = document.querySelectorAll("link[rel*='icon']");
      
      let iconPath = "/favicon-titanium.png";
      if (progress >= 0.4 && progress < 0.75) {
        iconPath = "/favicon-blue.png";
      } else if (progress >= 0.75) {
        iconPath = "/favicon-orange.png";
      }

      // Pokud žádný link neexistuje, vytvoříme ho
      if (links.length === 0) {
        const newLink = document.createElement("link");
        newLink.rel = "icon";
        newLink.href = iconPath;
        document.head.appendChild(newLink);
      } else {
        // Jinak aktualizujeme všechny nalezené (včetně apple-touch-icon pokud chceš)
        links.forEach((link) => {
          (link as HTMLLinkElement).href = iconPath;
        });
      }
      
      // DEBUG: Odkomentuj řádek níže, abys v konzoli viděl, jestli kód běží
      // console.log("Favicon měním na:", iconPath, "Progress:", progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return null;
}
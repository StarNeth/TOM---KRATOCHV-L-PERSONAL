"use client";

export function Grain() {
  // Toto je 100% kódový, čistě bílý šum zakódovaný do Base64 stringu.
  // Žádné externí requesty, žádné stahování souborů.
  const base64Noise = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVW/1d4AAAAACHRSTlMAAAAAAABhGIfk1L0AAAAlSURBVDjLY2DABsDcwAhXwsAowMDIxMDExMQAxIwMDAyMUAUAgxgByX18HQsAAAAASUVORK5CYII=";

  return (
    <div className="pointer-events-none fixed inset-0 z-[50] h-full w-full overflow-hidden opacity-[0.05] mix-blend-overlay">
      <div 
        className="absolute -inset-[200%] w-[400%] h-[400%] animate-grain"
        style={{
          backgroundImage: `url(${base64Noise})`,
          backgroundSize: "64px", // Menší hodnota = hustší, ostřejší zrno
          willChange: "transform" // Hodí výpočet rovnou na grafickou kartu
        }}
      />
    </div>
  );
}
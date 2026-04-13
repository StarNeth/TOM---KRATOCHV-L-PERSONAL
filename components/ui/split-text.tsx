"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface SplitTextProps {
  children: string;
  className?: string;
  animation?: "fade" | "slide" | "char";
  delay?: number;
  stagger?: number;
  trigger?: boolean;
}

export function SplitText({
  children,
  className = "",
  animation = "slide",
  delay = 0,
  stagger = 0.02,
  trigger = false,
}: SplitTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const charsRef = useRef<HTMLSpanElement[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chars = charsRef.current;

    const animationConfig = {
      fade: {
        from: { opacity: 0, y: 20 },
        to: { opacity: 1, y: 0 },
      },
      slide: {
        from: { y: "100%", opacity: 0 },
        to: { y: "0%", opacity: 1 },
      },
      char: {
        from: { y: 50, opacity: 0, rotateX: -90 },
        to: { y: 0, opacity: 1, rotateX: 0 },
      },
    };

    const config = animationConfig[animation];

    gsap.set(chars, config.from);

    const tl = gsap.timeline({
      scrollTrigger: trigger
        ? {
            trigger: containerRef.current,
            start: "top 85%",
            end: "top 20%",
            toggleActions: "play none none reverse",
          }
        : undefined,
      delay: trigger ? 0 : delay,
    });

    tl.to(chars, {
      ...config.to,
      duration: 0.8,
      stagger: stagger,
      ease: "power4.out",
    });

    return () => {
      tl.kill();
    };
  }, [animation, delay, stagger, trigger]);

  const words = children.split(" ");

  return (
    <div ref={containerRef} className={className}>
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block whitespace-nowrap">
          {word.split("").map((char, charIndex) => {
            const globalIndex =
              words.slice(0, wordIndex).join(" ").length + charIndex + (wordIndex > 0 ? 1 : 0);
            return (
              <span
                key={charIndex}
                ref={(el) => {
                  if (el) charsRef.current[globalIndex] = el;
                }}
                className="inline-block"
                style={{ willChange: "transform, opacity" }}
              >
                {char}
              </span>
            );
          })}
          {wordIndex < words.length - 1 && <span>&nbsp;</span>}
        </span>
      ))}
    </div>
  );
}

interface RevealTextProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function RevealText({ children, className = "", delay = 0 }: RevealTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !innerRef.current) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 85%",
        toggleActions: "play none none reverse",
      },
    });

    tl.fromTo(
      innerRef.current,
      { y: "100%" },
      { y: "0%", duration: 1, ease: "power4.out", delay }
    );

    return () => {
      tl.kill();
    };
  }, [delay]);

  return (
    <div ref={containerRef} className={`overflow-hidden ${className}`}>
      <div ref={innerRef}>{children}</div>
    </div>
  );
}

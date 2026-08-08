'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';

interface SceneWrapperProps {
  children: ReactNode;
  id?: string;
  className?: string;
  ariaLabel?: string;
  delay?: number;
}

export default function SceneWrapper({
  children,
  id,
  className = '',
  ariaLabel,
  delay = 0,
}: SceneWrapperProps) {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            setTimeout(() => setIsVisible(true), delay);
          } else {
            setIsVisible(true);
          }
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin: '0px 0px -80px 0px',
        threshold: 0.1,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <section
      ref={ref}
      id={id}
      role="region"
      aria-label={ariaLabel}
      className={`transition-all duration-700 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      {children}
    </section>
  );
}

"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

export const CompareSlider = ({
  childrenA,
  childrenB,
  className,
}: {
  childrenA: React.ReactNode;
  childrenB: React.ReactNode;
  className?: string;
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDrag = (event: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    let clientX = 0;
    if ("touches" in event && event.touches && event.touches.length > 0) {
      clientX = event.touches[0]?.clientX || 0;
    } else {
      clientX = (event as any).clientX;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    
    if (isDragging) {
      window.addEventListener("mousemove", handleDrag);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleDrag, { passive: false });
      window.addEventListener("touchend", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleDrag);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleDrag);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none rounded-3xl cursor-ew-resize ${className}`}
      onMouseDown={(e) => {
        setIsDragging(true);
        handleDrag(e);
      }}
      onTouchStart={(e) => {
        setIsDragging(true);
        handleDrag(e);
      }}
    >
      {/* Imagem/Div B (Solução / Nova) - Fica no fundo */}
      <div className="absolute inset-0 w-full h-full">
        {childrenB}
      </div>

      {/* Imagem/Div A (Problema / Antiga) - Fica por cima e tem clip-path */}
      <div 
        className="absolute inset-0 h-full w-full pointer-events-none"
        style={{
          clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`
        }}
      >
        {childrenA}
      </div>

      {/* Divisor do Slider */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize flex items-center justify-center z-20 pointer-events-none"
        style={{ left: `calc(${sliderPosition}% - 2px)` }}
      >
        <div className="w-8 h-8 bg-white text-[#db5b18] shadow-xl rounded-full flex items-center justify-center ring-2 ring-black/5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>
    </div>
  );
};

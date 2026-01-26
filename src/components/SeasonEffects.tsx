"use client";
import { useTheme } from "@/contexts/ThemeContext";
import { useEffect, useState } from "react";

const SeasonEffects = () => {
  const { season } = useTheme();
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number; size: number }>>([]);

  useEffect(() => {
    if (season === "normal") {
      setParticles([]);
      return;
    }
    
    const newParticles = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      size: 12 + Math.random() * 16,
    }));
    setParticles(newParticles);
  }, [season]);

  if (season === "normal" || particles.length === 0) return null;

  const getEmoji = () => {
    switch (season) {
      case "valentine": return ["💕", "❤️", "💗", "💖", "🌹"];
      case "halloween": return ["👻", "🎃", "🦇", "💀", "🕷️"];
      case "christmas": return ["❄️", "🎄", "⭐", "🎅", "🎁"];
      case "diademuertos": return ["💀", "🌺", "🕯️", "💐", "✨"];
      default: return [];
    }
  };

  const emojis = getEmoji();

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-float opacity-30"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${8 + Math.random() * 4}s`,
          }}
        >
          {emojis[p.id % emojis.length]}
        </div>
      ))}
    </div>
  );
};

export default SeasonEffects;

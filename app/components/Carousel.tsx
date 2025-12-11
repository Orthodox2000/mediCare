"use client";
import { useState, useEffect } from "react";

export default function HospitalCarousel() {
  const images = [ 
    "/g.jpg",
    "/h.jpg",
    "/l.jpg",
    "/m.jpg",
    "/n.jpg"
  ];

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 4000); // auto slide every 4s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-64 md:h-1/2 overflow-hidden rounded-xl shadow-lg">
      <div
        className="flex transition-transform duration-[1200ms] ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {images.map((img, i) => (
          <img
            key={i}
            src={img}
            alt={`Hospital slide ${i + 1}`}
            className="w-full h-64 md:h-96 object-cover flex-shrink-0"
          />
        ))}
      </div>

      {/* indicators */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {images.map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
              current === i ? "bg-white" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "./button";

interface DurationRollerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function DurationRoller({
  value,
  onChange,
  min = 0,
  max = 120,
  step = 1,
}: DurationRollerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const rollerRef = useRef<HTMLDivElement>(null);

  const itemHeight = 60;
  const visibleItems = 3;

  useEffect(() => {
    setScrollOffset(value * itemHeight);
  }, [value]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    const newValue = Math.max(min, Math.min(max, value + delta * step));
    onChange(newValue);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const diff = e.clientY - startY;
    const newValue = Math.max(min, Math.min(max, value - Math.round(diff / itemHeight) * step));
    if (newValue !== value) {
      onChange(newValue);
      setStartY(e.clientY);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove as any);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove as any);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, value]);

  const numbers = [];
  for (let i = min; i <= max; i += step) {
    numbers.push(i);
  }

  const currentIndex = numbers.indexOf(value);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm text-muted-foreground">Duration (Months)</div>
      
      <div
        ref={rollerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        className="relative w-32 h-48 overflow-hidden bg-gradient-to-b from-background via-accent/20 to-background rounded-lg border border-border/50 cursor-grab active:cursor-grabbing"
      >
        {/* Top gradient fade */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />

        {/* Center line indicator */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-border transform -translate-y-1/2 pointer-events-none z-20" />
        <div className="absolute top-1/2 left-0 right-0 flex justify-between px-2 transform -translate-y-1/2 pointer-events-none z-20">
          <div className="w-4 h-1 bg-border/50" />
          <div className="w-4 h-1 bg-border/50" />
        </div>

        {/* Roller content */}
        <div
          className="flex flex-col items-center transition-transform duration-200"
          style={{
            transform: `translateY(calc(50% - ${currentIndex * itemHeight}px - ${itemHeight / 2}px))`,
          }}
        >
          {numbers.map((num) => (
            <div
              key={num}
              className={`w-full h-16 flex items-center justify-center text-2xl font-semibold transition-all duration-200 ${
                num === value
                  ? "text-foreground scale-110"
                  : "text-muted-foreground/50 scale-75"
              }`}
            >
              {num}
            </div>
          ))}
        </div>
      </div>

      {/* Up/Down buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
        >
          <ChevronUp className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
      </div>

      {/* Display current value */}
      <div className="text-3xl font-bold text-center min-w-24">
        {value}
      </div>
    </div>
  );
}

import { useState } from "react";
import { Star } from "lucide-react";

// Review form ka rating picker. `value`/`onChange` controlled hain taake
// react-hook-form ke Controller ki jagah simple state se chal jaye.
export default function StarInput({ value = 0, onChange, size = 24 }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          onMouseEnter={() => setHovered(star)}
          onClick={() => onChange(star === value ? 0 : star)}
          className="rounded p-0.5 transition hover:scale-110"
        >
          <Star
            size={size}
            className={star <= active ? "fill-amber-400 text-amber-400" : "text-slate-300"}
          />
        </button>
      ))}
      {value ? <span className="ml-2 text-sm text-slate-500">{value} / 5</span> : null}
    </div>
  );
}

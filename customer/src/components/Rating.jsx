import { Star } from "lucide-react";

export default function Rating({ value = 0, count, size = 16, showValue = true }) {
  const rounded = Math.round(Number(value) || 0);

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            className={star <= rounded ? "fill-amber-400 text-amber-400" : "text-slate-300"}
          />
        ))}
      </div>
      {showValue ? (
        <span className="text-xs text-slate-500">
          {(Number(value) || 0).toFixed(1)}
          {typeof count === "number" ? ` (${count})` : ""}
        </span>
      ) : null}
    </div>
  );
}

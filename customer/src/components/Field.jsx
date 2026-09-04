import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Ek input + label + error message. react-hook-form ke `register` ka natija
 * seedha spread karte hain, is liye har form mein wahi shape chalti hai:
 *   <Field label="Email" error={errors.email} {...register("email", rules.email)} />
 *
 * forwardRef ki zarorat nahi — React 19 mein `ref` normal prop ki tarah pass hota hai.
 *
 * `type="password"` par show/hide wala button yahin se aa jata hai, taake har
 * form (login, register, reset, profile) mein wohi toggle dobara na likhna pare.
 */
export default function Field({ label, error, hint, as = "input", children, className = "", ...props }) {
  const Element = as;
  const invalid = Boolean(error);
  const isPassword = props.type === "password";
  const [revealed, setRevealed] = useState(false);

  const control = (
    <Element
      {...props}
      // Reveal karne par sirf type badalta hai — value aur register wahi rehte hain
      type={isPassword && revealed ? "text" : props.type}
      aria-invalid={invalid}
      className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-3 ${
        invalid
          ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
          : "border-slate-300 focus:border-brand-500 focus:ring-brand-100"
      } ${as === "textarea" ? "min-h-24 resize-y" : ""} ${isPassword ? "pr-11" : ""}`}
    >
      {children}
    </Element>
  );

  return (
    <label className={`block ${className}`}>
      {label ? <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span> : null}

      {isPassword ? (
        <div className="relative">
          {control}
          <button
            // type="button" zaroori hai — warna form ke andar ye submit kar deta
            type="button"
            onClick={() => setRevealed((shown) => !shown)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      ) : (
        control
      )}

      {invalid ? (
        <span className="mt-1.5 block text-xs font-medium text-rose-600">{error.message}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

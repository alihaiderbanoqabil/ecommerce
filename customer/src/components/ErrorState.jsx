import { AlertTriangle } from "lucide-react";
import { getApiError } from "../store/api/baseApi";

export default function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-6 py-12 text-center">
      <AlertTriangle className="mb-3 h-9 w-9 text-rose-500" />
      <h3 className="text-base font-semibold text-rose-800">Could not load this</h3>
      <p className="mt-1 text-sm text-rose-600">{getApiError(error)}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

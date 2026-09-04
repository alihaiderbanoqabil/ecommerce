import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import Spinner from "../components/Spinner";
import { useVerifyEmailQuery } from "../store/api/authApi";
import { getApiError } from "../store/api/baseApi";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");

  // Token na ho to request bhejne ka faida nahi
  const { isLoading, isSuccess, error } = useVerifyEmailQuery(token, { skip: !token });

  if (!token) {
    return (
      <div className="text-center">
        <XCircle className="mx-auto h-12 w-12 text-rose-500" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Missing verification token</h1>
        <p className="mt-2 text-sm text-slate-600">
          Open the link from your email exactly as it was sent.
        </p>
        <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-brand-600">
          Back to login
        </Link>
      </div>
    );
  }

  if (isLoading) return <Spinner label="Verifying your email..." />;

  if (isSuccess) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Email verified</h1>
        <p className="mt-2 text-sm text-slate-600">Your account is active. You can log in now.</p>
        <Link
          to="/login"
          className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <XCircle className="mx-auto h-12 w-12 text-rose-500" />
      <h1 className="mt-4 text-xl font-bold text-slate-900">Verification failed</h1>
      <p className="mt-2 text-sm text-slate-600">{getApiError(error, "This link is invalid or expired.")}</p>
      <p className="mt-4 text-xs text-slate-500">
        Verification links expire after 24 hours. Register again to get a fresh one.
      </p>
      <Link to="/register" className="mt-6 inline-block text-sm font-semibold text-brand-600">
        Back to sign up
      </Link>
    </div>
  );
}

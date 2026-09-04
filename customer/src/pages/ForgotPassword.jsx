import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { MailCheck } from "lucide-react";
import toast from "react-hot-toast";
import Field from "../components/Field";
import { rules } from "../utils/validators";
import { useForgotPasswordMutation } from "../store/api/authApi";
import { getApiError } from "../store/api/baseApi";

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { email: "" } });

  const onSubmit = async (values) => {
    try {
      await forgotPassword(values).unwrap();
      // Backend jaan boojh kar nahi batata ke email mojood thi ya nahi
      setSent(true);
    } catch (error) {
      toast.error(getApiError(error, "Could not send the reset link"));
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <MailCheck className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Check your inbox</h1>
        <p className="mt-2 text-sm text-slate-600">
          If an account exists for that email, a password reset link is on its way. It expires in 1 hour
          and works only once.
        </p>
        <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-brand-600">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Forgot password</h1>
      <p className="mt-1 text-sm text-slate-500">
        Enter your email and we will send you a reset link.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <Field
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email}
          {...register("email", rules.email)}
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isLoading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Remembered it?{" "}
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Log in
        </Link>
      </p>
    </>
  );
}

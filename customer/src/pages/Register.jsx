import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { MailCheck } from "lucide-react";
import toast from "react-hot-toast";
import Field from "../components/Field";
import { rules } from "../utils/validators";
import { useRegisterMutation } from "../store/api/authApi";
import { getApiError } from "../store/api/baseApi";

export default function Register() {
  const [registeredEmail, setRegisteredEmail] = useState(null);
  const [signup, { isLoading }] = useRegisterMutation();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({ defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "" } });

  const onSubmit = async ({ confirmPassword, ...values }) => {
    try {
      // Khali phone bhejne se unique index takra jata hai (null bhi unique hota
      // hai jab field mojood ho), is liye khali ho to bhejte hi nahi
      const payload = { ...values };
      if (!payload.phone?.trim()) delete payload.phone;

      await signup(payload).unwrap();
      setRegisteredEmail(values.email);
    } catch (error) {
      toast.error(getApiError(error, "Could not create your account"));
    }
  };

  // Account ban gaya — backend ne verification email bhej diya hai
  if (registeredEmail) {
    return (
      <div className="text-center">
        <MailCheck className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Check your email</h1>
        <p className="mt-2 text-sm text-slate-600">
          We sent a verification link to <span className="font-semibold">{registeredEmail}</span>. Click it to
          activate your account, then log in.
        </p>
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
          The link expires in 24 hours. You cannot log in until your email is verified.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
      <p className="mt-1 text-sm text-slate-500">It takes less than a minute.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <Field
          label="Full name"
          placeholder="Ali Haider"
          autoComplete="name"
          error={errors.name}
          {...register("name", rules.name)}
        />
        <Field
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email}
          {...register("email", rules.email)}
        />
        <Field
          label="Phone"
          placeholder="03001234567"
          autoComplete="tel"
          // hint="Optional"
          error={errors.phone}
          {...register("phone", rules.phone)}
        />
        <Field
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          error={errors.password}
          {...register("password", rules.password)}
        />
        <Field
          label="Confirm password"
          type="password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          error={errors.confirmPassword}
          {...register("confirmPassword", rules.confirmPassword(getValues))}
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isLoading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Log in
        </Link>
      </p>
    </>
  );
}

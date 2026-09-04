import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import Field from "../components/Field";
import { rules } from "../utils/validators";
import { useLoginMutation } from "../store/api/authApi";
import { getApiError } from "../store/api/baseApi";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading }] = useLoginMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { email: "", password: "" } });

  const onSubmit = async (values) => {
    try {
      await login(values).unwrap();
      toast.success("Welcome back!");
      // RequireAuth ne jahan se bheja tha wahin wapis; warna home
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (error) {
      toast.error(getApiError(error, "Could not log in"));
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Log in</h1>
      <p className="mt-1 text-sm text-slate-500">Welcome back — pick up where you left off.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email}
          {...register("email", rules.email)}
        />

        <div>
          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={errors.password}
            {...register("password", rules.password)}
          />
          <Link to="/forgot-password" className="mt-2 inline-block text-xs font-medium text-brand-600 hover:text-brand-700">
            Forgot your password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isLoading ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        New here?{" "}
        <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
          Create an account
        </Link>
      </p>
    </>
  );
}

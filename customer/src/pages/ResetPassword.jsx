import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { XCircle } from "lucide-react";
import toast from "react-hot-toast";
import Field from "../components/Field";
import { rules } from "../utils/validators";
import { useResetPasswordMutation } from "../store/api/authApi";
import { baseApi, getApiError } from "../store/api/baseApi";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = params.get("token");
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  // Link expire hua ya pehle istemal ho chuka — ye sirf server bata sakta hai,
  // is liye us ka jawab yahan rakhte hain aur form ki jagah error screen
  // dikhate hain. Sirf toast dena kaafi nahi tha: user wohi mara hua link
  // baar baar submit karta rehta.
  const [linkError, setLinkError] = useState(null);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({ defaultValues: { password: "", confirmPassword: "" } });

  const onSubmit = async ({ password }) => {
    try {
      await resetPassword({ token, password }).unwrap();
      // Password badalne par server session cookie bhi hata deta hai. Cache
      // mein baitha purana user bhi jana chahiye, warna navbar logged-in
      // dikhata rehta hai aur GuestOnly /login se wapis home bhej deta hai.
      dispatch(baseApi.util.resetApiState());
      toast.success("Password updated — please log in");
      navigate("/login", { replace: true });
    } catch (error) {
      const message = getApiError(error, "Could not reset your password");
      // Backend token ke har masle par 400 deta hai; password ki length client
      // par pehle hi check ho chuki hoti hai, is liye 400 = link ka masla
      if (error?.status === 400) setLinkError(message);
      else toast.error(message);
    }
  };

  if (!token || linkError) {
    return (
      <div className="text-center">
        <XCircle className="mx-auto h-12 w-12 text-rose-500" />
        <h1 className="mt-4 text-xl font-bold text-slate-900">
          {linkError ? "This link no longer works" : "Missing reset token"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {linkError || "Open the reset link from your email, or request a new one."}
        </p>
        <Link
          to="/forgot-password"
          className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Request a new link
        </Link>
        <p className="mt-6 text-sm text-slate-500">
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Back to login
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Set a new password</h1>
      <p className="mt-1 text-sm text-slate-500">Choose something you have not used before.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <Field
          label="New password"
          type="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          error={errors.password}
          {...register("password", rules.password)}
        />
        <Field
          label="Confirm new password"
          type="password"
          placeholder="Re-enter your new password"
          autoComplete="new-password"
          error={errors.confirmPassword}
          {...register("confirmPassword", rules.confirmPassword(getValues))}
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isLoading ? "Updating..." : "Update password"}
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

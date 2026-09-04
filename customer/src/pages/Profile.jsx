import { useForm } from "react-hook-form";
import { User, Lock, ShieldCheck, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import Field from "../components/Field";
import Spinner from "../components/Spinner";
import { rules } from "../utils/validators";
import { useUpdateProfileMutation } from "../store/api/authApi";
import useAuthUser from "../hooks/useAuthUser";
import { getApiError } from "../store/api/baseApi";
import { formatDate } from "../utils/format";

export default function Profile() {
  const { user, isLoading } = useAuthUser();
  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation();

  const details = useForm({
    // RequireAuth ke andar hain, is liye user hamesha mojood hota hai
    values: {
      name: user?.name || "",
      phone: user?.phone || "",
      street: user?.address?.street || "",
      city: user?.address?.city || "",
      state: user?.address?.state || "",
      zip: user?.address?.zip || "",
      country: user?.address?.country || "",
    },
  });

  const passwordForm = useForm({ defaultValues: { password: "", confirmPassword: "" } });

  if (isLoading) return <Spinner label="Loading your profile..." />;

  const saveDetails = async (values) => {
    try {
      await updateProfile({
        id: user._id,
        name: values.name,
        // Khali phone bhejne se unique index takra sakta hai
        ...(values.phone?.trim() ? { phone: values.phone.trim() } : {}),
        address: {
          street: values.street,
          city: values.city,
          state: values.state,
          zip: values.zip,
          country: values.country,
        },
      }).unwrap();
      toast.success("Profile updated");
    } catch (error) {
      toast.error(getApiError(error, "Could not update your profile"));
    }
  };

  const savePassword = async ({ password }) => {
    try {
      await updateProfile({ id: user._id, password }).unwrap();
      passwordForm.reset({ password: "", confirmPassword: "" });
      toast.success("Password changed");
    } catch (error) {
      toast.error(getApiError(error, "Could not change your password"));
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">My profile</h1>

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
          {user.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-900">{user.name}</p>
          <p className="text-sm text-slate-500">{user.email}</p>
          <p className="mt-0.5 text-xs text-slate-400">Member since {formatDate(user.createdAt)}</p>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
            user.isEmailVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {user.isEmailVerified ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
          {user.isEmailVerified ? "Email verified" : "Email not verified"}
        </span>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <User size={15} className="text-brand-600" /> Personal details
        </h2>

        <form onSubmit={details.handleSubmit(saveDetails)} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
          <Field
            label="Full name"
            placeholder="Ali Haider"
            error={details.formState.errors.name}
            {...details.register("name", rules.name)}
          />
          <Field
            label="Phone"
            placeholder="03001234567"
            hint="Optional"
            error={details.formState.errors.phone}
            {...details.register("phone", rules.phone)}
          />

          <Field
            label="Email"
            defaultValue={user.email}
            readOnly
            disabled
            hint="Email cannot be changed"
            className="sm:col-span-2"
          />

          <p className="sm:col-span-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Default shipping address
          </p>

          <Field
            label="Street"
            className="sm:col-span-2"
            placeholder="House 12, Street 4, Gulshan"
            error={details.formState.errors.street}
            {...details.register("street")}
          />
          <Field
            label="City"
            placeholder="Karachi"
            error={details.formState.errors.city}
            {...details.register("city")}
          />
          <Field
            label="State"
            placeholder="Sindh"
            error={details.formState.errors.state}
            {...details.register("state")}
          />
          <Field label="ZIP" placeholder="75500" error={details.formState.errors.zip} {...details.register("zip")} />
          <Field
            label="Country"
            placeholder="Pakistan"
            error={details.formState.errors.country}
            {...details.register("country")}
          />

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:bg-slate-300"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Lock size={15} className="text-brand-600" /> Change password
        </h2>

        <form
          onSubmit={passwordForm.handleSubmit(savePassword)}
          className="mt-4 grid gap-4 sm:grid-cols-2"
          noValidate
        >
          <Field
            label="New password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            error={passwordForm.formState.errors.password}
            {...passwordForm.register("password", rules.password)}
          />
          <Field
            label="Confirm new password"
            type="password"
            placeholder="Re-enter your new password"
            autoComplete="new-password"
            error={passwordForm.formState.errors.confirmPassword}
            {...passwordForm.register("confirmPassword", rules.confirmPassword(passwordForm.getValues))}
          />

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Update password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

/**
 * react-hook-form ke rules ek jagah, taake har form mein same validation
 * aur same error message rahe — aur backend ke rules se match karen
 * (password minlength 6, email regex, etc.).
 */
export const rules = {
  name: {
    required: "Name is required",
    minLength: { value: 2, message: "Name must be at least 2 characters" },
  },
  email: {
    required: "Email is required",
    pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email address" },
  },
  password: {
    required: "Password is required",
    minLength: { value: 8, message: "Password must be at least 8 characters" },
  },
  // Optional field. Sirf itna dekhte hain ke kaafi digits hain — format par
  // sakhti nahi, kyunke asli numbers mein extensions ("x064"), country codes
  // aur brackets sab aate hain, aur backend bhi koi format enforce nahi karta.
  phone: {
    validate: (value) => {
      if (!value?.trim()) return true;
      const digits = value.replace(/\D/g, "");
      return digits.length >= 7 || "Enter a valid phone number (at least 7 digits)";
    },
  },
  required: (label) => ({ required: `${label} is required` }),
  confirmPassword: (getValues) => ({
    required: "Confirm your password",
    validate: (value) => value === getValues("password") || "Passwords do not match",
  }),
};

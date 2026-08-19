import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.06)] ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-base font-semibold">{children}</h2>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
};

export function Button({
  variant = "primary",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-opacity disabled:opacity-50";
  const variants = {
    primary: "bg-button text-button-text",
    secondary: "border border-border-subtle bg-transparent text-foreground",
    danger: "border border-border-subtle bg-transparent text-danger",
  } as const;

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading ? <Spinner small /> : null}
      {children}
    </button>
  );
}

export function Spinner({ small = false }: { small?: boolean }) {
  const size = small ? "h-4 w-4" : "h-8 w-8";
  return (
    <span
      role="status"
      aria-label="در حال بارگذاری"
      className={`${size} inline-block animate-spin rounded-full border-2 border-current border-t-transparent opacity-70`}
    />
  );
}

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      {error ? (
        <p className="mt-1 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const controlClasses =
  "w-full rounded-xl border border-border-subtle bg-background px-3 py-2.5 text-foreground outline-none focus:border-link";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`${controlClasses} ${className}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return <textarea {...rest} className={`${controlClasses} ${className}`} />;
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "info" | "success";
  children: ReactNode;
}) {
  const tones = {
    error: "border-danger/40 text-danger",
    info: "border-border-subtle text-muted",
    success: "border-link/40 text-link",
  } as const;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mb-4 rounded-xl border px-3 py-2.5 text-sm ${tones[tone]}`}
    >
      {children}
    </div>
  );
}

/** Full-screen loading state for the Mini App shell. */
export function LoadingScreen({ message = "در حال بارگذاری…" }: { message?: string }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-muted">
      <Spinner />
      <p className="text-sm">{message}</p>
    </div>
  );
}

/** Full-screen error state with a retry affordance. */
export function ErrorScreen({
  title = "مشکلی پیش آمد",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm text-muted">{message}</p>
      {onRetry ? (
        <div className="w-full max-w-xs">
          <Button onClick={onRetry}>تلاش دوباره</Button>
        </div>
      ) : null}
    </div>
  );
}

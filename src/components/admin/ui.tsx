import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

/**
 * Admin UI kit.
 *
 * Deliberately separate from the Mini App kit: the admin panel is a desktop
 * staff tool on a neutral palette, not a Telegram WebView that has to follow
 * `themeParams`.
 */

export function AdminCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-zinc-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </section>
  );
}

export function AdminHeading({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 text-lg font-bold text-zinc-900">{children}</h2>;
}

type AdminButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
};

export function AdminButton({
  variant = "primary",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: AdminButtonProps) {
  const variants = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800",
    secondary: "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50",
    danger: "border border-red-300 bg-white text-red-700 hover:bg-red-50",
  } as const;

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {loading ? <AdminSpinner /> : null}
      {children}
    </button>
  );
}

export function AdminSpinner() {
  return (
    <span
      role="status"
      aria-label="در حال پردازش"
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
    />
  );
}

export function AdminField({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-zinc-800">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
      {error ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const control =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 disabled:bg-zinc-100";

export function AdminInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`${control} ${className}`} />;
}

export function AdminTextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return <textarea {...rest} className={`${control} ${className}`} />;
}

export function AdminSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return <select {...rest} className={`${control} ${className}`} />;
}

export function AdminAlert({
  tone = "error",
  children,
}: {
  tone?: "error" | "info" | "success";
  children: ReactNode;
}) {
  const tones = {
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-zinc-200 bg-zinc-50 text-zinc-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  } as const;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mb-4 rounded-lg border px-3 py-2.5 text-sm ${tones[tone]}`}
    >
      {children}
    </div>
  );
}

export function StatusBadge({ status, isCurrent }: { status: string; isCurrent?: boolean }) {
  const labels: Record<string, string> = {
    DRAFT: "پیش‌نویس",
    PUBLISHED: "منتشرشده",
    ARCHIVED: "بایگانی",
  };
  const tones: Record<string, string> = {
    DRAFT: "bg-amber-100 text-amber-800",
    PUBLISHED: "bg-emerald-100 text-emerald-800",
    ARCHIVED: "bg-zinc-200 text-zinc-700",
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${tones[status] ?? "bg-zinc-100 text-zinc-700"}`}
      >
        {labels[status] ?? status}
      </span>
      {isCurrent ? (
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
          شماره جاری
        </span>
      ) : null}
    </span>
  );
}

// Small styled primitives. Feature components compose these and the design
// tokens in styles.css; keep visual decisions here.
import { type ButtonHTMLAttributes, type ReactNode, type SelectHTMLAttributes, useId } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Card({
  title,
  icon,
  action,
  children,
  className,
}: {
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("rounded-xl border border-line bg-surface p-4 shadow-card", className)}>
      {title && (
        <header className="mb-3 flex items-center gap-2">
          {icon && <span className="text-muted [&>svg]:size-4">{icon}</span>}
          <h2 className="text-[13px] font-semibold tracking-wide text-muted uppercase">{title}</h2>
          <div className="ml-auto">{action}</div>
        </header>
      )}
      {children}
    </section>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost";

export function Button({
  variant = "secondary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium",
        "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:size-4",
        variant === "primary" && "bg-accent text-accent-fg hover:brightness-110",
        variant === "secondary" && "border border-line bg-surface-2 hover:bg-line/60",
        variant === "ghost" && "text-muted hover:bg-surface-2 hover:text-fg",
        className,
      )}
      {...props}
    />
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cx(
        "flex cursor-pointer items-start gap-3 py-1.5",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden
        className={cx(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
          checked ? "bg-accent" : "bg-line",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-4",
          )}
        />
      </span>
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled,
}: {
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
}) {
  // Real radio inputs: native arrow-key navigation and screen reader semantics.
  const name = useId();
  return (
    <fieldset
      disabled={disabled}
      className={cx(
        "inline-flex rounded-lg border border-line bg-surface-2 p-0.5",
        disabled && "opacity-50",
      )}
    >
      <legend className="sr-only">{label}</legend>
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="peer sr-only"
          />
          <span
            className={cx(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors [&>svg]:size-4",
              "peer-focus-visible:outline-2 peer-focus-visible:outline-accent",
              value === o.value ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
            )}
          >
            {o.icon}
            {o.label}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        "rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-sm",
        "focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent";

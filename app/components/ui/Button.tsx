import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "ghost" | "accent" | "destructive" | "subtle";
type Size = "sm" | "md" | "lg";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  iconPosition?: "left" | "right";
}

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

const VARIANTS: Record<Variant, string> = {
  primary: "clay-btn clay-btn-primary",
  ghost: "clay-btn clay-btn-ghost",
  accent: "clay-btn clay-btn-accent",
  destructive: "clay-btn clay-btn-destructive",
  subtle: "rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors",
};

const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    icon: Icon,
    iconPosition = "left",
    children,
    className = "",
    disabled,
    style,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      style={style}
      className={`${VARIANTS[variant]} ${SIZES[size]} inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none whitespace-nowrap ${className}`}
      {...rest}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
      {!loading && Icon && iconPosition === "left" && (
        <Icon className="w-3.5 h-3.5 shrink-0" />
      )}
      {children && <span>{children}</span>}
      {!loading && Icon && iconPosition === "right" && (
        <Icon className="w-3.5 h-3.5 shrink-0" />
      )}
    </button>
  );
});

export default Button;

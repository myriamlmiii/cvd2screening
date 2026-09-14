import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded font-medium transition duration-fast disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cvd active:scale-[0.98] active:translate-y-px",
  {
    variants: {
      variant: {
        primary: "bg-cvd text-white hover:bg-[#1d4c42]",
        secondary: "border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-2",
        ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
      },
      size: {
        xs: "h-6 px-2 text-[10px]",
        sm: "h-8 px-3 text-body-sm",
        md: "h-9 px-4 text-body-sm",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(button({ variant, size }), className)} {...props} />;
}

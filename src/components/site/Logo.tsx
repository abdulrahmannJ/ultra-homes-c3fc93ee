import { cn } from "@/lib/utils";

const logoUrl = "/images/logoo.jpg";

export const LOGO_URL = logoUrl;

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="Universal Golden Homes logo"
      className={cn("h-10 w-10 rounded-sm object-contain", className)}
    />
  );
}

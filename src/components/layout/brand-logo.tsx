import Link from "next/link";

export function BrandLogo({
  href = "/home",
  size = "md",
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  };
  return (
    <Link
      href={href}
      className={`font-semibold tracking-tight ${sizes[size]} inline-flex items-center gap-0.5`}
    >
      <span className="text-[#0A84FF]">Ammo</span>
      <span className="text-[#1D1D1F] dark:text-[#F5F5F7]">Biz</span>
    </Link>
  );
}
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#0A0A0A] lg:grid lg:grid-cols-2">
      {/* Brand panel — hidden di mobile */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-[#EAF2FB] via-[#F4F7FB] to-[#EAF2FB]">
        <div className="text-2xl font-semibold tracking-tight">
          <span className="text-[#0A84FF]">Ammo</span>
          <span className="text-[#1D1D1F]">Biz</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-semibold leading-tight">
            Smarter Operations
            <br />
            for a Brighter Tomorrow
          </h1>
          <p className="mt-4 text-[#6E6E73]">
            Unify your data, people, and processes in one secure platform
            built for growth.
          </p>
        </div>

        <div className="text-sm text-[#6E6E73]">
          AmmoBiz · People | Data | Progress
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col min-h-screen lg:min-h-0">
        <div className="lg:hidden pt-10 pb-6 flex justify-center">
          <div className="text-2xl font-semibold tracking-tight">
            <span className="text-[#0A84FF]">Ammo</span>
            <span className="text-[#1D1D1F]">Biz</span>
          </div>
        </div>

        <div className="flex-1 flex items-start lg:items-center justify-center px-6 pb-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
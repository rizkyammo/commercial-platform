export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-[#EAF2FB] via-[#F4F7FB] to-[#EAF2FB]">
        <div>
          <div className="text-2xl font-semibold tracking-tight">
  <span className="text-[#0A84FF]">Ammo</span>
  <span className="text-[#1D1D1F] dark:text-[#F5F5F7]">Biz</span>
</div>
        </div>
        <div className="max-w-md">
          <h1 className="text-4xl font-semibold leading-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
            Smarter Operations
            <br />
            for a Brighter Tomorrow
          </h1>
          <p className="mt-4 text-[#6E6E73] dark:text-[#8E8E93]">
            Unify your data, people, and processes in one secure platform built for growth.
          </p>
        </div>
        <div className="text-sm text-[#6E6E73] dark:text-[#8E8E93]">People | Data | Progress</div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-8 bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E]">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
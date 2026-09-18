"use client";

import { useTheme, type Theme } from "@/lib/theme/theme-provider";

export function AppearanceForm() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Appearance</h2>
        <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93] dark:text-[#8E8E93] mt-1">
          Customize how the interface looks.
        </p>
      </div>

      {/* Theme */}
      <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Theme</h3>
          <span className="text-xs text-[#8E8E93]">
            Currently: <strong>{resolvedTheme}</strong>
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg">
          {(
            [
              {
                key: "light" as Theme,
                label: "Light",
                preview: (
                  <div className="w-full h-16 rounded-lg mb-2 bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] relative overflow-hidden">
                    <div className="absolute top-2 left-2 right-2 h-1.5 rounded bg-[#E5E5EA]" />
                    <div className="absolute top-5 left-2 w-1/2 h-1 rounded bg-[#F2F2F4]" />
                    <div className="absolute top-7 left-2 w-2/3 h-1 rounded bg-[#F2F2F4]" />
                  </div>
                ),
              },
              {
                key: "dark" as Theme,
                label: "Dark",
                preview: (
                  <div className="w-full h-16 rounded-lg mb-2 bg-[#1C1C1E] border border-[#2C2C2E] relative overflow-hidden">
                    <div className="absolute top-2 left-2 right-2 h-1.5 rounded bg-[#2C2C2E]" />
                    <div className="absolute top-5 left-2 w-1/2 h-1 rounded bg-[#3A3A3C]" />
                    <div className="absolute top-7 left-2 w-2/3 h-1 rounded bg-[#3A3A3C]" />
                  </div>
                ),
              },
              {
                key: "system" as Theme,
                label: "System",
                preview: (
                  <div className="w-full h-16 rounded-lg mb-2 relative overflow-hidden border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] dark:border-[#2C2C2E] flex">
                    <div className="w-1/2 h-full bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] relative">
                      <div className="absolute top-2 left-2 right-2 h-1.5 rounded bg-[#E5E5EA]" />
                      <div className="absolute top-5 left-2 w-1/2 h-1 rounded bg-[#F2F2F4]" />
                    </div>
                    <div className="w-1/2 h-full bg-[#1C1C1E] relative">
                      <div className="absolute top-2 left-2 right-2 h-1.5 rounded bg-[#2C2C2E]" />
                      <div className="absolute top-5 left-2 w-1/2 h-1 rounded bg-[#3A3A3C]" />
                    </div>
                  </div>
                ),
              },
            ] as const
          ).map((t) => {
            const active = theme === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTheme(t.key)}
                className={`border-2 rounded-xl p-3 transition text-left ${
                  active
                    ? "border-[#0A84FF] bg-[#EAF2FB] dark:bg-[#0A84FF]/10"
                    : "border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] dark:border-[#2C2C2E] hover:border-[#0A84FF]/50"
                }`}
              >
                {t.preview}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t.label}</span>
                  {active && (
                    <svg
                      className="w-4 h-4 text-[#0A84FF]"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M8.5 13.5l-3-3 1.4-1.4 1.6 1.6 4.6-4.6L14.5 7.5z" />
                      <circle
                        cx="10"
                        cy="10"
                        r="8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-[#8E8E93]">
          Your choice is saved automatically and applies immediately.
        </p>
      </div>
    </div>
  );
}
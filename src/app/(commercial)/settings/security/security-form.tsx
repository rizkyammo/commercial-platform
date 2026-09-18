"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function SecurityForm({
  email,
  lastLogin,
  recentActivity,
}: {
  email: string;
  lastLogin: string | null;
  recentActivity: {
    action: string;
    module: string;
    created_at: string;
    result: string;
  }[];
}) {
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [loginNotify, setLoginNotify] = useState(true);
  const [restrictIP, setRestrictIP] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Security</h2>
        <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93] mt-1">
          Keep your account safe and secure.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-4">
          {/* Password */}
          <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EAF2FB] flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 20 20" fill="none" stroke="#0A84FF" strokeWidth="1.6" className="w-5 h-5">
                    <rect x="4" y="9" width="12" height="8" rx="2" />
                    <path d="M7 9V6a3 3 0 016 0v3" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">Password</div>
                  <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                    Use a strong password to protect your account.
                  </div>
                </div>
              </div>
              <Button variant="secondary" size="sm">Change Password</Button>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
              <div>
                <div className="text-[#6E6E73] dark:text-[#8E8E93]">Last changed</div>
                <div className="mt-0.5">3 months ago</div>
              </div>
              <div>
                <div className="text-[#6E6E73] dark:text-[#8E8E93]">Password strength</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-[#F2F2F4] rounded-full overflow-hidden">
                    <div className="h-full w-[85%] bg-[#34C759]" />
                  </div>
                  <span className="text-[#34C759] font-medium">Strong</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2FA */}
          <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EAF2FB] flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 20 20" fill="none" stroke="#0A84FF" strokeWidth="1.6" className="w-5 h-5">
                    <path d="M10 3l6 2v5c0 3.5-2.5 6-6 7-3.5-1-6-3.5-6-7V5z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    Two-Factor Authentication (2FA)
                    {twoFAEnabled ? (
                      <Badge tone="green">Enabled</Badge>
                    ) : (
                      <Badge tone="orange">Disabled</Badge>
                    )}
                  </div>
                  <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                    Add an extra layer of security to your account.
                  </div>
                </div>
              </div>
              <Button
                variant={twoFAEnabled ? "secondary" : "primary"}
                size="sm"
                onClick={() => setTwoFAEnabled(!twoFAEnabled)}
              >
                {twoFAEnabled ? "Manage" : "Enable"}
              </Button>
            </div>
          </div>

          {/* Login & Access */}
          <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#EAF2FB] flex items-center justify-center shrink-0">
                <svg viewBox="0 0 20 20" fill="none" stroke="#0A84FF" strokeWidth="1.6" className="w-5 h-5">
                  <rect x="3" y="5" width="14" height="10" rx="2" />
                  <path d="M7 15v2h6v-2" />
                </svg>
              </div>
              <div>
                <div className="font-medium">Login & Access</div>
                <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                  Manage your login preferences and session settings.
                </div>
              </div>
            </div>

            <div className="space-y-3 pl-13">
              <ToggleRow
                label="Login Notifications"
                hint="Get notified when there is a new login to your account."
                value={loginNotify}
                onChange={setLoginNotify}
              />
              <ToggleRow
                label="Restrict Access by IP"
                hint="Limit access to specific IP addresses or ranges."
                value={restrictIP}
                onChange={setRestrictIP}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Recent Activity */}
          <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold text-sm">Recent Activity</div>
              <a className="text-xs text-[#0A84FF] hover:underline" href="/admin/audit-log">
                View all →
              </a>
            </div>
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <div className="text-xs text-[#6E6E73] dark:text-[#8E8E93] text-center py-4">
                  Belum ada aktivitas.
                </div>
              ) : (
                recentActivity.map((a, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[#1D1D1F] dark:text-[#F5F5F7] font-medium truncate">
                        {a.action}
                      </div>
                      <div className="text-[10px] text-[#8E8E93] mt-0.5">
                        {new Date(a.created_at).toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Session */}
          <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-5">
            <div className="font-semibold text-sm mb-3">Your Session</div>
            <div className="text-xs space-y-2">
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4 text-[#6E6E73] dark:text-[#8E8E93]">
                  <rect x="3" y="5" width="14" height="10" rx="2" />
                </svg>
                <div className="flex-1">
                  <div className="font-medium">Current Session</div>
                  <div className="text-[#8E8E93] text-[10px]">
                    {email} · Chrome on Windows
                  </div>
                </div>
                <Badge tone="green">Active</Badge>
              </div>
            </div>
            <Button variant="secondary" size="sm" className="w-full mt-4">
              Log out from all devices
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-[#8E8E93] mt-0.5">{hint}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition relative shrink-0 ${
          value ? "bg-[#34C759]" : "bg-[#E5E5EA]"
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] shadow transition-all ${
            value ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
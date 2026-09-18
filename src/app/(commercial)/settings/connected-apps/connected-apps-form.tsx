"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const APPS = [
  { key: "microsoft", name: "Microsoft 365", desc: "Sign in with Microsoft", icon: "M" },
  { key: "google", name: "Google Workspace", desc: "Connect Google calendar & email", icon: "G" },
  { key: "slack", name: "Slack", desc: "Send notifications to Slack", icon: "S" },
];

export function ConnectedAppsForm() {
  const [connected, setConnected] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Connected Apps</h2>
        <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93] mt-1">
          Manage third-party apps connected to your account.
        </p>
      </div>

      <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl divide-y divide-[#F2F2F4]">
        {APPS.map((app) => {
          const isConnected = connected[app.key];
          return (
            <div key={app.key} className="px-6 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#F2F2F4] flex items-center justify-center font-semibold shrink-0">
                {app.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{app.name}</div>
                <div className="text-xs text-[#8E8E93] mt-0.5">{app.desc}</div>
              </div>
              <Button
                variant={isConnected ? "secondary" : "primary"}
                size="sm"
                onClick={() =>
                  setConnected((prev) => ({
                    ...prev,
                    [app.key]: !prev[app.key],
                  }))
                }
              >
                {isConnected ? "Disconnect" : "Connect"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AccountForm() {
  const [dangerOpen, setDangerOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Account</h2>
        <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93] mt-1">
          Manage your account details.
        </p>
      </div>

      {/* Change Password */}
      <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-6">
        <h3 className="font-semibold mb-4">Change Password</h3>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Current Password
            </label>
            <Input type="password" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              New Password
            </label>
            <Input type="password" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Confirm New Password
            </label>
            <Input type="password" />
          </div>
          <Button>Update Password</Button>
        </div>
      </div>

      {/* Email */}
      <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-6">
        <h3 className="font-semibold mb-4">Email Address</h3>
        <div className="text-sm space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[#1D1D1F] dark:text-[#F5F5F7]">Email</div>
              <div className="text-xs text-[#8E8E93]">
                Used for login and notifications
              </div>
            </div>
            <Button variant="secondary" size="sm">
              Change Email
            </Button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-xl p-6">
        <h3 className="font-semibold text-[#B71C1C] mb-2">Danger Zone</h3>
        <p className="text-sm text-[#B71C1C]/80 mb-4">
          Setelah akun dihapus, semua data tidak dapat dikembalikan.
        </p>
        <Button
          variant="danger"
          onClick={() => setDangerOpen(!dangerOpen)}
        >
          Delete Account
        </Button>
        {dangerOpen && (
          <div className="mt-4 text-sm bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#FF3B30]/30 rounded-lg p-4">
            <div className="text-[#B71C1C] font-medium mb-2">
              Yakin ingin menghapus akun?
            </div>
            <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mb-3">
              Hubungi administrator untuk menghapus akun Anda.
            </p>
            <Button variant="secondary" size="sm" onClick={() => setDangerOpen(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function LanguageForm() {
  const [language, setLanguage] = useState("en-US");
  const [timezone, setTimezone] = useState("Asia/Jakarta");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Language & Region</h2>
        <p className="text-sm text-[#6E6E73] dark:text-[#8E8E93] mt-1">
          Set your preferred language and timezone.
        </p>
      </div>

      <div className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-6 space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-1.5">Language</label>
          <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="en-US">English (US)</option>
            <option value="id-ID">Bahasa Indonesia</option>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Time Zone</label>
          <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            <option value="Asia/Jakarta">(UTC+7) Jakarta</option>
            <option value="Asia/Makassar">(UTC+8) Makassar</option>
            <option value="Asia/Jayapura">(UTC+9) Jayapura</option>
            <option value="Asia/Singapore">(UTC+8) Singapore</option>
          </Select>
        </div>
        <Button>Save Preferences</Button>
      </div>
    </div>
  );
}
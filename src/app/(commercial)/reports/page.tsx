import { PageHeader } from "@/components/ui/page-header";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generate and download commercial reports."
      />
      <ReportsClient />
    </div>
  );
}
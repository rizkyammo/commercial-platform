import { PageHeader } from "@/components/ui/page-header";
import { SkForm } from "../sk-form";

export default function NewSkPage() {
  return (
    <div>
      <PageHeader title="New SK Kemhan" description="Buat draft otorisasi baru." />
      <SkForm />
    </div>
  );
}
import { listProjectSummaries } from "@/features/invoicing/queries";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectsClient } from "./projects-client";

const PAGE_SIZE = 20;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const q = params.q ?? "";

  const { data, count } = await listProjectSummaries({
    q,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Kumpulan order lintas customer dalam satu project code — untuk melihat total porsi PT DAN."
      />
      <ProjectsClient
        rows={data}
        total={count}
        page={page}
        totalPages={totalPages}
        q={q}
      />
    </div>
  );
}
import { notFound } from "next/navigation";
import {
  getMigrationBatch,
  listStagingRows,
  listBatchLogs,
} from "@/features/migration/queries";
import { PageHeader } from "@/components/ui/page-header";
import { BatchDetailClient } from "./batch-detail-client";

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batch = await getMigrationBatch(id);
  if (!batch) notFound();

  const [rows, logs] = await Promise.all([
    listStagingRows(id, 500),
    listBatchLogs(id),
  ]);

  return (
    <div>
      <PageHeader
        title={batch.name}
        description={`${batch.entity_type} · ${batch.row_count.toLocaleString("id-ID")} baris · ${batch.file_name ?? ""}`}
      />
      <BatchDetailClient batch={batch} rows={rows} logs={logs} />
    </div>
  );
}
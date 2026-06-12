import TransaksiPageClient from "./components/TransaksiPageClient";
import {
  getTransactionsList,
  getTransactionsSummary,
} from "@/lib/transactions/transactions";

export const metadata = {
  title: "Transaksi | Sistem Pengurusan Kuarters",
};

export const dynamic = "force-dynamic";

export default async function TransaksiPage() {
  const [listResult, summary] = await Promise.all([
    getTransactionsList({ page: 1, limit: 10 }),
    getTransactionsSummary(),
  ]);

  return (
    <TransaksiPageClient
      initialData={JSON.parse(JSON.stringify(listResult.data))}
      initialSummary={summary}
      initialTotalItems={listResult.total}
    />
  );
}

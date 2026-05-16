import TransaksiPageClient from "./components/TransaksiPageClient";

export const metadata = {
  title: "Transaksi | Sistem Pengurusan Kuarters",
};

export default function TransaksiPage() {
  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      <div className="px-8 py-6 max-w-400 w-full mx-auto space-y-6">
        
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-dark-blue">Transaksi</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Halaman ini memaparkan rekod transaksi kewangan bagi setiap penghuni kuarters mengikut peraturan perakaunan yang ditetapkan.
          </p>
        </div>

        {/* Main Client Coordinator */}
        <TransaksiPageClient />

      </div>
    </div>
  );
}
import { Suspense } from "react";
import TunggakanPageClient from "./components/ArrearsPageClient";

export default function TunggakanPage() {
  return (
    <main className="min-h-screen p-8">
      <Suspense fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-dark-blue" />
        </div>
      }>
        <TunggakanPageClient />
      </Suspense>
    </main>
  );
}
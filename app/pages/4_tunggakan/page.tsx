import { Suspense } from "react";
import TunggakanPageClient from "./components/ArrearsPageClient";

export default function TunggakanPage() {
  return (
    <Suspense>
      <TunggakanPageClient />
    </Suspense>
  );
}
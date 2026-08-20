import { Suspense } from "react";

import { ArchivePanel } from "@/components/miniapp/ArchivePanel";
import { LoadingScreen } from "@/components/miniapp/ui";

export const dynamic = "force-dynamic";

/** Archive (REQ-012 / REQ-013). `useSearchParams` needs the Suspense boundary. */
export default function ArchivePage() {
  return (
    <Suspense fallback={<LoadingScreen message="در حال بارگذاری آرشیو…" />}>
      <ArchivePanel />
    </Suspense>
  );
}

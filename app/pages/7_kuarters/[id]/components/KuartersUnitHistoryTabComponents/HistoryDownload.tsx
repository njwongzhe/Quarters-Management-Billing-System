"use client";

import { commonIcons } from "@/app/components/Icon/Icon";
import ToolbarButton from "@/app/components/ToolbarIconButton";
import { downloadQuarterUnitOccupancyHistory } from "@/app/pages/7_kuarters/hooks/kuartersDownloads";

import type { QuarterUnitOccupancyDetails } from "@/lib/quarters/quarter-units";

type HistoryDownloadProps = {
  unitCode: string;
  records: QuarterUnitOccupancyDetails[];
};

export default function HistoryDownload({ unitCode, records }: HistoryDownloadProps) {
  return (
    <ToolbarButton
      icon={commonIcons.download}
      label="Muat turun sejarah penghunian"
      onClick={() => downloadQuarterUnitOccupancyHistory(unitCode, records)}
    />
  );
}

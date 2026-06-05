"use client";

import { commonIcons } from "@/app/components/Icon/Icon";
import ToolbarIconButton from "@/app/components/ToolbarIconButton";

type TransaksiDownloadProps = {
  disabled: boolean;
  isExporting: boolean;
  onExport: () => void;
};

export default function TransaksiDownload({
  disabled,
  isExporting,
  onExport,
}: TransaksiDownloadProps) {
  return (
    <ToolbarIconButton
      icon={commonIcons.download}
      label="Muat turun rekod transaksi"
      disabled={disabled}
      isActive={isExporting}
      onClick={onExport}
    />
  );
}
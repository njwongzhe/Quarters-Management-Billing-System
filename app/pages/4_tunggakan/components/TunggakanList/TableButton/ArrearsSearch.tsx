"use client";

import ToolbarIconButton from "@/app/components/ToolbarIconButton";

type ArrearsSearchProps = {
  value: string;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function ArrearsSearch({ value, isOpen, setIsOpen }: ArrearsSearchProps) {
  const isSearchActive = value.trim().length > 0;

  return (
    <ToolbarIconButton
      icon="search"
      label="Cari penghuni tunggakan"
      isActive={isOpen || isSearchActive}
      isExpanded={isOpen}
      onClick={() => setIsOpen((currentState) => !currentState)}
    />
  );
}
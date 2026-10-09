import {
  File,
  FileBraces,
  FileCode,
  FileCog,
  FileSpreadsheet,
  FileText,
  type LucideIcon,
} from "lucide-react";

/** 涵蓋 UPLOAD_RULES.file 允許的副檔名；不在清單中的退回一般檔案圖示 */
const ICONS_BY_EXTENSION: Record<string, LucideIcon> = {
  pdf: FileText,
  txt: FileText,
  md: FileText,
  json: FileBraces,
  xml: FileCode,
  csv: FileSpreadsheet,
  yaml: FileCog,
  yml: FileCog,
  toml: FileCog,
  ini: FileCog,
};

export function getFileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  // 沒有點或以點開頭（.env 這類隱藏檔）時視為沒有副檔名
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

export function getFileIcon(fileName: string): LucideIcon {
  return ICONS_BY_EXTENSION[getFileExtension(fileName)] ?? File;
}

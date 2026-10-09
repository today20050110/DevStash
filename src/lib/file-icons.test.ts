import {
  File,
  FileBraces,
  FileCog,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { describe, expect, it } from "vitest";

import { getFileExtension, getFileIcon } from "@/lib/file-icons";

describe("getFileExtension", () => {
  it("取最後一個點之後的部分並轉小寫", () => {
    expect(getFileExtension("Report.Final.PDF")).toBe("pdf");
  });

  it("沒有副檔名或是隱藏檔時回傳空字串", () => {
    expect(getFileExtension("README")).toBe("");
    expect(getFileExtension(".env")).toBe("");
  });
});

describe("getFileIcon", () => {
  it("依副檔名選擇圖示", () => {
    expect(getFileIcon("notes.md")).toBe(FileText);
    expect(getFileIcon("data.JSON")).toBe(FileBraces);
    expect(getFileIcon("table.csv")).toBe(FileSpreadsheet);
    expect(getFileIcon("config.yml")).toBe(FileCog);
  });

  it("不認得的副檔名退回一般檔案圖示", () => {
    expect(getFileIcon("archive.zip")).toBe(File);
    expect(getFileIcon("file")).toBe(File);
  });
});

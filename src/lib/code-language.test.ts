import { describe, expect, it } from "vitest";

import {
  getEditorLanguage,
  LANGUAGE_OPTIONS,
  toLanguageOptionValue,
  toMonacoLanguage,
} from "@/lib/code-language";

describe("toMonacoLanguage", () => {
  it.each([
    ["typescript", "typescript"],
    ["ts", "typescript"],
    ["TSX", "typescript"],
    ["  bash ", "shell"],
    ["zsh", "shell"],
    ["py", "python"],
    ["yml", "yaml"],
    ["c#", "csharp"],
    ["dockerfile", "dockerfile"],
    ["postgres", "pgsql"],
    ["json", "javascript"],
  ])("%s → %s", (input, expected) => {
    expect(toMonacoLanguage(input)).toBe(expected);
  });

  it("不認得的語言以純文字顯示", () => {
    expect(toMonacoLanguage("brainfuck")).toBe("plaintext");
  });

  it("空白或沒有值時用 fallback", () => {
    expect(toMonacoLanguage(null)).toBe("plaintext");
    expect(toMonacoLanguage("  ", "shell")).toBe("shell");
  });
});

describe("getEditorLanguage", () => {
  it("commands 沒填語言時預設 shell，snippets 為純文字", () => {
    expect(getEditorLanguage("commands", "")).toBe("shell");
    expect(getEditorLanguage("snippets", null)).toBe("plaintext");
  });

  it("有填語言時以填的為準", () => {
    expect(getEditorLanguage("commands", "powershell")).toBe("powershell");
  });
});

describe("toLanguageOptionValue", () => {
  it.each([
    ["typescript", "typescript"],
    ["  Python ", "python"],
    ["ts", "typescript"],
    ["bash", "shell"],
    ["json", "json"],
  ])("%s → %s", (input, expected) => {
    expect(toLanguageOptionValue(input)).toBe(expected);
  });

  it("空白或沒有值時回傳空字串，選單顯示 placeholder", () => {
    expect(toLanguageOptionValue("")).toBe("");
    expect(toLanguageOptionValue("  ")).toBe("");
    expect(toLanguageOptionValue(null)).toBe("");
  });

  it("不認得的語言原樣保留（trim 後），不被換成 plaintext", () => {
    expect(toLanguageOptionValue(" Elixir ")).toBe("Elixir");
  });
});

describe("LANGUAGE_OPTIONS", () => {
  it("每個選項都能被編輯器上色，且值不重複", () => {
    const values = LANGUAGE_OPTIONS.map((option) => option.value);
    expect(new Set(values).size).toBe(values.length);
    for (const value of values.filter((value) => value !== "plaintext")) {
      expect(toMonacoLanguage(value)).not.toBe("plaintext");
    }
  });

  it("依顯示名稱排序", () => {
    const labels = LANGUAGE_OPTIONS.map((option) => option.label);
    expect(labels).toEqual(
      [...labels].sort((a, b) => a.localeCompare(b)),
    );
  });
});

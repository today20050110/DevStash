import { describe, expect, it } from "vitest";

import { getEditorLanguage, toMonacoLanguage } from "@/lib/code-language";

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

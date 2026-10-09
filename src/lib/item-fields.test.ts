import { describe, expect, it } from "vitest";

import { getItemTypeFields } from "@/lib/item-fields";

describe("getItemTypeFields", () => {
  it("notes and prompts use the Markdown editor", () => {
    for (const slug of ["notes", "prompts"]) {
      expect(getItemTypeFields({ kind: "TEXT", slug })).toEqual({
        content: true,
        language: false,
        markdown: true,
        url: false,
        file: false,
      });
    }
  });

  it("snippets and commands keep the code editor, not Markdown", () => {
    for (const slug of ["snippets", "commands"]) {
      const fields = getItemTypeFields({ kind: "TEXT", slug });
      expect(fields.language).toBe(true);
      expect(fields.markdown).toBe(false);
    }
  });

  it("other TEXT types (e.g. custom types) fall back to a plain textarea", () => {
    expect(getItemTypeFields({ kind: "TEXT", slug: "recipes" })).toMatchObject({
      content: true,
      language: false,
      markdown: false,
    });
  });

  it("never enables Markdown without a content field", () => {
    expect(getItemTypeFields({ kind: "URL", slug: "notes" })).toEqual({
      content: false,
      language: false,
      markdown: false,
      url: true,
      file: false,
    });
  });

  it("FILE kind only has the file field", () => {
    expect(getItemTypeFields({ kind: "FILE", slug: "images" })).toEqual({
      content: false,
      language: false,
      markdown: false,
      url: false,
      file: true,
    });
  });
});

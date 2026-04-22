import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeSkillKey, normalizeName } from "../scripts/lib/skillKey.js";

describe("skillKey", () => {
  it("normalizes names", () => {
    assert.equal(normalizeName("  Foo  Bar  "), "foo bar");
  });

  it("is deterministic for same file + name", () => {
    const md = `---
name: my-skill
description: Test
---
# Body
`;
    const a = computeSkillKey(md, "my-skill");
    const b = computeSkillKey(md, "my-skill");
    assert.equal(a, b);
  });

  it("changes when body changes", () => {
    const md1 = `---
name: x
---
A`;
    const md2 = `---
name: x
---
B`;
    assert.notEqual(computeSkillKey(md1, "x"), computeSkillKey(md2, "x"));
  });
});

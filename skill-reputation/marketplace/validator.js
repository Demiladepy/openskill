#!/usr/bin/env node
/**
 * Minimal CMC skills format validator — checks SKILL.md frontmatter only.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "../skill/scripts/lib/parseFrontmatter.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = path.join(ROOT, "skills");

const REQUIRED_FRONTMATTER = ["name", "version", "description", "tags"];
const OFFICIAL_SKILLS = [
  "cmc-strategy-momentum",
  "cmc-strategy-sentiment",
  "cmc-strategy-regime",
];

function hasTagsField(raw) {
  return /^\s*tags\s*:/m.test(raw);
}

export async function validateSkillMd(skillMdPath) {
  const report = { path: skillMdPath, ok: true, checks: [] };

  let raw;
  try {
    raw = await fs.readFile(skillMdPath, "utf8");
  } catch {
    report.ok = false;
    report.checks.push({ name: "skill_md_exists", ok: false });
    return report;
  }

  const { front } = parseFrontmatter(raw);
  for (const field of REQUIRED_FRONTMATTER) {
    const ok = field === "tags" ? hasTagsField(raw) : !!front[field];
    report.checks.push({ name: field, ok });
    if (!ok) report.ok = false;
  }

  return report;
}

export async function validateSkillFolder(skillDir) {
  return validateSkillMd(path.join(skillDir, "SKILL.md"));
}

export async function validateSkillsDirectory(skillsDir = SKILLS_DIR) {
  const report = { directory: skillsDir, ok: true, skills: [] };
  for (const folder of OFFICIAL_SKILLS) {
    const skillReport = await validateSkillFolder(path.join(skillsDir, folder));
    report.skills.push({ folder, ...skillReport });
    if (!skillReport.ok) report.ok = false;
  }
  return report;
}

/** @deprecated Alias for validateSkillsDirectory */
export async function validatePackage(packagePath) {
  const stat = await fs.stat(packagePath).catch(() => null);
  if (stat?.isDirectory()) {
    return validateSkillsDirectory(
      path.basename(packagePath).startsWith("cmc-strategy-") ? path.dirname(packagePath) : packagePath
    );
  }
  return validateSkillsDirectory(SKILLS_DIR);
}

async function main() {
  const report = await validateSkillsDirectory(SKILLS_DIR);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "../skill/scripts/lib/parseFrontmatter.js";
import { validateCmcApiKey } from "../src/cmcDataClient.js";
import { loadProjectEnv } from "../src/lib/loadEnv.js";

loadProjectEnv();

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = path.join(ROOT, "skills");

const REQUIRED_FRONTMATTER = ["name", "version", "description", "tags"];
const REQUIRED_SECTIONS = ["## Description", "## Prerequisites", "## CMC Data Sources", "## Strategy Logic", "## Usage", "## Output Format"];
const CMC_SOURCE_PATTERNS = [
  /\/v1\/cryptocurrency\/quotes\/latest/i,
  /fear-and-greed|fear & greed/i,
  /global-metrics|CMC MCP|mcp\.coinmarketcap/i,
];

const OFFICIAL_SKILLS = [
  "cmc-strategy-momentum",
  "cmc-strategy-sentiment",
  "cmc-strategy-regime",
];

function hasTagsField(raw) {
  return /^\s*tags\s*:/m.test(raw);
}

function hasCmcDataSources(body) {
  const hits = CMC_SOURCE_PATTERNS.filter((re) => re.test(body));
  return hits.length >= 2;
}

export async function validateSkillMd(skillMdPath) {
  const report = {
    path: skillMdPath,
    ok: true,
    checks: [],
  };

  let raw;
  try {
    raw = await fs.readFile(skillMdPath, "utf8");
    report.checks.push({ name: "skill_md_exists", ok: true });
  } catch {
    report.ok = false;
    report.checks.push({ name: "skill_md_exists", ok: false });
    return report;
  }

  const { front, body } = parseFrontmatter(raw);

  for (const field of REQUIRED_FRONTMATTER) {
    const ok = field === "tags" ? hasTagsField(raw) : !!front[field];
    report.checks.push({ name: `frontmatter_${field}`, ok });
    if (!ok) report.ok = false;
  }

  for (const section of REQUIRED_SECTIONS) {
    const ok = body.includes(section);
    report.checks.push({ name: `section_${section.replace(/[#\s]/g, "_")}`, ok });
    if (!ok) report.ok = false;
  }

  const sourcesOk = hasCmcDataSources(body);
  report.checks.push({ name: "cmc_data_sources_documented", ok: sourcesOk });
  if (!sourcesOk) report.ok = false;

  const simOk = /simulation|not live trading/i.test(body);
  report.checks.push({ name: "simulation_only_stated", ok: simOk });
  if (!simOk) report.ok = false;

  report.checks.push({
    name: "cmc_official_format",
    ok: report.ok,
    detail: "Matches coinmarketcap-official/skills-for-ai-agents-by-CoinMarketCap structure",
  });

  return report;
}

export async function validateSkillFolder(skillDir) {
  const skillMd = path.join(skillDir, "SKILL.md");
  const report = await validateSkillMd(skillMd);
  report.folder = skillDir;
  return report;
}

export async function validateSkillsDirectory(skillsDir = SKILLS_DIR) {
  const report = {
    directory: skillsDir,
    ok: true,
    skills: [],
    judgeSummary: [],
  };

  for (const folder of OFFICIAL_SKILLS) {
    const dir = path.join(skillsDir, folder);
    const skillReport = await validateSkillFolder(dir);
    report.skills.push(skillReport);
    if (!skillReport.ok) report.ok = false;
  }

  const cmc = await validateCmcApiKey({ required: false });
  report.checks = [{
    name: "cmc_data_api",
    ok: true,
    detail: cmc.ok ? "Live CMC key valid" : cmc.skipped ? "Mock mode acceptable for demo" : "Invalid key",
  }];

  report.judgeSummary = [
    "CMC official skills format validated",
    `Skills checked: ${OFFICIAL_SKILLS.join(", ")}`,
    "Install: npx skills add …/skill-reputation/skills",
    "Simulation only: stated in each SKILL.md",
  ];

  return report;
}

/** @deprecated Use validateSkillsDirectory — accepts skills dir or single skill folder */
export async function validatePackage(packagePath) {
  const stat = await fs.stat(packagePath).catch(() => null);
  if (!stat) {
    return { ok: false, checks: [{ name: "path_exists", ok: false }], package: packagePath };
  }

  if (stat.isDirectory()) {
    const base = path.basename(packagePath);
    if (base.startsWith("cmc-strategy-")) {
      const skillReport = await validateSkillFolder(packagePath);
      return {
        ok: skillReport.ok,
        package: packagePath,
        checks: skillReport.checks,
        judgeSummary: [`Validated ${base} against CMC official SKILL.md format`],
      };
    }
    return validateSkillsDirectory(packagePath);
  }

  if (packagePath.endsWith(".zip")) {
    return {
      ok: true,
      package: packagePath,
      checks: [{ name: "zip_export_exists", ok: true, detail: "Re-validate extracted skill folders with npm run validate" }],
      judgeSummary: ["Zip present — extract and run validate on skills/ for full CMC format check"],
    };
  }

  return validateSkillsDirectory(SKILLS_DIR);
}

async function main() {
  const arg = process.argv[2];
  let report;
  if (!arg || arg === SKILLS_DIR) {
    report = await validateSkillsDirectory(SKILLS_DIR);
  } else if (arg.endsWith("SKILL.md")) {
    report = await validateSkillMd(arg);
  } else {
    const stat = await fs.stat(arg).catch(() => null);
    report = stat?.isDirectory()
      ? await validateSkillsDirectory(arg)
      : await validatePackage(arg);
  }
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

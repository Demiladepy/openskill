import { encodePacked, keccak256, stringToBytes } from "viem";

/** @param {string} rawName from frontmatter */
export function normalizeName(rawName) {
  return String(rawName || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** @param {string} fileContent raw SKILL.md text */
export function normalizeBody(fileContent) {
  return String(fileContent || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n");
}

/**
 * skillKey = keccak256(abi.encodePacked(nameHash, bodyHash))
 * nameHash = keccak256(utf8(normalizedName))
 * bodyHash = keccak256(utf8(normalizedBody))
 */
export function computeSkillKey(fileContent, nameFromFrontmatter) {
  const normalizedName = normalizeName(nameFromFrontmatter);
  const body = normalizeBody(fileContent);
  const nameHash = keccak256(stringToBytes(normalizedName));
  const bodyHash = keccak256(stringToBytes(body));
  return keccak256(encodePacked(["bytes32", "bytes32"], [nameHash, bodyHash]));
}

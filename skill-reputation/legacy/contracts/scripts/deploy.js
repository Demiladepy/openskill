const hre = require("hardhat");

async function main() {
  const requireTrusted =
    String(process.env.REQUIRE_TRUSTED || "false").toLowerCase() === "true";

  const SkillReputation = await hre.ethers.getContractFactory("SkillReputation");
  const contract = await SkillReputation.deploy(requireTrusted);
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("SkillReputation deployed to", address);
  console.log("requireTrusted:", requireTrusted);
  console.log("owner / trusted:", await contract.owner());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

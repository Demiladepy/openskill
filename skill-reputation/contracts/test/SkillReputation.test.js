const { expect } = require("chai");
const hre = require("hardhat");

describe("SkillReputation", function () {
  it("emits Attested for open mode", async function () {
    const [a, b] = await hre.ethers.getSigners();
    const F = await hre.ethers.getContractFactory("SkillReputation");
    const c = await F.deploy(false);
    await c.waitForDeployment();

    const skillKey = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("skill"));
    const digest = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("digest"));

    await expect(c.connect(b).attest(skillKey, 42, digest)).to.emit(c, "Attested");
  });

  it("reverts score > 100", async function () {
    const [, b] = await hre.ethers.getSigners();
    const F = await hre.ethers.getContractFactory("SkillReputation");
    const c = await F.deploy(false);
    await c.waitForDeployment();
    const skillKey = hre.ethers.ZeroHash;
    await expect(c.connect(b).attest(skillKey, 101, hre.ethers.ZeroHash)).to.be.revertedWithCustomError(
      c,
      "InvalidScore"
    );
  });

  it("trusted mode blocks unknown attestor", async function () {
    const [owner, stranger] = await hre.ethers.getSigners();
    const F = await hre.ethers.getContractFactory("SkillReputation");
    const c = await F.deploy(true);
    await c.waitForDeployment();

    const skillKey = hre.ethers.ZeroHash;
    await expect(c.connect(stranger).attest(skillKey, 1, hre.ethers.ZeroHash)).to.be.revertedWithCustomError(
      c,
      "Unauthorized"
    );

    await c.connect(owner).setTrusted(stranger.address, true);
    await c.connect(stranger).attest(skillKey, 1, hre.ethers.ZeroHash);
  });
});

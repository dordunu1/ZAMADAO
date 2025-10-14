const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying ConfidentialDAO contract...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  const ConfidentialDAO = await ethers.getContractFactory("ConfidentialDAO");
  const confidentialDAO = await ConfidentialDAO.deploy();

  await confidentialDAO.waitForDeployment();

  console.log("ConfidentialDAO deployed to:", await confidentialDAO.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const { ethers } = hre;

  // Deploy ZAMADAO ERC20 token
  const ZamaDAOERC20 = await ethers.getContractFactory("ZAMADAO");
  const zamaToken = await ZamaDAOERC20.deploy();
  await zamaToken.waitForDeployment();
  const zamaTokenAddress = await zamaToken.getAddress();
  console.log("ZAMADAO token deployed to:", zamaTokenAddress);

  // Deploy ConfidentialDAO
  const deployedDAO = await deploy("ConfidentialDAO", {
    from: deployer,
    log: true,
  });

  console.log(`ConfidentialDAO contract: `, deployedDAO.address);
};
export default func;
func.id = "deploy_confidential_dao"; // id required to prevent reexecution
func.tags = ["ConfidentialDAO"];

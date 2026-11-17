// script/Deploy.s.sol
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "src/Setup/IpfsStorage.sol";

contract DeployScript is Script {
    function run() external {
        // Replace with your explicit MetaMask public address
        address deployer = 0x0124Cd08699bc090c80494bcFBA68bE973256548;

        vm.startBroadcast(deployer);
        vm.pauseGasMetering();
        IpfsStorage myContract = new IpfsStorage();

        vm.stopBroadcast();
    }
}

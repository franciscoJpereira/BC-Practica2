//SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract IpfsStorage {
    mapping(address => string) public userFiles;

    function setFileIPFS(string memory _file) public {
        userFiles[msg.sender] = _file;
    }
}

import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { EndpointId } from "@layerzerolabs/lz-definitions";

async function deployMockEndpointsAndOFTs() {
  const [owner, user] = await ethers.getSigners();

  // Mock endpoints (local chains)
  const EndpointV2Mock = await ethers.getContractFactory("EndpointV2Mock");
  const endpointA = await EndpointV2Mock.deploy(EndpointId.ETHEREUM_V2_MAINNET);
  const endpointB = await EndpointV2Mock.deploy(EndpointId.ARBITRUM_V2_MAINNET);

  const U = await ethers.getContractFactory("U");
  const oftA = await U.deploy("LocalOFT", "LOFT", endpointA.address, owner.address);
  const oftB = await U.deploy("LocalOFT", "LOFT", endpointB.address, owner.address);

  // Connect endpoints so messages can be routed between OFTs
  await endpointA.setDestLzEndpoint(oftB.address, endpointB.address);
  await endpointB.setDestLzEndpoint(oftA.address, endpointA.address);

  // Set peers
  await oftA.setPeer(EndpointId.ARBITRUM_V2_MAINNET, ethers.utils.hexZeroPad(oftB.address, 32));
  await oftB.setPeer(EndpointId.ETHEREUM_V2_MAINNET, ethers.utils.hexZeroPad(oftA.address, 32));

  return { oftA, oftB, endpointA, endpointB, owner, user };
}

describe("U OFT Contract", function () {
  describe("Deployment", function () {
    it("should deploy with correct name, symbol, and decimals", async function () {
      const { oftA, oftB } = await loadFixture(deployMockEndpointsAndOFTs);

      expect(await oftA.name()).to.equal("LocalOFT");
      expect(await oftB.name()).to.equal("LocalOFT");
      expect(await oftA.symbol()).to.equal("LOFT");
      expect(await oftA.decimals()).to.equal(18);
    });

    it("should set up peer relationships correctly", async function () {
      const { oftA, oftB } = await loadFixture(deployMockEndpointsAndOFTs);

      const peerA = await oftA.peers(EndpointId.ARBITRUM_V2_MAINNET);
      const peerB = await oftB.peers(EndpointId.ETHEREUM_V2_MAINNET);
      expect(peerA.toLowerCase()).to.equal(ethers.utils.hexZeroPad(oftB.address, 32).toLowerCase());
      expect(peerB.toLowerCase()).to.equal(ethers.utils.hexZeroPad(oftA.address, 32).toLowerCase());
    });

    it("should return correct token address", async function () {
      const { oftA } = await loadFixture(deployMockEndpointsAndOFTs);

      expect(await oftA.token()).to.equal(oftA.address);
    });

    it("should not require approval for OFT operations", async function () {
      const { oftA } = await loadFixture(deployMockEndpointsAndOFTs);

      expect(await oftA.approvalRequired()).to.equal(false);
    });
  });

  describe("Minting", function () {
    it("should allow owner to mint tokens", async function () {
      const { oftA, user } = await loadFixture(deployMockEndpointsAndOFTs);

      await oftA.mint(user.address, ethers.utils.parseEther("1000"));
      expect(await oftA.balanceOf(user.address)).to.equal(ethers.utils.parseEther("1000"));
      expect(await oftA.totalSupply()).to.equal(ethers.utils.parseEther("1000"));
    });

    it("should allow minting to multiple users", async function () {
      const { oftA, owner } = await loadFixture(deployMockEndpointsAndOFTs);
      const [, user1, user2, user3] = await ethers.getSigners();

      await oftA.mint(user1.address, ethers.utils.parseEther("100"));
      await oftA.mint(user2.address, ethers.utils.parseEther("200"));
      await oftA.mint(user3.address, ethers.utils.parseEther("300"));

      expect(await oftA.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("100"));
      expect(await oftA.balanceOf(user2.address)).to.equal(ethers.utils.parseEther("200"));
      expect(await oftA.balanceOf(user3.address)).to.equal(ethers.utils.parseEther("300"));
      expect(await oftA.totalSupply()).to.equal(ethers.utils.parseEther("600"));
    });

    it("should not allow non-owner to mint tokens", async function () {
      const { oftA, user } = await loadFixture(deployMockEndpointsAndOFTs);

      await expect(
        oftA.connect(user).mint(user.address, ethers.utils.parseEther("1000"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should allow minting zero tokens", async function () {
      const { oftA, user } = await loadFixture(deployMockEndpointsAndOFTs);

      await oftA.mint(user.address, 0);
      expect(await oftA.balanceOf(user.address)).to.equal(0);
    });
  });

  describe("ERC20 Functionality", function () {
    it("should allow token transfers", async function () {
      const { oftA, user } = await loadFixture(deployMockEndpointsAndOFTs);
      const [, , recipient] = await ethers.getSigners();

      await oftA.mint(user.address, ethers.utils.parseEther("1000"));
      await oftA.connect(user).transfer(recipient.address, ethers.utils.parseEther("100"));

      expect(await oftA.balanceOf(user.address)).to.equal(ethers.utils.parseEther("900"));
      expect(await oftA.balanceOf(recipient.address)).to.equal(ethers.utils.parseEther("100"));
    });

    it("should handle approve and transferFrom", async function () {
      const { oftA, user } = await loadFixture(deployMockEndpointsAndOFTs);
      const [, , spender, recipient] = await ethers.getSigners();

      await oftA.mint(user.address, ethers.utils.parseEther("1000"));
      await oftA.connect(user).approve(spender.address, ethers.utils.parseEther("500"));

      expect(await oftA.allowance(user.address, spender.address)).to.equal(
        ethers.utils.parseEther("500")
      );

      await oftA.connect(spender).transferFrom(
        user.address,
        recipient.address,
        ethers.utils.parseEther("200")
      );

      expect(await oftA.balanceOf(user.address)).to.equal(ethers.utils.parseEther("800"));
      expect(await oftA.balanceOf(recipient.address)).to.equal(ethers.utils.parseEther("200"));
      expect(await oftA.allowance(user.address, spender.address)).to.equal(
        ethers.utils.parseEther("300")
      );
    });

    it("should revert on insufficient balance", async function () {
      const { oftA, user } = await loadFixture(deployMockEndpointsAndOFTs);
      const [, , recipient] = await ethers.getSigners();

      await oftA.mint(user.address, ethers.utils.parseEther("100"));

      await expect(
        oftA.connect(user).transfer(recipient.address, ethers.utils.parseEther("200"))
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("should revert on insufficient allowance", async function () {
      const { oftA, user } = await loadFixture(deployMockEndpointsAndOFTs);
      const [, , spender, recipient] = await ethers.getSigners();

      await oftA.mint(user.address, ethers.utils.parseEther("1000"));
      await oftA.connect(user).approve(spender.address, ethers.utils.parseEther("100"));

      await expect(
        oftA.connect(spender).transferFrom(
          user.address,
          recipient.address,
          ethers.utils.parseEther("200")
        )
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("should revert when transferring to zero address", async function () {
      const { oftA, user } = await loadFixture(deployMockEndpointsAndOFTs);

      await oftA.mint(user.address, ethers.utils.parseEther("1000"));

      await expect(
        oftA.connect(user).transfer(ethers.constants.AddressZero, ethers.utils.parseEther("100"))
      ).to.be.revertedWith("ERC20: transfer to the zero address");
    });
  });

  describe("Access Control", function () {
    it("should have correct initial owner", async function () {
      const { oftA, owner } = await loadFixture(deployMockEndpointsAndOFTs);

      expect(await oftA.owner()).to.equal(owner.address);
    });

    it("should allow owner to transfer ownership", async function () {
      const { oftA, owner, user } = await loadFixture(deployMockEndpointsAndOFTs);

      await oftA.connect(owner).transferOwnership(user.address);
      expect(await oftA.owner()).to.equal(user.address);
    });

    it("should not allow non-owner to transfer ownership", async function () {
      const { oftA, user } = await loadFixture(deployMockEndpointsAndOFTs);
      const [, , newOwner] = await ethers.getSigners();

      await expect(
        oftA.connect(user).transferOwnership(newOwner.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should allow new owner to mint after ownership transfer", async function () {
      const { oftA, owner, user } = await loadFixture(deployMockEndpointsAndOFTs);

      await oftA.connect(owner).transferOwnership(user.address);
      await oftA.connect(user).mint(user.address, ethers.utils.parseEther("500"));

      expect(await oftA.balanceOf(user.address)).to.equal(ethers.utils.parseEther("500"));
    });
  });

  describe("OFT Configuration", function () {
    it("should allow owner to set peer", async function () {
      const { oftA, owner } = await loadFixture(deployMockEndpointsAndOFTs);
      const newPeerAddress = ethers.Wallet.createRandom().address;
      const newEid = 40161; // Polygon endpoint ID

      await oftA.connect(owner).setPeer(newEid, ethers.utils.hexZeroPad(newPeerAddress, 32));

      const peer = await oftA.peers(newEid);
      expect(peer.toLowerCase()).to.equal(ethers.utils.hexZeroPad(newPeerAddress, 32).toLowerCase());
    });

    it("should not allow non-owner to set peer", async function () {
      const { oftA, user } = await loadFixture(deployMockEndpointsAndOFTs);
      const newPeerAddress = ethers.Wallet.createRandom().address;

      await expect(
        oftA.connect(user).setPeer(40161, ethers.utils.hexZeroPad(newPeerAddress, 32))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});

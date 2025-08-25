// HealthToken.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

// Interfaces for type safety
interface ClarityResponse<T> {
  ok: boolean;
  value: T | number; // number for error codes
}

interface MintRecord {
  amount: number;
  recipient: string;
  metadata: string;
  minter: string;
  timestamp: number;
}

interface ContractState {
  balances: Map<string, number>;
  minters: Map<string, boolean>;
  mintRecords: Map<number, MintRecord>;
  totalSupply: number;
  paused: boolean;
  admin: string;
  mintCounter: number;
  maxMintPerTx: number;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
}

// Mock contract implementation
class HealthTokenMock {
  private state: ContractState = {
    balances: new Map(),
    minters: new Map([["deployer", true]]),
    mintRecords: new Map(),
    totalSupply: 0,
    paused: false,
    admin: "deployer",
    mintCounter: 0,
    maxMintPerTx: 1000000,
    tokenName: "HealthToken",
    tokenSymbol: "HTK",
    tokenDecimals: 6,
  };
  private caller: string = "deployer"; // Default caller

  private MAX_METADATA_LEN = 500;
  private ERR_UNAUTHORIZED = 100;
  private ERR_PAUSED = 101;
  private ERR_INVALID_AMOUNT = 102;
  private ERR_INVALID_RECIPIENT = 103;
  private ERR_INVALID_MINTER = 104;
  private ERR_ALREADY_REGISTERED = 105;
  private ERR_METADATA_TOO_LONG = 106;
  private ERR_INSUFFICIENT_BALANCE = 108;
  private ERR_MINT_LIMIT_EXCEEDED = 110;
  private ERR_ZERO_AMOUNT = 113;

  getName(): ClarityResponse<string> {
    return { ok: true, value: this.state.tokenName };
  }

  getSymbol(): ClarityResponse<string> {
    return { ok: true, value: this.state.tokenSymbol };
  }

  getDecimals(): ClarityResponse<number> {
    return { ok: true, value: this.state.tokenDecimals };
  }

  getTotalSupply(): ClarityResponse<number> {
    return { ok: true, value: this.state.totalSupply };
  }

  getBalance(account: string): ClarityResponse<number> {
    return { ok: true, value: this.state.balances.get(account) ?? 0 };
  }

  getMintRecord(mintId: number): ClarityResponse<MintRecord | null> {
    return { ok: true, value: this.state.mintRecords.get(mintId) ?? null };
  }

  isMinter(account: string): ClarityResponse<boolean> {
    return { ok: true, value: this.state.minters.get(account) ?? false };
  }

  isPaused(): ClarityResponse<boolean> {
    return { ok: true, value: this.state.paused };
  }

  getAdmin(): ClarityResponse<string> {
    return { ok: true, value: this.state.admin };
  }

  setCaller(account: string) {
    this.caller = account;
  }

  transfer(recipient: string, amount: number): ClarityResponse<boolean> {
    const sender = this.caller; // Mock tx-sender as 'caller' for tests
    if (this.state.paused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    if (amount <= 0) {
      return { ok: false, value: this.ERR_ZERO_AMOUNT };
    }
    const senderBalance = this.state.balances.get(sender) ?? 0;
    if (amount > senderBalance) {
      return { ok: false, value: this.ERR_INSUFFICIENT_BALANCE };
    }
    if (recipient === sender) {
      return { ok: false, value: this.ERR_INVALID_RECIPIENT };
    }
    this.state.balances.set(sender, senderBalance - amount);
    const recipientBalance = this.state.balances.get(recipient) ?? 0;
    this.state.balances.set(recipient, recipientBalance + amount);
    return { ok: true, value: true };
  }

  mint(amount: number, recipient: string, metadata: string): ClarityResponse<boolean> {
    const minter = this.caller; // Mock tx-sender
    if (this.state.paused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    if (!this.state.minters.get(minter)) {
      return { ok: false, value: this.ERR_INVALID_MINTER };
    }
    if (amount <= 0) {
      return { ok: false, value: this.ERR_INVALID_AMOUNT };
    }
    if (amount > this.state.maxMintPerTx) {
      return { ok: false, value: this.ERR_MINT_LIMIT_EXCEEDED };
    }
    if (metadata.length > this.MAX_METADATA_LEN) {
      return { ok: false, value: this.ERR_METADATA_TOO_LONG };
    }
    if (recipient === this.state.admin) { // Assuming CONTRACT_OWNER is admin
      return { ok: false, value: this.ERR_INVALID_RECIPIENT };
    }
    const currentBalance = this.state.balances.get(recipient) ?? 0;
    this.state.balances.set(recipient, currentBalance + amount);
    this.state.totalSupply += amount;
    const mintId = this.state.mintCounter + 1;
    this.state.mintRecords.set(mintId, {
      amount,
      recipient,
      metadata,
      minter,
      timestamp: Date.now(),
    });
    this.state.mintCounter = mintId;
    return { ok: true, value: true };
  }

  burn(amount: number): ClarityResponse<boolean> {
    const sender = this.caller;
    if (this.state.paused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    if (amount <= 0) {
      return { ok: false, value: this.ERR_INVALID_AMOUNT };
    }
    const senderBalance = this.state.balances.get(sender) ?? 0;
    if (amount > senderBalance) {
      return { ok: false, value: this.ERR_INSUFFICIENT_BALANCE };
    }
    this.state.balances.set(sender, senderBalance - amount);
    this.state.totalSupply -= amount;
    return { ok: true, value: true };
  }

  pauseContract(): ClarityResponse<boolean> {
    if (this.caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.paused = true;
    return { ok: true, value: true };
  }

  unpauseContract(): ClarityResponse<boolean> {
    if (this.caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.paused = false;
    return { ok: true, value: true };
  }

  setAdmin(newAdmin: string): ClarityResponse<boolean> {
    if (this.caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.admin = newAdmin;
    return { ok: true, value: true };
  }

  addMinter(newMinter: string): ClarityResponse<boolean> {
    if (this.caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    if (this.state.minters.has(newMinter)) {
      return { ok: false, value: this.ERR_ALREADY_REGISTERED };
    }
    this.state.minters.set(newMinter, true);
    return { ok: true, value: true };
  }

  removeMinter(minter: string): ClarityResponse<boolean> {
    if (this.caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.minters.set(minter, false);
    return { ok: true, value: true };
  }

  setMaxMintPerTx(newMax: number): ClarityResponse<boolean> {
    if (this.caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    if (newMax <= 0) {
      return { ok: false, value: this.ERR_INVALID_AMOUNT };
    }
    this.state.maxMintPerTx = newMax;
    return { ok: true, value: true };
  }
}

// Test setup
const accounts = {
  deployer: "deployer",
  minter: "wallet_1",
  user1: "wallet_2",
  user2: "wallet_3",
  admin: "deployer", // Initial admin
};

describe("HealthToken Contract", () => {
  let contract: HealthTokenMock;

  beforeEach(() => {
    contract = new HealthTokenMock();
    vi.resetAllMocks();
    contract.setCaller(accounts.deployer); // Default to admin
  });

  it("should initialize with correct token metadata", () => {
    expect(contract.getName()).toEqual({ ok: true, value: "HealthToken" });
    expect(contract.getSymbol()).toEqual({ ok: true, value: "HTK" });
    expect(contract.getDecimals()).toEqual({ ok: true, value: 6 });
    expect(contract.getTotalSupply()).toEqual({ ok: true, value: 0 });
    expect(contract.getAdmin()).toEqual({ ok: true, value: "deployer" });
  });

  it("should allow admin to add minter", () => {
    contract.setCaller(accounts.deployer);
    const addMinter = contract.addMinter(accounts.minter);
    expect(addMinter).toEqual({ ok: true, value: true });
    const isMinter = contract.isMinter(accounts.minter);
    expect(isMinter).toEqual({ ok: true, value: true });
  });

  it("should allow minter to mint tokens with metadata", () => {
    contract.setCaller(accounts.deployer);
    contract.addMinter(accounts.minter);
    contract.setCaller(accounts.minter);
    const mintResult = contract.mint(1000000, accounts.user1, "Reward for data submission");
    expect(mintResult).toEqual({ ok: true, value: true });
    expect(contract.getBalance(accounts.user1)).toEqual({ ok: true, value: 1000000 });
    expect(contract.getTotalSupply()).toEqual({ ok: true, value: 1000000 });
    const mintRecord = contract.getMintRecord(1);
    expect(mintRecord).toEqual({
      ok: true,
      value: expect.objectContaining({
        amount: 1000000,
        recipient: accounts.user1,
        metadata: "Reward for data submission",
      }),
    });
  });

  it("should prevent minting exceeding max per tx", () => {
    contract.setCaller(accounts.deployer);
    contract.addMinter(accounts.minter);
    contract.setCaller(accounts.minter);
    const mintResult = contract.mint(1000001, accounts.user1, "Too much");
    expect(mintResult).toEqual({ ok: false, value: 110 });
  });

  it("should prevent non-minter from minting", () => {
    contract.setCaller(accounts.user1);
    const mintResult = contract.mint(1000, accounts.user1, "Unauthorized");
    expect(mintResult).toEqual({ ok: false, value: 104 });
  });

  it("should allow token transfer between users", () => {
    contract.setCaller(accounts.deployer);
    contract.addMinter(accounts.minter);
    contract.setCaller(accounts.minter);
    contract.mint(1000000, accounts.user1, "Test mint");
    contract.setCaller(accounts.user1);
    const transferResult = contract.transfer(accounts.user2, 500000);
    expect(transferResult).toEqual({ ok: true, value: true });
    expect(contract.getBalance(accounts.user1)).toEqual({ ok: true, value: 500000 });
    expect(contract.getBalance(accounts.user2)).toEqual({ ok: true, value: 500000 });

    contract.setCaller(accounts.minter);
    contract.mint(1000000, accounts.minter, "Mint to minter");
    contract.setCaller(accounts.minter);
    const transferToUser1 = contract.transfer(accounts.user1, 500000);
    expect(transferToUser1).toEqual({ ok: true, value: true });
    expect(contract.getBalance(accounts.minter)).toEqual({ ok: true, value: 500000 });
    expect(contract.getBalance(accounts.user1)).toEqual({ ok: true, value: 1000000 });
  });

  it("should prevent transfer of insufficient balance", () => {
    contract.setCaller(accounts.user1);
    const transferResult = contract.transfer(accounts.user2, 200);
    expect(transferResult).toEqual({ ok: false, value: 108 });
  });

  it("should allow burning tokens", () => {
    contract.setCaller(accounts.deployer);
    contract.addMinter(accounts.minter);
    contract.setCaller(accounts.minter);
    contract.mint(1000000, accounts.minter, "Test mint");
    contract.setCaller(accounts.minter);
    const burnResult = contract.burn(300000);
    expect(burnResult).toEqual({ ok: true, value: true });
    expect(contract.getBalance(accounts.minter)).toEqual({ ok: true, value: 700000 });
    expect(contract.getTotalSupply()).toEqual({ ok: true, value: 700000 });
  });

  it("should pause and unpause contract", () => {
    contract.setCaller(accounts.deployer);
    const pauseResult = contract.pauseContract();
    expect(pauseResult).toEqual({ ok: true, value: true });
    expect(contract.isPaused()).toEqual({ ok: true, value: true });

    contract.setCaller(accounts.deployer);
    const mintDuringPause = contract.mint(1000, accounts.user1, "Paused mint");
    expect(mintDuringPause).toEqual({ ok: false, value: 101 });

    contract.setCaller(accounts.deployer);
    const unpauseResult = contract.unpauseContract();
    expect(unpauseResult).toEqual({ ok: true, value: true });
    expect(contract.isPaused()).toEqual({ ok: true, value: false });
  });

  it("should prevent metadata exceeding max length", () => {
    contract.setCaller(accounts.deployer);
    contract.addMinter(accounts.minter);
    contract.setCaller(accounts.minter);
    const longMetadata = "a".repeat(501);
    const mintResult = contract.mint(1000, accounts.user1, longMetadata);
    expect(mintResult).toEqual({ ok: false, value: 106 });
  });

  it("should allow admin to set max mint per tx", () => {
    contract.setCaller(accounts.deployer);
    const setMax = contract.setMaxMintPerTx(2000000);
    expect(setMax).toEqual({ ok: true, value: true });
    contract.addMinter(accounts.minter);
    contract.setCaller(accounts.minter);
    const mintLarge = contract.mint(1500000, accounts.user1, "Large mint");
    expect(mintLarge).toEqual({ ok: true, value: true });
  });
});
# 🌐 HealthDataShare: Tokenized Incentive for Anonymized Health Data

Welcome to HealthDataShare, a Web3 platform on the Stacks blockchain that empowers patients to share anonymized health data securely while earning token rewards. This accelerates global research on diseases, especially rare conditions, by creating a decentralized marketplace for valuable health insights. Patients control their data, researchers gain access to diverse datasets, and the community benefits from faster medical breakthroughs—all powered by blockchain transparency and incentives.

## ✨ Features

🔒 Anonymized data sharing with patient consent and control  
💰 Token rewards for data contributors based on data quality and rarity  
🔬 Researcher access to aggregated datasets for rare disease studies  
📊 Immutable records of data submissions and reward distributions  
🏆 Bounty system for targeted research on specific conditions  
🗳️ Community governance for platform decisions  
✅ Data verification to ensure anonymity and validity  
🚫 Revocation options for patients to withdraw consent  

## 🛠 How It Works

**For Patients**  
- Register as a patient and verify identity (off-chain KYC optional for trust).  
- Anonymize your health data (e.g., via tools like differential privacy) and generate a hash.  
- Submit the data hash, metadata (e.g., condition type like "rare autoimmune disorder"), and proof of anonymity.  
- Earn HealthTokens automatically from the reward pool, with bonuses for rare condition data.  
- Participate in bounties by opting into specific research requests for extra rewards.  
- Withdraw consent at any time, removing data access (though hashes remain immutable).  

**For Researchers**  
- Register and stake tokens to access datasets.  
- Browse or query anonymized data aggregates (e.g., for rare conditions).  
- Post bounties for targeted data collection (e.g., "100 samples on Fabry disease").  
- Use verified data for studies, with citations back to the blockchain for provenance.  
- Vote in governance to propose new features or reward adjustments.  

**Token Economy**  
- HealthToken (HTK) is the utility token: earned by patients, staked by researchers, used for governance.  
- Rewards are distributed from a community-funded pool, with emissions based on data impact (e.g., measured by usage in research).  
- System prevents abuse via staking requirements and oracle-verified data quality.  

This project solves the real-world problem of data silos in healthcare, where patients lack incentives to share, and researchers struggle with limited access—especially for rare diseases affecting <1 in 2,000 people. By tokenizing contributions, we create a flywheel: more data → better research → more value → higher rewards.

## 📂 Smart Contracts Overview

HealthDataShare is built with 8 smart contracts in Clarity, ensuring modularity, security, and composability on the Stacks blockchain. Each contract handles a specific aspect, interacting via traits (e.g., SIP-10 for tokens).

1. **HealthToken.clar** (SIP-10 Fungible Token)  
   - Manages the HTK token: minting, burning, transfers.  
   - Initial supply minted to reward pool; emissions controlled by governance.  
   - Functions: `transfer`, `mint`, `get-balance`.  

2. **PatientRegistry.clar**  
   - Registers patients with principal addresses and basic profiles.  
   - Tracks consent status and data submission history.  
   - Functions: `register-patient`, `update-consent`, `get-patient-info`.  

3. **DataVault.clar**  
   - Stores hashes of anonymized data, metadata (e.g., condition tags), and timestamps.  
   - Ensures no duplicates via unique hashes; links to IPFS/off-chain storage.  
   - Functions: `submit-data`, `get-data-details`, `revoke-data`.  

4. **RewardPool.clar**  
   - Holds token reserves for incentives; distributes rewards based on data submissions.  
   - Calculates rewards using formulas (e.g., base + rarity multiplier).  
   - Functions: `claim-reward`, `fund-pool`, `calculate-reward`.  

5. **ResearchAccess.clar**  
   - Manages researcher permissions via staking; grants access to data queries.  
   - Aggregates data views without revealing individual sources.  
   - Functions: `stake-for-access`, `query-dataset`, `unstake`.  

6. **BountySystem.clar**  
   - Allows posting bounties for specific data needs (e.g., rare conditions).  
   - Escrows tokens; releases to patients upon verified submissions.  
   - Functions: `create-bounty`, `claim-bounty`, `verify-submission`.  

7. **GovernanceDAO.clar**  
   - Enables token holders to propose and vote on changes (e.g., reward rates).  
   - Uses quadratic voting for fairness; executes via multisig-like calls.  
   - Functions: `propose-vote`, `cast-vote`, `execute-proposal`.  

8. **DataOracle.clar**  
   - Integrates external oracles (via Stacks APIs) to verify data anonymity and quality.  
   - Scores submissions (e.g., 0-100) to influence rewards.  
   - Functions: `submit-for-verification`, `get-score`, `challenge-score`.  

## 🚀 Getting Started

1. Install Clarity tools: `clarinet new healthdatashare`.  
2. Deploy contracts locally: `clarinet test`.  
3. Interact via console: e.g., call `register-patient` from PatientRegistry.  
4. For production: Deploy to Stacks mainnet and integrate with wallets like Hiro.  

This setup ensures scalability—contracts can be upgraded via governance. Future expansions: NFT badges for top contributors or cross-chain data bridges.

Join the revolution in decentralized health research! 🚀
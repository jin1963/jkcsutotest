
let userAccount;
let contract;
let usdt;

async function connectWallet() {
  if (window.ethereum) {
    window.web3 = new Web3(window.ethereum);
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const accounts = await web3.eth.getAccounts();
      userAccount = accounts[0];
      document.getElementById("walletAddress").innerText = "✅ " + userAccount;

      contract = new web3.eth.Contract(contractABI, contractAddress);
      usdt = new web3.eth.Contract(erc20ABI, usdtAddress);

      let ref = new URLSearchParams(window.location.search).get("ref");
      if (!ref) ref = localStorage.getItem("ref");
      if (!ref) ref = userAccount;
      localStorage.setItem("ref", ref);

      const link = window.location.origin + window.location.pathname + "?ref=" + userAccount;
      document.getElementById("referralLink").value = link;

      loadStakes();
    } catch (e) {
      document.getElementById("walletAddress").innerText = "❌ Wallet connection failed";
    }
  } else {
    alert("Please install MetaMask or Bitget Wallet.");
  }
}

async function registerReferrer() {
  const refAddress = document.getElementById("refAddress").value;
  try {
    await contract.methods.registerReferrer(refAddress).send({ from: userAccount });
    alert("✅ Referrer registered.");
  } catch (e) {
    alert("❌ Referrer registration failed.");
  }
}

async function purchase() {
  const amount = document.getElementById("usdtAmount").value;
  if (!amount || isNaN(amount)) return alert("❌ Enter valid USDT amount");

  const value = web3.utils.toWei(amount, "ether");

  try {
    await usdt.methods.approve(contractAddress, value).send({ from: userAccount });
    await contract.methods.buyWithReferralAndStake(value).send({ from: userAccount });
    alert("✅ Purchase & Auto-Stake successful!");
    loadStakes();
  } catch (e) {
    alert("❌ Transaction failed.");
  }
}

async function claimReferralReward() {
  try {
    await contract.methods.claimReferralReward().send({ from: userAccount });
    alert("✅ Referral reward claimed.");
  } catch (e) {
    alert("❌ Claim failed.");
  }
}

async function claimStakeReward(index) {
  try {
    await contract.methods.claimStakeReward(index).send({ from: userAccount });
    alert("✅ Stake reward claimed.");
  } catch (e) {
    alert("❌ Claim failed.");
  }
}

async function unstake(index) {
  try {
    await contract.methods.unstake(index).send({ from: userAccount });
    alert("✅ Unstaked.");
    loadStakes();
  } catch (e) {
    alert("❌ Unstake failed.");
  }
}

async function loadStakes() {
  const stakeList = document.getElementById("stakeList");
  stakeList.innerHTML = "";

  try {
    const count = await contract.methods.getStakeCount(userAccount).call();
    for (let i = 0; i < count; i++) {
      const stake = await contract.methods.getStake(userAccount, i).call();
      const amountKJC = web3.utils.fromWei(stake.amount, "ether");
      const date = new Date(stake.startTime * 1000).toLocaleDateString();
      const claimed = stake.claimed ? "✅" : "⏳";

      const div = document.createElement("div");
      div.innerHTML = `
        <p>
          #${i + 1}: ${amountKJC} KJC | Locked: ${date} | ${claimed}
          <button onclick="claimStakeReward(${i})">Claim</button>
          <button onclick="unstake(${i})">Unstake</button>
        </p>
      `;
      stakeList.appendChild(div);
    }
  } catch (e) {
    stakeList.innerHTML = "<p>⚠️ Cannot load stakes.</p>";
  }
}

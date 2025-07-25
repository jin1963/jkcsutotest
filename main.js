let web3, userAccount, contract, usdtContract;

window.addEventListener("load", async () => {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
  } else {
    document.getElementById("status").innerText = "❌ No Ethereum wallet found";
    return;
  }

  document.getElementById("connectWallet").addEventListener("click", connectWallet);
  document.getElementById("registerReferrer").addEventListener("click", registerReferrer);
  document.getElementById("purchase").addEventListener("click", purchaseKJC);
  document.getElementById("claimReferralReward").addEventListener("click", claimReferralReward);
  document.getElementById("copyLink").addEventListener("click", copyReferralLink);
});

async function connectWallet() {
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    userAccount = accounts[0];

    const networkId = await web3.eth.getChainId();
    if (networkId !== chainId) {
      alert("⚠️ Please connect to BNB Smart Chain Mainnet");
      return;
    }

    contract = new web3.eth.Contract(contractABI, contractAddress);
    usdtContract = new web3.eth.Contract(erc20ABI, usdtAddress);

    document.getElementById("status").innerText = `✅ Connected: ${userAccount}`;
    updateReferralLink();
    loadStakes();
  } catch (err) {
    console.error(err);
    document.getElementById("status").innerText = "❌ Wallet connection failed";
  }
}

function updateReferralLink() {
  const refLink = `${window.location.origin}${window.location.pathname}?ref=${userAccount}`;
  document.getElementById("referralLink").value = refLink;
}

function copyReferralLink() {
  const input = document.getElementById("referralLink");
  input.select();
  document.execCommand("copy");
  alert("✅ ลิงก์ถูกคัดลอกแล้ว");
}

async function registerReferrer() {
  const referrer = document.getElementById("refInput").value.trim();
  if (!web3.utils.isAddress(referrer)) {
    alert("❌ ที่อยู่ผู้แนะนำไม่ถูกต้อง");
    return;
  }
  try {
    await contract.methods.registerReferrer(referrer).send({ from: userAccount });
    alert("✅ ลงทะเบียนผู้แนะนำเรียบร้อยแล้ว");
  } catch (err) {
    console.error(err);
    alert("❌ ลงทะเบียนไม่สำเร็จ");
  }
}

async function purchaseKJC() {
  const amount = document.getElementById("purchaseAmount").value;
  if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
    alert("❌ กรุณากรอกจำนวน USDT ที่ต้องการซื้อ");
    return;
  }

  const usdtAmount = web3.utils.toWei(amount, "mwei"); // USDT uses 6 decimals

  try {
    // Approve USDT first
    await usdtContract.methods.approve(contractAddress, usdtAmount).send({ from: userAccount });

    // Then call buyWithReferralAndStake
    await contract.methods.buyWithReferralAndStake(usdtAmount).send({ from: userAccount });

    alert("✅ ซื้อและ Stake สำเร็จแล้ว");
    loadStakes();
  } catch (err) {
    console.error(err);
    alert("❌ การซื้อไม่สำเร็จ");
  }
}

async function claimReferralReward() {
  try {
    await contract.methods.claimReferralReward().send({ from: userAccount });
    alert("✅ เคลมรางวัลแนะนำเรียบร้อยแล้ว");
  } catch (err) {
    console.error(err);
    alert("❌ เคลมรางวัลล้มเหลว");
  }
}

async function loadStakes() {
  if (!contract) return;

  const stakeList = document.getElementById("stakeList");
  stakeList.innerHTML = "";

  try {
    const count = await contract.methods.getStakeCount(userAccount).call();
    for (let i = 0; i < count; i++) {
      const stake = await contract.methods.getStake(userAccount, i).call();
      const amount = web3.utils.fromWei(stake.amount, "ether");
      const claimed = stake.claimed;
      const start = new Date(stake.startTime * 1000).toLocaleString();
      const claimBtn = !claimed
        ? `<button onclick="claimStakeReward(${i})">💰 Claim</button>
           <button onclick="unstake(${i})">🔓 Unstake</button>`
        : `<span>✅ Claimed</span>`;

      stakeList.innerHTML += `
        <li>
          <strong>${amount} KJC</strong><br/>
          Start: ${start}<br/>
          ${claimBtn}
        </li>
      `;
    }
  } catch (err) {
    console.error(err);
    stakeList.innerHTML = "<li>⚠️ ไม่สามารถโหลดรายการ stake ได้</li>";
  }
}

async function claimStakeReward(index) {
  try {
    await contract.methods.claimStakeReward(index).send({ from: userAccount });
    alert("✅ เคลมรางวัลสำเร็จ");
    loadStakes();
  } catch (err) {
    console.error(err);
    alert("❌ เคลมรางวัลล้มเหลว");
  }
}

async function unstake(index) {
  try {
    await contract.methods.unstake(index).send({ from: userAccount });
    alert("✅ ถอนการ stake สำเร็จ");
    loadStakes();
  } catch (err) {
    console.error(err);
    alert("❌ ถอน stake ไม่สำเร็จ");
  }
}

// Auto-load ref from URL
window.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get("ref");
  if (ref) {
    document.getElementById("refInput").value = ref;
  }
});

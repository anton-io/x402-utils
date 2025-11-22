/**
 * x402 PoC - Combined Application
 *
 * Includes Asta framework utilities and x402 payment flow logic
 */

// ============================================================================
// ASTA FRAMEWORK UTILITIES
// ============================================================================

/**
 * CSS Class Names for Asta framework
 */
const ASTA_CLASSES = {
  OPEN: 'open',
  VISIBLE: 'visible',
  DEBUG: 'debug',
  OFF_GRID: 'off-grid'
};

/**
 * Get the dimensions of a single grid cell.
 * @returns {{width: number, height: number}} Cell dimensions in pixels
 */
function gridCellDimensions() {
  const element = document.createElement("div");
  element.style.position = "fixed";
  element.style.height = "var(--line-height)";
  element.style.width = "1ch";
  document.body.appendChild(element);
  const rect = element.getBoundingClientRect();
  document.body.removeChild(element);
  return { width: rect.width, height: rect.height };
}

/**
 * Adjust media (img, video) padding to maintain grid alignment
 */
function adjustMediaPadding() {
  const cell = gridCellDimensions();

  function setHeightFromRatio(media, ratio) {
    const rect = media.getBoundingClientRect();
    const realHeight = rect.width / ratio;
    const diff = cell.height - (realHeight % cell.height);
    media.style.setProperty("padding-bottom", `${diff}px`);
  }

  function setFallbackHeight(media) {
    const rect = media.getBoundingClientRect();
    const height = Math.round((rect.width / 2) / cell.height) * cell.height;
    media.style.setProperty("height", `${height}px`);
  }

  function onMediaLoaded(media) {
    var width, height;
    switch (media.tagName) {
      case "IMG":
        width = media.naturalWidth;
        height = media.naturalHeight;
        break;
      case "VIDEO":
        width = media.videoWidth;
        height = media.videoHeight;
        break;
    }
    if (width > 0 && height > 0) {
      setHeightFromRatio(media, width / height);
    } else {
      setFallbackHeight(media);
    }
  }

  const medias = document.querySelectorAll("img, video");
  for (media of medias) {
    switch (media.tagName) {
      case "IMG":
        if (media.complete) {
          onMediaLoaded(media);
        } else {
          media.addEventListener("load", () => onMediaLoaded(media));
          media.addEventListener("error", function() {
            setFallbackHeight(media);
          });
        }
        break;
      case "VIDEO":
        switch (media.readyState) {
          case HTMLMediaElement.HAVE_CURRENT_DATA:
          case HTMLMediaElement.HAVE_FUTURE_DATA:
          case HTMLMediaElement.HAVE_ENOUGH_DATA:
            onMediaLoaded(media);
            break;
          default:
            media.addEventListener("loadeddata", () => onMediaLoaded(media));
            media.addEventListener("error", function() {
              setFallbackHeight(media);
            });
            break;
        }
        break;
    }
  }
}

/**
 * Theme Management
 */
const THEME_STORAGE_KEY = 'asta-theme';

function getTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY);
}

function setTheme(theme) {
  const root = document.documentElement;

  if (theme === null) {
    localStorage.removeItem(THEME_STORAGE_KEY);
    root.removeAttribute('data-theme');
  } else {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    root.setAttribute('data-theme', theme);
  }
}

function toggleTheme() {
  const currentTheme = getTheme();
  let activeTheme;
  if (currentTheme) {
    activeTheme = currentTheme;
  } else {
    activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  return newTheme;
}

function initThemeToggle() {
  const savedTheme = getTheme();
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  const themeToggle = document.querySelector(".theme-toggle");
  if (themeToggle) {
    const currentTheme = getTheme() ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    themeToggle.checked = currentTheme === 'dark';

    themeToggle.addEventListener("change", () => {
      const newTheme = toggleTheme();
      themeToggle.checked = newTheme === 'dark';
    });
  }
}

/**
 * Modal Management
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add(ASTA_CLASSES.OPEN);
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove(ASTA_CLASSES.OPEN);
    document.body.style.overflow = '';
  }
}

document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    const openModals = document.querySelectorAll(`.modal.${ASTA_CLASSES.OPEN}`);
    openModals.forEach(modal => {
      modal.classList.remove(ASTA_CLASSES.OPEN);
      document.body.style.overflow = '';
    });
  }
});

/**
 * Navigation menu toggles
 */
function initNavMenus() {
  const navMenus = document.querySelectorAll('.nav-menu');

  navMenus.forEach(menu => {
    const toggle = menu.querySelector('.nav-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        menu.classList.toggle(ASTA_CLASSES.OPEN);
      });

      const links = menu.querySelectorAll('.nav-list a');
      links.forEach(link => {
        link.addEventListener('click', () => {
          menu.classList.remove(ASTA_CLASSES.OPEN);
        });
      });
    }
  });
}

/**
 * Initialize Asta framework
 */
function initAsta() {
  initThemeToggle();
  adjustMediaPadding();
  window.addEventListener("load", adjustMediaPadding);
  window.addEventListener("resize", adjustMediaPadding);
  initNavMenus();
}

// ============================================================================
// x402 PoC APPLICATION
// ============================================================================

const API_BASE = 'http://localhost:8989';
const CHAIN_ID = '0x14a34'; // 84532 in hex (Base Sepolia)
const CHAIN_NAME = 'Base Sepolia';
const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';

// ERC20 ABI for transfer function
const ERC20_ABI = [
    {
        "constant": false,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    }
];

// State
let state = {
    wallet: null,
    web3: null,
    jobs: {},
    selectedJob: null,
    currentJobId: null,
    tokenAddress: null,
    recipientAddress: null
};

// DOM Elements
const elements = {
    connectWallet: document.getElementById('connectWallet'),
    walletInfo: document.getElementById('walletInfo'),
    walletAddress: document.getElementById('walletAddress'),
    walletBalance: document.getElementById('walletBalance'),
    mainContent: document.getElementById('mainContent'),
    jobsList: document.getElementById('jobsList'),
    jobForm: document.getElementById('jobForm'),
    hostInput: document.getElementById('hostInput'),
    countInput: document.getElementById('countInput'),
    jobPrice: document.getElementById('jobPrice'),
    requestJob: document.getElementById('requestJob'),
    paymentSection: document.getElementById('paymentSection'),
    paymentAmount: document.getElementById('paymentAmount'),
    jobId: document.getElementById('jobId'),
    expiryTimer: document.getElementById('expiryTimer'),
    payButton: document.getElementById('payButton'),
    cancelButton: document.getElementById('cancelButton'),
    executionSection: document.getElementById('executionSection'),
    statusIndicator: document.getElementById('statusIndicator'),
    statusText: document.getElementById('statusText'),
    outputConsole: document.getElementById('outputConsole'),
    errorMessage: document.getElementById('errorMessage')
};

// Initialize both Asta and x402
document.addEventListener('DOMContentLoaded', () => {
    initAsta();
    initX402();
});

function initX402() {
    elements.connectWallet.addEventListener('click', connectWallet);
    elements.requestJob.addEventListener('click', requestJobExecution);
    elements.payButton.addEventListener('click', payForJob);
    elements.cancelButton.addEventListener('click', cancelJob);

    checkWalletConnection();
}

async function checkWalletConnection() {
    if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
            await connectWallet();
        }
    }
}

async function connectWallet() {
    try {
        if (typeof window.ethereum === 'undefined') {
            showError('Please install MetaMask or Coinbase Wallet');
            return;
        }

        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        state.wallet = accounts[0];

        // Check/switch to Base Sepolia
        await switchToBaseSepolia();

        // Initialize Web3
        state.web3 = window.ethereum;

        // Update UI
        elements.connectWallet.classList.add('hidden');
        elements.walletInfo.classList.remove('hidden');
        elements.walletAddress.textContent = `${state.wallet.substring(0, 6)}...${state.wallet.substring(38)}`;
        elements.mainContent.classList.remove('hidden');

        // Load jobs
        await loadJobs();

        // Update balance
        await updateBalance();

        // Listen for account changes
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', () => window.location.reload());

    } catch (error) {
        showError(`Failed to connect wallet: ${error.message}`);
    }
}

async function switchToBaseSepolia() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CHAIN_ID }],
        });
    } catch (switchError) {
        // Chain doesn't exist, add it
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: CHAIN_ID,
                        chainName: CHAIN_NAME,
                        nativeCurrency: {
                            name: 'ETH',
                            symbol: 'ETH',
                            decimals: 18
                        },
                        rpcUrls: [RPC_URL],
                        blockExplorerUrls: ['https://sepolia.basescan.org/']
                    }]
                });
            } catch (addError) {
                throw new Error('Failed to add Base Sepolia network');
            }
        } else {
            throw switchError;
        }
    }
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        window.location.reload();
    } else if (accounts[0] !== state.wallet) {
        window.location.reload();
    }
}

async function loadJobs() {
    try {
        const response = await fetch(`${API_BASE}/api/jobs`);
        const data = await response.json();

        state.jobs = data.jobs;
        state.tokenAddress = data.token_address;
        state.recipientAddress = data.recipient_address;

        displayJobs();
    } catch (error) {
        showError(`Failed to load jobs: ${error.message}`);
    }
}

function displayJobs() {
    elements.jobsList.innerHTML = '';

    for (const [jobName, jobInfo] of Object.entries(state.jobs)) {
        const card = document.createElement('div');
        card.className = 'job-card';
        card.innerHTML = `
            <h3>${jobInfo.name.charAt(0).toUpperCase() + jobInfo.name.slice(1)}</h3>
            <p class="price">${jobInfo.price} U</p>
        `;
        card.addEventListener('click', () => selectJob(jobName, jobInfo));
        elements.jobsList.appendChild(card);
    }
}

function selectJob(jobName, jobInfo) {
    state.selectedJob = { name: jobName, info: jobInfo };

    // Update UI
    document.querySelectorAll('.job-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.target.closest('.job-card').classList.add('selected');

    elements.jobPrice.textContent = jobInfo.price;
    elements.jobForm.classList.remove('hidden');
}

async function requestJobExecution() {
    if (!state.selectedJob) {
        showError('Please select a job');
        return;
    }

    const host = elements.hostInput.value.trim();
    const count = parseInt(elements.countInput.value);

    if (!host) {
        showError('Please enter a host to ping');
        return;
    }

    try {
        elements.requestJob.disabled = true;

        const response = await fetch(`${API_BASE}/api/jobs/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                job_type: state.selectedJob.name,
                params: { host, count },
                wallet_address: state.wallet
            })
        });

        const data = await response.json();

        if (response.status === 402) {
            // Payment required
            state.currentJobId = data.job_id;
            state.paymentDetails = data.payment;
            state.expiresAt = new Date(data.expires_at);

            showPaymentSection(data);
        } else {
            showError('Unexpected response from server');
        }

    } catch (error) {
        showError(`Failed to request job: ${error.message}`);
    } finally {
        elements.requestJob.disabled = false;
    }
}

function showPaymentSection(data) {
    // Format amount with padding
    const amount = data.payment.amount.padEnd(4, ' ');
    elements.paymentAmount.textContent = amount;

    // Format job ID (truncate if too long)
    const jobId = state.currentJobId.substring(0, 24);
    elements.jobId.textContent = jobId.padEnd(24, ' ');

    elements.jobForm.classList.add('hidden');
    elements.paymentSection.classList.remove('hidden');
    elements.executionSection.classList.remove('hidden');

    startExpiryTimer();
}

function startExpiryTimer() {
    const timer = setInterval(() => {
        const now = new Date();
        const remaining = Math.max(0, state.expiresAt - now);

        if (remaining === 0) {
            clearInterval(timer);
            elements.expiryTimer.textContent = 'EXPIRED'.padEnd(5, ' ');
            elements.payButton.disabled = true;
            return;
        }

        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        elements.expiryTimer.textContent = timeStr.padEnd(5, ' ');
    }, 1000);
}

async function payForJob() {
    try {
        elements.payButton.disabled = true;
        updateStatus('Initiating payment...');

        // Convert amount to wei (18 decimals)
        const amount = state.paymentDetails.amount;
        const amountWei = BigInt(parseFloat(amount) * 1e18).toString(16);

        // Encode transfer function call
        const transferData = encodeTransferData(
            state.recipientAddress,
            `0x${amountWei}`
        );

        // Send transaction
        const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{
                from: state.wallet,
                to: state.tokenAddress,
                data: transferData,
                gas: '0x186A0' // 100000 gas
            }]
        });

        updateStatus('Payment sent! Waiting for confirmation...');
        appendOutput(`Transaction hash: ${txHash}\n`);

        // Wait for transaction confirmation
        await waitForTransaction(txHash);

        updateStatus('Payment confirmed! Verifying on blockchain...');

        // Verify payment with backend (with retry logic)
        await verifyPayment(txHash, 0);

    } catch (error) {
        showError(`Payment failed: ${error.message}`);
        elements.payButton.disabled = false;
    }
}

function encodeTransferData(to, amount) {
    // Function signature for transfer(address,uint256)
    const functionSignature = '0xa9059cbb';

    // Pad address to 32 bytes
    const paddedAddress = to.substring(2).padStart(64, '0');

    // Pad amount to 32 bytes
    const paddedAmount = amount.substring(2).padStart(64, '0');

    return functionSignature + paddedAddress + paddedAmount;
}

async function waitForTransaction(txHash) {
    return new Promise((resolve, reject) => {
        const checkInterval = setInterval(async () => {
            try {
                const receipt = await window.ethereum.request({
                    method: 'eth_getTransactionReceipt',
                    params: [txHash]
                });

                if (receipt) {
                    clearInterval(checkInterval);
                    if (receipt.status === '0x1') {
                        resolve(receipt);
                    } else {
                        reject(new Error('Transaction failed'));
                    }
                }
            } catch (error) {
                clearInterval(checkInterval);
                reject(error);
            }
        }, 2000);

        // Timeout after 5 minutes
        setTimeout(() => {
            clearInterval(checkInterval);
            reject(new Error('Transaction confirmation timeout'));
        }, 300000);
    });
}

async function verifyPayment(txHash, retryCount = 0) {
    const MAX_RETRIES = 10;
    const RETRY_DELAY = 3000; // 3 seconds

    try {
        updateStatus(`Verifying payment... (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

        const response = await fetch(`${API_BASE}/api/jobs/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                job_id: state.currentJobId,
                tx_hash: txHash
            })
        });

        const data = await response.json();

        if (data.status === 'verified' || data.status === 'already_paid') {
            updateStatus('Payment verified! Starting execution...');
            elements.paymentSection.classList.add('hidden');
            await executeJob();
        } else if (data.status === 'payment_not_found') {
            // Payment not yet detected, retry if attempts remain
            if (retryCount < MAX_RETRIES) {
                updateStatus(`Payment not yet detected. Retrying in ${RETRY_DELAY/1000}s... (${retryCount + 1}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                await verifyPayment(txHash, retryCount + 1);
            } else {
                showError('Payment verification timeout. Please check your transaction and try again.');
                elements.payButton.disabled = false;
            }
        } else {
            showError('Payment verification failed: ' + (data.message || 'Unknown error'));
            elements.payButton.disabled = false;
        }

    } catch (error) {
        if (retryCount < MAX_RETRIES) {
            updateStatus(`Network error. Retrying in ${RETRY_DELAY/1000}s... (${retryCount + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            await verifyPayment(txHash, retryCount + 1);
        } else {
            showError(`Verification failed after ${MAX_RETRIES} attempts: ${error.message}`);
            elements.payButton.disabled = false;
        }
    }
}

async function executeJob() {
    try {
        updateStatus('Executing job...', 'running');

        const eventSource = new EventSource(
            `${API_BASE}/api/jobs/execute/${state.currentJobId}`
        );

        eventSource.addEventListener('start', (e) => {
            appendOutput(e.data + '\n\n');
        });

        eventSource.addEventListener('output', (e) => {
            appendOutput(e.data);
        });

        eventSource.addEventListener('complete', (e) => {
            updateStatus('Job completed successfully!', 'complete');
            eventSource.close();
            updateBalance();
        });

        eventSource.addEventListener('error', (e) => {
            if (e.data) {
                showError(`Job error: ${e.data}`);
            }
            updateStatus('Job failed', 'error');
            eventSource.close();
        });

        eventSource.onerror = (error) => {
            console.error('SSE Error:', error);
            eventSource.close();
        };

    } catch (error) {
        showError(`Execution failed: ${error.message}`);
        updateStatus('Execution failed', 'error');
    }
}

function cancelJob() {
    state.currentJobId = null;
    elements.paymentSection.classList.add('hidden');
    elements.executionSection.classList.add('hidden');
    elements.jobForm.classList.remove('hidden');
}

function updateStatus(message, status = 'waiting') {
    elements.statusText.textContent = message;
    elements.statusIndicator.className = `status-indicator ${status}`;
}

function appendOutput(text) {
    elements.outputConsole.textContent += text;
    elements.outputConsole.scrollTop = elements.outputConsole.scrollHeight;
}

async function updateBalance() {
    if (!state.tokenAddress || !state.wallet) return;

    try {
        // Create contract interface for balance check
        const balanceData = '0x70a08231' + // balanceOf function signature
            state.wallet.substring(2).padStart(64, '0');

        const balance = await window.ethereum.request({
            method: 'eth_call',
            params: [{
                to: state.tokenAddress,
                data: balanceData
            }, 'latest']
        });

        const balanceDecimal = parseInt(balance, 16) / 1e18;
        elements.walletBalance.textContent = `${balanceDecimal.toFixed(2)} U`;

    } catch (error) {
        console.error('Failed to update balance:', error);
    }
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');

    setTimeout(() => {
        elements.errorMessage.classList.add('hidden');
    }, 5000);
}

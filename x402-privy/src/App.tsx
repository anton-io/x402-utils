import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { config } from './config';
import type { Job, JobsResponse, PaymentRequiredResponse, PaymentVerificationResponse } from './types';
import './App.css';

// Helper function to encode ERC20 transfer transaction data
function encodeTransferData(recipient: string, amount: string): string {
  // ERC20 transfer function selector: transfer(address,uint256)
  const functionSelector = '0xa9059cbb';

  // Remove '0x' prefix if present and pad address to 32 bytes
  const addressParam = recipient.replace('0x', '').padStart(64, '0');

  // Convert amount to wei (18 decimals) and pad to 32 bytes
  const amountInWei = BigInt(parseFloat(amount) * 1e18);
  const amountParam = amountInWei.toString(16).padStart(64, '0');

  return functionSelector + addressParam + amountParam;
}

function App() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();

  const [jobs, setJobs] = useState<Record<string, Job>>({});
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [jobParams, setJobParams] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [jobOutput, setJobOutput] = useState<string[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('');

  // Fetch available jobs on mount
  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/api/jobs`);
      const data: JobsResponse = await response.json();
      setJobs(data.jobs);
      if (Object.keys(data.jobs).length > 0) {
        setSelectedJob(Object.keys(data.jobs)[0]);
      }
    } catch (err) {
      setError('Failed to fetch jobs: ' + (err as Error).message);
    }
  };

  const handleJobRequest = async () => {
    if (!authenticated || !wallets[0]) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');
    setJobOutput([]);
    setPaymentStatus('Requesting job...');

    try {
      // Step 1: Request job (will get 402 Payment Required)
      // Convert count to number if it exists
      const params = { ...jobParams };
      if (params.count) {
        params.count = parseInt(params.count);
      }

      const requestResponse = await fetch(`${config.apiUrl}/api/jobs/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_type: selectedJob,
          params: params,
          wallet_address: wallets[0].address,
        }),
      });

      if (requestResponse.status !== 402) {
        throw new Error('Expected 402 Payment Required');
      }

      const paymentData: PaymentRequiredResponse = await requestResponse.json();
      setCurrentJobId(paymentData.job_id);
      setPaymentStatus(`Payment required: ${paymentData.payment.amount} ${config.token.symbol}`);

      // Step 2: Send ERC20 token payment
      setPaymentStatus('Please approve the payment in your wallet...');

      const wallet = wallets[0];
      const provider = await wallet.getEthereumProvider();

      // ERC20 Transfer function signature
      const transferData = encodeTransferData(
        paymentData.payment.recipient_address,
        paymentData.payment.amount
      );

      // Send the transaction
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: wallet.address,
          to: paymentData.payment.token_address,
          data: transferData,
          chainId: `0x${config.baseSepolia.chainId.toString(16)}`,
        }],
      }) as string;

      setPaymentStatus(`Payment sent! Transaction: ${txHash.slice(0, 10)}...`);

      // Step 3: Wait for blockchain confirmation and verify payment
      let verified = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max

      while (!verified && attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
          const verifyResponse = await fetch(`${config.apiUrl}/api/jobs/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              job_id: paymentData.job_id,
              tx_hash: txHash,
            }),
          });

          const verifyData: PaymentVerificationResponse = await verifyResponse.json();

          if (verifyData.status === 'verified' || verifyData.status === 'already_paid') {
            verified = true;
            setPaymentStatus('Payment verified! Executing job...');

            // Step 4: Execute job and stream results
            await executeJob(paymentData.job_id);
            break;
          } else {
            setPaymentStatus(`Waiting for blockchain confirmation... (${attempts}/${maxAttempts})`);
          }
        } catch (err) {
          console.error('Verification check failed:', err);
        }
      }

      if (!verified) {
        throw new Error('Payment verification timeout. Please try again.');
      }

    } catch (err) {
      setError((err as Error).message);
      setPaymentStatus('');
    } finally {
      setLoading(false);
    }
  };

  const executeJob = async (jobId: string) => {
    try {
      const executeUrl = `${config.apiUrl}/api/jobs/execute/${jobId}`;
      console.log('Connecting to EventSource:', executeUrl);

      const eventSource = new EventSource(executeUrl);

      eventSource.onopen = () => {
        console.log('EventSource connection opened');
        setPaymentStatus('Executing job...');
      };

      // Listen for 'start' event
      eventSource.addEventListener('start', (event: any) => {
        console.log('Job started:', event.data);
        setPaymentStatus('Job executing...');
      });

      // Listen for 'output' event (this is where the actual output comes)
      eventSource.addEventListener('output', (event: any) => {
        console.log('Job output:', event.data);
        setJobOutput(prev => {
          const newOutput = [...prev, event.data];
          console.log('Updated jobOutput:', newOutput);
          return newOutput;
        });
      });

      // Listen for 'complete' event
      eventSource.addEventListener('complete', (event: any) => {
        console.log('Job completed:', event.data);
        eventSource.close();
        setPaymentStatus('Job completed!');
        setLoading(false);
      });

      // Listen for 'error' event from backend
      eventSource.addEventListener('error', (event: any) => {
        console.log('Job error:', event.data);
        setError('Job error: ' + event.data);
        eventSource.close();
        setLoading(false);
      });

      eventSource.onerror = (err) => {
        console.error('EventSource error:', err);
        console.error('EventSource readyState:', eventSource.readyState);
        eventSource.close();

        // Check if this is just the connection closing normally
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('EventSource closed');
        } else {
          setError('Error streaming job results. Check console for details.');
        }
        setPaymentStatus('');
      };
    } catch (err) {
      console.error('Execute job error:', err);
      setError('Failed to execute job: ' + (err as Error).message);
      setPaymentStatus('');
    }
  };

  const handleParamChange = (key: string, value: string) => {
    setJobParams(prev => ({ ...prev, [key]: value }));
  };

  if (!ready) {
    return (
      <div className="app">
        <div className="loading">Loading Privy...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>x402 Protocol with Privy</h1>
        <p className="subtitle">Pay-per-execution API using blockchain payments</p>
        <p className="network-info">Base Sepolia · {config.token.symbol} Token</p>
      </header>

      <div className="wallet-section">
        <h2>Wallet Connection</h2>
        {!authenticated ? (
          <button className="btn btn-primary" onClick={login}>
            Connect Wallet
          </button>
        ) : (
          <div className="wallet-info">
            <p>
              <strong>Address:</strong> <code>{wallets[0]?.address.slice(0, 6)}...{wallets[0]?.address.slice(-4)}</code>
            </p>
            <button className="btn btn-secondary" onClick={logout}>
              Disconnect
            </button>
          </div>
        )}
      </div>

      {authenticated && (
        <>
          <div className="job-section">
            <h2>Select Job</h2>
            <select
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="job-select"
            >
              {Object.entries(jobs).map(([name, job]) => (
                <option key={name} value={name}>
                  {job.name} - {job.price} U
                </option>
              ))}
            </select>

            {selectedJob === 'ping' && (
              <div className="job-params">
                <h3>Job Parameters</h3>
                <div className="param-field">
                  <label>Host:</label>
                  <input
                    type="text"
                    value={jobParams.host || ''}
                    onChange={(e) => handleParamChange('host', e.target.value)}
                    placeholder="e.g., google.com"
                  />
                </div>
                <div className="param-field">
                  <label>Count:</label>
                  <input
                    type="number"
                    value={jobParams.count || '4'}
                    onChange={(e) => handleParamChange('count', e.target.value)}
                    min="1"
                    max="10"
                  />
                </div>
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleJobRequest}
              disabled={loading || !selectedJob}
            >
              {loading ? 'Processing...' : 'Request Job & Pay'}
            </button>
          </div>

          {paymentStatus && (
            <div className="status-section">
              <p className="status-message">{paymentStatus}</p>
            </div>
          )}

          {error && (
            <div className="error-section">
              <p className="error-message">Error: {error}</p>
            </div>
          )}

          {(currentJobId || jobOutput.length > 0) && (
            <div className="output-section">
              <h2>Job Output</h2>
              <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-color-alt)' }}>
                Lines received: {jobOutput.length}
              </p>
              <div className="output-terminal">
                {jobOutput.length === 0 ? (
                  <div className="output-line">Waiting for output...</div>
                ) : (
                  jobOutput.map((line, idx) => (
                    <div key={idx} className="output-line">{line}</div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;

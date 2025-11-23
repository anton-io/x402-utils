// Type definitions for x402 protocol

export interface Job {
  name: string;
  price: string;
}

export interface JobsResponse {
  jobs: Record<string, Job>;
  token_address: string;
  recipient_address: string;
}

export interface PaymentRequiredResponse {
  job_id: string;
  message: string;
  payment: {
    amount: string;
    token_address: string;
    recipient_address: string;
    chain_id: number;
    network: string;
  };
  expires_at: string;
  timeout_seconds: number;
}

export interface PaymentVerificationResponse {
  status: 'verified' | 'already_paid' | 'payment_not_found';
  tx_hash?: string;
  execution_url?: string;
  message?: string;
}

export interface JobStatusResponse {
  status: 'pending' | 'paid' | 'expired' | 'not_found';
  paid?: boolean;
  expires_at?: string;
  price?: string;
}

export interface JobRequestParams {
  job_type: string;
  params: Record<string, any>;
  wallet_address: string;
}

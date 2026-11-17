export type UserRole = 'client' | 'provider';

export type OrbitEventType =
  | 'MILESTONE_STARTED'
  | 'PROGRESS_UPDATE'
  | 'DELIVERABLE_SUBMITTED'
  | 'DISPUTE_NOTE';

export interface PaymentRecord {
  id: string; // uint256 string (full or hex/decimal)
  shortId: string;
  beneficiary: string;
  debtor: string;
  amountWei: string;
  amountEth: string;
  payedWei: string;
  payedEth: string;
  dueTime: number; // Unix timestamp in seconds
  approved: boolean;
  claimed: boolean;
  agreementCID: string;
  deliverableCID: string;
  tokenURI: string;
  parentPaymentId?: string;
}

export interface OrbitLogEntry {
  hash: string;
  paymentId: string;
  type: OrbitEventType;
  author: string;
  role: UserRole;
  message: string;
  cidAttachment?: string;
  timestamp: number;
}

export interface IpfsUploadResult {
  cid: string;
  size: number;
  name: string;
  gatewayUrl: string;
  timestamp: number;
}

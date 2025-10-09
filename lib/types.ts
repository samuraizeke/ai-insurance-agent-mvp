// lib/types.ts
export type Role = "user" | "assistant" | "system";
export type PolicyKind = "home" | "auto";

export interface PolicyFile {
  id: string;
  name: string;
  mime: string;
  size: number;
  storedAt: string;   // file path or external URL
  uploadedAt: number; // epoch ms
  kind?: PolicyKind;
  textContent?: string | null;
}

export type PolicyMap = Record<PolicyKind, PolicyFile | null>;

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;  // epoch ms
  attachments?: Array<{ id: string; name: string; url?: string; mime?: string }>;
}

export interface CustomerProfile {
  id: number;
  first_name: string;
  last_name: string;
  birthday?: Date; // YYYY-MM-DD
  email: string;
  phone?: string;
  address?: string;
  city: string;
  state: string;
  zip: string;
  policies: PolicyMap | null;
}

// lib/types.ts
export type Role = "user" | "assistant" | "system";
export type PolicyKind = "home" | "auto";

export interface PolicyFile {
  id: number;
  name: string;
  mime: string | null;
  size: number;
  storedAt: string; // file path or external URL
  uploadedAt: number; // epoch ms
  kind: PolicyKind;
  textContent?: string | null;
  profileId: number;
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
  first_name: string | null;
  last_name: string | null;
  birthday?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  policies?: PolicyMap | null;
}

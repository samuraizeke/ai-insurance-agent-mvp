// lib/types.ts
export type Role = "user" | "assistant" | "system";

export interface PolicyFile {
  id: string;
  name: string;
  mime: string;
  size: number;
  storedAt: string;   // file path or external URL
  uploadedAt: number; // epoch ms
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;  // epoch ms
  attachments?: Array<{ id: string; name: string; url?: string; mime?: string }>;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  policy?: PolicyFile | null;
}

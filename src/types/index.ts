export type ToolCategory =
  | 'language'
  | 'packageManager'
  | 'versionControl'
  | 'aiTool';

export interface ToolStatus {
  id: string;
  name: string;
  category: ToolCategory;
  command: string;
  version?: string;
  installed: boolean;
  recommendation: string;
}

export interface EnvironmentReport {
  scannedAt: string;
  tools: ToolStatus[];
}

export interface InstallTarget {
  id: string;
  name: string;
  category: string;
  description: string;
  commandPreview: string;
  requiresAdmin: boolean;
}

export interface InstallResult {
  targetId: string;
  success: boolean;
  output: string;
}

export interface ApiKeyProfile {
  id: string;
  provider: string;
  label: string;
  keyRef: string;
  maskedKey: string;
  note: string;
  updatedAt: string;
}

export interface SaveApiKeyProfileInput {
  id?: string;
  provider: string;
  label: string;
  apiKey: string;
  note?: string;
}

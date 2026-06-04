import { invoke } from '@tauri-apps/api/core';
import type {
  ApiKeyProfile,
  EnvironmentReport,
  InstallResult,
  InstallTarget,
  SaveApiKeyProfileInput,
} from '../types';

export function scanEnvironment(): Promise<EnvironmentReport> {
  return invoke<EnvironmentReport>('scan_environment');
}

export function listInstallTargets(): Promise<InstallTarget[]> {
  return invoke<InstallTarget[]>('list_install_targets');
}

export function installTarget(targetId: string): Promise<InstallResult> {
  return invoke<InstallResult>('install_target', { targetId });
}

export function listApiKeyProfiles(): Promise<ApiKeyProfile[]> {
  return invoke<ApiKeyProfile[]>('list_api_key_profiles');
}

export function saveApiKeyProfile(
  input: SaveApiKeyProfileInput,
): Promise<ApiKeyProfile> {
  return invoke<ApiKeyProfile>('save_api_key_profile', { request: input });
}

export function deleteApiKeyProfile(id: string): Promise<void> {
  return invoke<void>('delete_api_key_profile', { id });
}

export function revealApiKey(id: string): Promise<string> {
  return invoke<string>('reveal_api_key', { id });
}

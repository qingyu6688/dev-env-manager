use chrono::{SecondsFormat, Utc};
use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::{
  fs,
  path::PathBuf,
  process::{Command, Stdio},
};
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use tauri::{AppHandle, Manager};
use thiserror::Error;
use uuid::Uuid;

const SECRET_SERVICE: &str = "dev-env-manager";
const MIN_SECRET_LENGTH: usize = 8;
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Error)]
enum AppError {
  #[error("读取应用配置目录失败：{0}")]
  ConfigDir(String),
  #[error("读写配置文件失败：{0}")]
  File(#[from] std::io::Error),
  #[error("解析配置文件失败：{0}")]
  Json(#[from] serde_json::Error),
  #[error("系统凭据库操作失败：{0}")]
  Keyring(String),
  #[error("未找到指定记录")]
  NotFound,
  #[error("API Key 长度过短，请确认后再保存")]
  WeakSecret,
  #[error("不支持的安装目标：{0}")]
  UnknownInstallTarget(String),
  #[error("命令执行失败：{0}")]
  Command(String),
}

impl From<AppError> for String {
  fn from(value: AppError) -> Self {
    value.to_string()
  }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct EnvironmentReport {
  scanned_at: String,
  tools: Vec<ToolStatus>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ToolStatus {
  id: String,
  name: String,
  category: ToolCategory,
  command: String,
  version: Option<String>,
  installed: bool,
  recommendation: String,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
enum ToolCategory {
  Language,
  PackageManager,
  VersionControl,
  AiTool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct InstallTarget {
  id: String,
  name: String,
  category: String,
  description: String,
  command_preview: String,
  requires_admin: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct InstallResult {
  target_id: String,
  success: bool,
  output: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiKeyProfile {
  id: String,
  provider: String,
  label: String,
  key_ref: String,
  masked_key: String,
  note: String,
  updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveApiKeyProfileRequest {
  id: Option<String>,
  provider: String,
  label: String,
  api_key: String,
  note: Option<String>,
}

#[tauri::command]
fn scan_environment() -> EnvironmentReport {
  EnvironmentReport {
    scanned_at: now_iso(),
    tools: tool_definitions()
      .into_iter()
      .map(|definition| scan_tool(definition))
      .collect(),
  }
}

#[tauri::command]
fn list_install_targets() -> Vec<InstallTarget> {
  install_targets()
    .into_iter()
    .map(|target| InstallTarget {
      id: target.id.to_string(),
      name: target.name.to_string(),
      category: target.category.to_string(),
      description: target.description.to_string(),
      command_preview: target.command_preview.to_string(),
      requires_admin: target.requires_admin,
    })
    .collect()
}

#[tauri::command]
fn install_target(target_id: String) -> Result<InstallResult, String> {
  let target = install_targets()
    .into_iter()
    .find(|target| target.id == target_id)
    .ok_or_else(|| AppError::UnknownInstallTarget(target_id.clone()))?;

  let output = run_command_output(target.command, target.args)
    .map_err(|error| AppError::Command(error.to_string()))?;

  let combined_output = normalize_command_output(&output.stdout, &output.stderr);

  Ok(InstallResult {
    target_id,
    success: output.status.success(),
    output: combined_output,
  })
}

#[tauri::command]
fn list_api_key_profiles(app: AppHandle) -> Result<Vec<ApiKeyProfile>, String> {
  read_profiles(&profiles_path(&app)?).map_err(String::from)
}

#[tauri::command]
fn save_api_key_profile(
  app: AppHandle,
  request: SaveApiKeyProfileRequest,
) -> Result<ApiKeyProfile, String> {
  if request.api_key.trim().len() < MIN_SECRET_LENGTH {
    return Err(AppError::WeakSecret.into());
  }

  let path = profiles_path(&app)?;
  let mut profiles = read_profiles(&path)?;
  let profile_id = request.id.unwrap_or_else(|| Uuid::new_v4().to_string());
  let key_ref = profiles
    .iter()
    .find(|profile| profile.id == profile_id)
    .map(|profile| profile.key_ref.clone())
    .unwrap_or_else(|| Uuid::new_v4().to_string());

  write_secret(&key_ref, request.api_key.trim())?;

  let profile = ApiKeyProfile {
    id: profile_id.clone(),
    provider: request.provider.trim().to_string(),
    label: request.label.trim().to_string(),
    key_ref,
    masked_key: mask_secret(request.api_key.trim()),
    note: request.note.unwrap_or_default().trim().to_string(),
    updated_at: now_iso(),
  };

  if let Some(index) = profiles.iter().position(|item| item.id == profile_id) {
    profiles[index] = profile.clone();
  } else {
    profiles.push(profile.clone());
  }

  write_profiles(&path, &profiles)?;
  Ok(profile)
}

#[tauri::command]
fn delete_api_key_profile(app: AppHandle, id: String) -> Result<(), String> {
  let path = profiles_path(&app)?;
  let mut profiles = read_profiles(&path)?;
  let profile = profiles
    .iter()
    .find(|item| item.id == id)
    .cloned()
    .ok_or(AppError::NotFound)?;

  delete_secret(&profile.key_ref)?;
  profiles.retain(|item| item.id != id);
  write_profiles(&path, &profiles)?;
  Ok(())
}

#[tauri::command]
fn reveal_api_key(app: AppHandle, id: String) -> Result<String, String> {
  let path = profiles_path(&app)?;
  let profiles = read_profiles(&path)?;
  let profile = profiles
    .iter()
    .find(|item| item.id == id)
    .ok_or(AppError::NotFound)?;

  read_secret(&profile.key_ref).map_err(String::from)
}

pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      scan_environment,
      list_install_targets,
      install_target,
      list_api_key_profiles,
      save_api_key_profile,
      delete_api_key_profile,
      reveal_api_key
    ])
    .run(tauri::generate_context!())
    .expect("启动环境配置工具失败");
}

#[derive(Debug, Clone, Copy)]
struct ToolDefinition {
  id: &'static str,
  name: &'static str,
  category: ToolCategory,
  command: &'static str,
  args: &'static [&'static str],
  recommendation: &'static str,
}

#[derive(Debug, Clone, Copy)]
struct InstallTargetDefinition {
  id: &'static str,
  name: &'static str,
  category: &'static str,
  description: &'static str,
  command_preview: &'static str,
  command: &'static str,
  args: &'static [&'static str],
  requires_admin: bool,
}

fn tool_definitions() -> Vec<ToolDefinition> {
  vec![
    tool("node", "Node.js", ToolCategory::Language, "node", &["-v"], "建议安装 LTS 版本，用于前端和 Node 工具链。"),
    tool("npm", "npm", ToolCategory::PackageManager, "npm", &["-v"], "Node.js 安装后会自带 npm。"),
    tool("python", "Python", ToolCategory::Language, "python", &["--version"], "建议安装 Python 3.12 或更新版本。"),
    tool("pip", "pip", ToolCategory::PackageManager, "pip", &["--version"], "Python 安装后通常会自带 pip。"),
    tool("java", "Java", ToolCategory::Language, "java", &["-version"], "建议安装 JDK 21 LTS 或项目要求版本。"),
    tool("rustc", "Rust", ToolCategory::Language, "rustc", &["--version"], "建议通过 rustup 管理 Rust 工具链。"),
    tool("cargo", "Cargo", ToolCategory::PackageManager, "cargo", &["--version"], "Rust 安装后会自带 Cargo。"),
    tool("go", "Go", ToolCategory::Language, "go", &["version"], "需要 Go 项目时再安装即可。"),
    tool("dotnet", ".NET SDK", ToolCategory::Language, "dotnet", &["--version"], "需要 .NET 项目时安装 SDK。"),
    tool("git", "Git", ToolCategory::VersionControl, "git", &["--version"], "建议安装并配置用户名和邮箱。"),
    tool("winget", "WinGet", ToolCategory::PackageManager, "winget", &["--version"], "Windows 推荐使用 WinGet 安装常用工具。"),
    tool("choco", "Chocolatey", ToolCategory::PackageManager, "choco", &["--version"], "可作为 Windows 包管理备选方案。"),
    tool("scoop", "Scoop", ToolCategory::PackageManager, "scoop", &["--version"], "适合安装便携式开发工具。"),
    tool("claude", "Claude Code", ToolCategory::AiTool, "claude", &["--version"], "可通过 WinGet 或 npm 安装官方 Claude Code。"),
    tool("codex", "OpenAI Codex CLI", ToolCategory::AiTool, "codex", &["--version"], "如需使用 OpenAI 命令行编码工具，可按官方文档安装。"),
    tool("gemini", "Gemini CLI", ToolCategory::AiTool, "gemini", &["--version"], "如需使用 Google Gemini CLI，可按官方文档安装。"),
  ]
}

fn install_targets() -> Vec<InstallTargetDefinition> {
  vec![
    install_target_definition("node-lts", "Node.js LTS", "语言环境", "安装 Node.js LTS 和 npm。", "winget install OpenJS.NodeJS.LTS", "winget", &["install", "--id", "OpenJS.NodeJS.LTS", "-e", "--accept-package-agreements", "--accept-source-agreements"], true),
    install_target_definition("python-312", "Python 3.12", "语言环境", "安装 Python 3.12。", "winget install Python.Python.3.12", "winget", &["install", "--id", "Python.Python.3.12", "-e", "--accept-package-agreements", "--accept-source-agreements"], true),
    install_target_definition("temurin-21", "JDK 21 LTS", "语言环境", "安装 Eclipse Temurin JDK 21。", "winget install EclipseAdoptium.Temurin.21.JDK", "winget", &["install", "--id", "EclipseAdoptium.Temurin.21.JDK", "-e", "--accept-package-agreements", "--accept-source-agreements"], true),
    install_target_definition("rustup", "Rustup", "语言环境", "安装 Rust 官方工具链管理器。", "winget install Rustlang.Rustup", "winget", &["install", "--id", "Rustlang.Rustup", "-e", "--accept-package-agreements", "--accept-source-agreements"], true),
    install_target_definition("go", "Go", "语言环境", "安装 Go 稳定版。", "winget install GoLang.Go", "winget", &["install", "--id", "GoLang.Go", "-e", "--accept-package-agreements", "--accept-source-agreements"], true),
    install_target_definition("git", "Git", "版本控制", "安装 Git for Windows。", "winget install Git.Git", "winget", &["install", "--id", "Git.Git", "-e", "--accept-package-agreements", "--accept-source-agreements"], true),
    install_target_definition("claude-code-winget", "Claude Code", "AI 工具", "通过 WinGet 安装 Anthropic Claude Code。", "winget install Anthropic.ClaudeCode", "winget", &["install", "--id", "Anthropic.ClaudeCode", "-e", "--accept-package-agreements", "--accept-source-agreements"], true),
    install_target_definition("claude-code-npm", "Claude Code npm", "AI 工具", "通过 npm 全局安装 Claude Code。", "npm install -g @anthropic-ai/claude-code", "npm", &["install", "-g", "@anthropic-ai/claude-code"], false),
  ]
}

fn tool(
  id: &'static str,
  name: &'static str,
  category: ToolCategory,
  command: &'static str,
  args: &'static [&'static str],
  recommendation: &'static str,
) -> ToolDefinition {
  ToolDefinition {
    id,
    name,
    category,
    command,
    args,
    recommendation,
  }
}

fn install_target_definition(
  id: &'static str,
  name: &'static str,
  category: &'static str,
  description: &'static str,
  command_preview: &'static str,
  command: &'static str,
  args: &'static [&'static str],
  requires_admin: bool,
) -> InstallTargetDefinition {
  InstallTargetDefinition {
    id,
    name,
    category,
    description,
    command_preview,
    command,
    args,
    requires_admin,
  }
}

fn scan_tool(definition: ToolDefinition) -> ToolStatus {
  let version = run_version_command(definition.command, definition.args);
  ToolStatus {
    id: definition.id.to_string(),
    name: definition.name.to_string(),
    category: definition.category,
    command: format_command(definition.command, definition.args),
    installed: version.is_some(),
    version,
    recommendation: definition.recommendation.to_string(),
  }
}

fn run_version_command(command: &str, args: &[&str]) -> Option<String> {
  let output = run_command_output(command, args).ok()?;

  let normalized = normalize_command_output(&output.stdout, &output.stderr);
  first_meaningful_line(&normalized)
}

fn run_command_output(command: &str, args: &[&str]) -> std::io::Result<std::process::Output> {
  let mut last_error = None;

  for candidate in command_candidates(command) {
    let mut command = Command::new(&candidate);
    command
      .args(args)
      .stdout(Stdio::piped())
      .stderr(Stdio::piped());

    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    match command.output() {
      Ok(output) => return Ok(output),
      Err(error) => last_error = Some(error),
    }
  }

  Err(last_error.unwrap_or_else(|| {
    std::io::Error::new(std::io::ErrorKind::NotFound, "未找到可执行命令")
  }))
}

fn command_candidates(command: &str) -> Vec<String> {
  let mut candidates = vec![command.to_string()];

  #[cfg(windows)]
  {
    let has_extension = PathBuf::from(command).extension().is_some();
    if !has_extension {
      candidates.extend(["exe", "cmd", "bat"].map(|extension| format!("{command}.{extension}")));
    }
  }

  candidates
}

fn normalize_command_output(stdout: &[u8], stderr: &[u8]) -> String {
  let mut text = String::new();
  text.push_str(&String::from_utf8_lossy(stdout));
  if !stderr.is_empty() {
    if !text.trim().is_empty() {
      text.push('\n');
    }
    text.push_str(&String::from_utf8_lossy(stderr));
  }
  text.trim().to_string()
}

fn first_meaningful_line(output: &str) -> Option<String> {
  output
    .lines()
    .map(str::trim)
    .find(|line| !line.is_empty())
    .map(|line| line.to_string())
}

fn format_command(command: &str, args: &[&str]) -> String {
  if args.is_empty() {
    command.to_string()
  } else {
    format!("{} {}", command, args.join(" "))
  }
}

fn profiles_path(app: &AppHandle) -> Result<PathBuf, AppError> {
  let config_dir = app
    .path()
    .app_config_dir()
    .map_err(|error| AppError::ConfigDir(error.to_string()))?;
  fs::create_dir_all(&config_dir)?;
  Ok(config_dir.join("api_key_profiles.json"))
}

fn read_profiles(path: &PathBuf) -> Result<Vec<ApiKeyProfile>, AppError> {
  if !path.exists() {
    return Ok(Vec::new());
  }

  let content = fs::read_to_string(path)?;
  if content.trim().is_empty() {
    return Ok(Vec::new());
  }

  serde_json::from_str(&content).map_err(AppError::from)
}

fn write_profiles(path: &PathBuf, profiles: &[ApiKeyProfile]) -> Result<(), AppError> {
  let content = serde_json::to_string_pretty(profiles)?;
  fs::write(path, content)?;
  Ok(())
}

fn write_secret(account: &str, secret: &str) -> Result<(), AppError> {
  Entry::new(SECRET_SERVICE, account)
    .map_err(|error| AppError::Keyring(error.to_string()))?
    .set_password(secret)
    .map_err(|error| AppError::Keyring(error.to_string()))
}

fn read_secret(account: &str) -> Result<String, AppError> {
  Entry::new(SECRET_SERVICE, account)
    .map_err(|error| AppError::Keyring(error.to_string()))?
    .get_password()
    .map_err(|error| AppError::Keyring(error.to_string()))
}

fn delete_secret(account: &str) -> Result<(), AppError> {
  let entry = Entry::new(SECRET_SERVICE, account)
    .map_err(|error| AppError::Keyring(error.to_string()))?;
  match entry.delete_credential() {
    Ok(()) => Ok(()),
    Err(error) => {
      let message = error.to_string();
      if message.to_lowercase().contains("no entry") {
        Ok(())
      } else {
        Err(AppError::Keyring(message))
      }
    }
  }
}

fn mask_secret(secret: &str) -> String {
  let trimmed = secret.trim();
  let prefix: String = trimmed.chars().take(3).collect();
  let suffix: String = trimmed
    .chars()
    .rev()
    .take(4)
    .collect::<Vec<char>>()
    .into_iter()
    .rev()
    .collect();
  format!("{prefix}****{suffix}")
}

fn now_iso() -> String {
  Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn masks_secret_with_prefix_and_suffix() {
    assert_eq!(mask_secret("sk-test-123456"), "sk-****3456");
  }

  #[test]
  fn reads_first_meaningful_line() {
    let output = "\n\n  Python 3.12.3\nextra";
    assert_eq!(first_meaningful_line(output), Some("Python 3.12.3".to_string()));
  }

  #[test]
  fn rejects_unknown_install_target() {
    let exists = install_targets()
      .iter()
      .any(|target| target.id == "missing-target");
    assert!(!exists);
  }

  #[test]
  fn keeps_original_command_as_first_candidate() {
    let candidates = command_candidates("npm");
    assert_eq!(candidates.first(), Some(&"npm".to_string()));
  }

  #[cfg(windows)]
  #[test]
  fn adds_windows_command_suffix_candidates() {
    let candidates = command_candidates("npm");
    assert!(candidates.contains(&"npm.cmd".to_string()));
    assert!(candidates.contains(&"npm.exe".to_string()));
  }

  #[test]
  fn detects_available_npm_version() {
    let version = run_version_command("npm", &["-v"]);
    assert!(version.is_some(), "应能检测到 npm 版本");
  }
}

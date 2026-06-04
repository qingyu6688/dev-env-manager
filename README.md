# 环境配置工具

环境配置工具是一个基于 Tauri 的 Windows 桌面应用，用于检测本机开发环境、安装常用语言工具链，并集中管理不同 AI 服务的 API Key。

当前版本：`1.0.4`

## 功能概览

- 本机环境检测：检测 Node.js、npm、Python、pip、Java、Rust、Cargo、Go、.NET、Git、WinGet、Chocolatey、Scoop 等工具，并显示当前版本。
- AI 工具检测：检测 Claude Code、OpenAI Codex CLI、Gemini CLI 等 AI 开发工具。
- 环境安装：通过后端固定白名单执行安装命令，支持 Node.js LTS、Python、JDK、Rustup、Go、Git、Claude Code。
- API Key 管理：支持 OpenAI、Anthropic、Google Gemini、DeepSeek、OpenRouter、xAI、Moonshot、阿里云百炼、通义千问、百度千帆、智谱、讯飞星火、腾讯混元、火山方舟、MiniMax、SiliconFlow、Mistral、Cohere、Perplexity、Groq、AWS Bedrock 等厂商。
- 安全存储：API Key 写入系统凭据库，本地文件只保存服务商、标签、备注和掩码信息。
- 现代化界面：横向顶部导航，环境检测、安装任务、API Key 管理三个模块独立展示。

## 技术栈

| 类型 | 技术 |
|------|------|
| 桌面容器 | Tauri |
| 前端 | React + TypeScript + Vite |
| UI | Ant Design |
| 图标 | lucide-react |
| 图表 | ECharts |
| 系统能力 | Rust |
| 测试 | Vitest + Rust 单元测试 |

## 快速开始

```bash
npm install
npm run tauri:dev
```

## 构建发布包

```bash
npm test
npm run lint
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri:build
```

构建完成后，产物位于：

```text
src-tauri/target/release/dev-env-manager.exe
src-tauri/target/release/bundle/msi/
src-tauri/target/release/bundle/nsis/
```

## Release 下载

可以在 GitHub Releases 下载最新安装包：

- Windows MSI：`环境配置工具_1.0.4_x64_zh-CN.msi`
- Windows 安装程序：`环境配置工具_1.0.4_x64-setup.exe`
- 免安装可执行文件：`dev-env-manager.exe`

## 项目结构

```text
src/
  api/          # Tauri invoke 请求封装
  types/        # TypeScript 类型定义
  utils/        # 前端工具函数
src-tauri/
  src/          # Rust 后端命令
  capabilities/ # Tauri 权限配置
docs/           # 项目文档
tests/          # 测试配置
```

## 安全说明

- 安装命令由 Rust 后端白名单维护，前端不能传入任意命令。
- API Key 不写入仓库文件，也不写入 `.env`。
- API Key 明文只在用户主动查看时从系统凭据库读取。
- `.env`、构建产物、依赖目录和 Tauri target 目录均已加入 `.gitignore`。

## 文档

- [环境检查记录](docs/environment.md)
- [需求分析](docs/requirements.md)
- [API 文档](docs/api.md)
- [数据库 Schema](docs/schema.md)
- [部署说明](docs/deploy.md)
- [更新日志](docs/changelog.md)

## 开发者备注

maorongkang@gmail.com

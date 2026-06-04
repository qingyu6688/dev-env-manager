# 环境配置工具

一个基于 Tauri、React、TypeScript 和 Ant Design 的桌面工具，用于检测本机开发环境、安装常用语言工具链，并管理不同 AI 服务的 API Key。

## 主要功能

- 检测 Node.js、Python、Java、Rust、Go、Git 等开发环境版本。
- 检测 Claude Code、OpenAI Codex CLI、Gemini CLI 等 AI 开发工具。
- 通过固定安装方案安装常用语言运行时和 AI 工具。
- 使用系统凭据库保存 API Key，项目文件中只保存服务商、标签、备注等非敏感信息。

## 开发命令

```bash
npm install
npm run tauri:dev
npm test
npm run build
npm run tauri:build
```

## 文档

- [环境检查记录](docs/environment.md)
- [需求分析](docs/requirements.md)
- [API 文档](docs/api.md)
- [数据库 Schema](docs/schema.md)
- [部署说明](docs/deploy.md)
- [更新日志](docs/changelog.md)

# 需求分析

## 目标

开发一个桌面环境配置工具，帮助开发者快速了解本机开发环境状态，并完成常用语言、AI 编程工具和 AI API Key 的统一管理。

## 功能范围

1. 本机环境检测
   - 检测常用语言运行时、包管理器、版本控制工具。
   - 检测 AI 编程工具是否已安装。
   - 输出当前版本、状态和建议。

2. 环境安装
   - 提供 Node.js LTS、Python、Java、Rust、Go、Git 等安装入口。
   - 提供 Claude Code 安装入口。
   - 所有安装命令使用后端白名单，不接受前端自定义命令。

3. API Key 管理
   - 支持 OpenAI、Anthropic、Google Gemini、DeepSeek、OpenRouter、xAI、Moonshot、Azure OpenAI。
   - Key 值保存到系统凭据库。
   - 本地配置文件只保存非敏感元数据。

## 非功能要求

- 桌面容器：Tauri。
- 前端：React + TypeScript + Vite。
- UI：Ant Design。
- 图标：lucide-react。
- 图表：ECharts。
- 系统能力：Rust。
- 测试：Vitest + Rust 单元测试。

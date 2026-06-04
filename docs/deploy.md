# 部署说明

## 开发运行

```bash
npm install
npm run tauri:dev
```

## 构建桌面应用

```bash
npm run build
npm run tauri:build
```

## 注意事项

- Windows 安装功能依赖 `winget`、`npm`、`rustup` 等本机命令。
- API Key 使用系统凭据库保存，不要把 `.env` 或个人密钥提交到仓库。
- 首次运行 Tauri 构建前，请确认系统已安装 WebView2。

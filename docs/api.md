# API 文档

前端通过 Tauri `invoke` 调用 Rust 命令。

| 命令 | 说明 |
|------|------|
| `scan_environment` | 扫描本机语言、包管理器和 AI 工具版本。 |
| `list_install_targets` | 获取可安装工具清单。 |
| `install_target` | 按固定目标 ID 执行安装命令。 |
| `list_api_key_profiles` | 读取 API Key 元数据列表。 |
| `save_api_key_profile` | 保存或更新 API Key，密钥写入系统凭据库。 |
| `delete_api_key_profile` | 删除 API Key 元数据和凭据库密钥。 |
| `reveal_api_key` | 读取指定 API Key 明文，用于用户确认或复制。 |

所有命令返回错误时会转换为中文错误信息。

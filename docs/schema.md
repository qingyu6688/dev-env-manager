# 数据库 Schema

当前版本不使用 MySQL。API Key 敏感值写入系统凭据库，非敏感元数据写入应用配置目录的 `api_key_profiles.json`。

## api_key_profiles.json

```json
[
  {
    "id": "uuid",
    "provider": "OpenAI",
    "label": "个人账号",
    "keyRef": "credential-account-id",
    "maskedKey": "sk-****abcd",
    "note": "日常开发使用",
    "updatedAt": "2026-06-04T10:00:00Z"
  }
]
```

后续如果需要团队共享、审计或多设备同步，再新增 MySQL 表结构与迁移文件。

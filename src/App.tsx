import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  App as AntApp,
  Button,
  Card,
  Col,
  Form,
  Input,
  Layout,
  Menu,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  Activity,
  Bot,
  CheckCircle2,
  CircleAlert,
  Eye,
  KeyRound,
  PackageCheck,
  Play,
  RefreshCw,
  ShieldCheck,
  TerminalSquare,
  Trash2,
} from 'lucide-react';
import {
  deleteApiKeyProfile,
  installTarget,
  listApiKeyProfiles,
  listInstallTargets,
  revealApiKey,
  saveApiKeyProfile,
  scanEnvironment,
} from './api/tauri';
import type {
  ApiKeyProfile,
  InstallTarget,
  SaveApiKeyProfileInput,
  ToolStatus,
} from './types';
import {
  categoryLabel,
  createEnvironmentChartOption,
  summarizeEnvironment,
} from './utils/environment';

const { Content, Header } = Layout;
const { Text, Title } = Typography;

type ModuleKey = 'environment' | 'installer' | 'keys';

const MODULE_ICONS: Record<ModuleKey, ReactNode> = {
  environment: <TerminalSquare size={18} />,
  installer: <PackageCheck size={18} />,
  keys: <KeyRound size={18} />,
};

const PROVIDERS = [
  'OpenAI',
  'Anthropic',
  'Claude',
  'Google Gemini',
  'DeepSeek',
  'OpenRouter',
  'xAI',
  'Moonshot',
  'Azure OpenAI',
  '阿里云百炼',
  '通义千问',
  '百度千帆',
  '文心一言',
  '智谱清言',
  '讯飞星火',
  '腾讯混元',
  '火山方舟',
  'MiniMax',
  'SiliconFlow',
  'Ollama',
  'Mistral AI',
  'Cohere',
  'Perplexity',
  'Groq',
  'Together AI',
  'Replicate',
  'Hugging Face',
  'GitHub Models',
  'AWS Bedrock',
  'Azure AI Foundry',
];

type ApiKeyFormValues = {
  provider: string;
  label: string;
  apiKey: string;
  note?: string;
};

function App() {
  const { message, modal } = AntApp.useApp();
  const [activeModule, setActiveModule] = useState<ModuleKey>('environment');
  const [tools, setTools] = useState<ToolStatus[]>([]);
  const [installTargets, setInstallTargets] = useState<InstallTarget[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyProfile[]>([]);
  const [scannedAt, setScannedAt] = useState<string>('');
  const [loadingScan, setLoadingScan] = useState<boolean>(false);
  const [installingId, setInstallingId] = useState<string>('');
  const [installLog, setInstallLog] = useState<string>('暂无安装记录');
  const [keyModalOpen, setKeyModalOpen] = useState<boolean>(false);
  const [editingKey, setEditingKey] = useState<ApiKeyProfile | null>(null);
  const [form] = Form.useForm<ApiKeyFormValues>();

  const summary = useMemo(() => summarizeEnvironment(tools), [tools]);
  const chartOption = useMemo<EChartsOption>(
    () => createEnvironmentChartOption(tools),
    [tools],
  );

  const moduleTitle: Record<ModuleKey, string> = {
    environment: '环境检测',
    installer: '安装任务',
    keys: 'AI API Key 管理',
  };

  const moduleDescription: Record<ModuleKey, string> = {
    environment: scannedAt ? `上次扫描：${scannedAt}` : '正在准备首次扫描',
    installer: '按固定白名单执行安装命令，执行前会二次确认。',
    keys: '密钥保存到系统凭据库，本地只记录服务商、标签和备注。',
  };

  const statCards = [
    {
      title: '检测工具',
      value: summary.total,
      icon: <Activity size={20} />,
      tone: 'blue',
    },
    {
      title: '已安装',
      value: summary.installed,
      icon: <CheckCircle2 size={20} />,
      tone: 'green',
    },
    {
      title: '待处理',
      value: summary.missing,
      icon: <CircleAlert size={20} />,
      tone: 'amber',
    },
    {
      title: 'API Key',
      value: apiKeys.length,
      icon: <KeyRound size={20} />,
      tone: 'indigo',
    },
  ];

  const loadAll = async () => {
    setLoadingScan(true);
    try {
      const [report, targets, profiles] = await Promise.all([
        scanEnvironment(),
        listInstallTargets(),
        listApiKeyProfiles(),
      ]);
      setTools(report.tools);
      setScannedAt(report.scannedAt);
      setInstallTargets(targets);
      setApiKeys(profiles);
    } catch (error) {
      message.error(String(error));
    } finally {
      setLoadingScan(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleInstall = async (target: InstallTarget) => {
    setInstallingId(target.id);
    setInstallLog(`正在执行：${target.commandPreview}`);
    try {
      const result = await installTarget(target.id);
      setInstallLog(result.output || '命令已执行完成，但没有输出内容。');
      if (result.success) {
        message.success(`${target.name} 安装命令已完成`);
        await loadAll();
      } else {
        message.warning(`${target.name} 安装命令返回失败，请查看日志`);
      }
    } catch (error) {
      setInstallLog(String(error));
      message.error(String(error));
    } finally {
      setInstallingId('');
    }
  };

  const openCreateKeyModal = () => {
    setEditingKey(null);
    form.resetFields();
    setKeyModalOpen(true);
  };

  const openEditKeyModal = (profile: ApiKeyProfile) => {
    setEditingKey(profile);
    form.setFieldsValue({
      provider: profile.provider,
      label: profile.label,
      apiKey: '',
      note: profile.note,
    });
    setKeyModalOpen(true);
  };

  const handleSaveKey = async () => {
    const values = await form.validateFields();
    const payload: SaveApiKeyProfileInput = {
      id: editingKey?.id,
      provider: values.provider,
      label: values.label,
      apiKey: values.apiKey,
      note: values.note,
    };
    try {
      const saved = await saveApiKeyProfile(payload);
      setApiKeys((current) => {
        const exists = current.some((item) => item.id === saved.id);
        if (exists) {
          return current.map((item) => (item.id === saved.id ? saved : item));
        }
        return [...current, saved];
      });
      setKeyModalOpen(false);
      message.success('API Key 已保存到系统凭据库');
    } catch (error) {
      message.error(String(error));
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      await deleteApiKeyProfile(id);
      setApiKeys((current) => current.filter((item) => item.id !== id));
      message.success('API Key 已删除');
    } catch (error) {
      message.error(String(error));
    }
  };

  const handleRevealKey = async (profile: ApiKeyProfile) => {
    try {
      const secret = await revealApiKey(profile.id);
      modal.info({
        title: `${profile.label} 的 API Key`,
        content: (
          <Input.TextArea
            value={secret}
            readOnly
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
        ),
        okText: '关闭',
      });
    } catch (error) {
      message.error(String(error));
    }
  };

  const toolColumns: ColumnsType<ToolStatus> = [
    {
      title: '类型',
      dataIndex: 'category',
      width: 120,
      render: (category: ToolStatus['category']) => categoryLabel(category),
    },
    {
      title: '工具',
      dataIndex: 'name',
      width: 160,
      render: (name: string, record) => (
        <Space size={8}>
          {record.category === 'aiTool' ? (
            <Bot size={16} />
          ) : (
            <TerminalSquare size={16} />
          )}
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'installed',
      width: 110,
      render: (installed: boolean) =>
        installed ? (
          <Tag color="green">已安装</Tag>
        ) : (
          <Tag color="red">未检测到</Tag>
        ),
    },
    {
      title: '当前版本',
      dataIndex: 'version',
      width: 240,
      ellipsis: true,
      render: (version?: string) =>
        version ? <Text className="version-text">{version}</Text> : <Text type="secondary">无</Text>,
    },
    {
      title: '检测命令',
      dataIndex: 'command',
      width: 180,
      render: (command: string) => <Text code>{command}</Text>,
    },
    {
      title: '建议',
      dataIndex: 'recommendation',
      ellipsis: true,
    },
  ];

  const installColumns: ColumnsType<InstallTarget> = [
    {
      title: '名称',
      dataIndex: 'name',
      width: 160,
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '类型',
      dataIndex: 'category',
      width: 110,
    },
    {
      title: '说明',
      dataIndex: 'description',
    },
    {
      title: '命令',
      dataIndex: 'commandPreview',
      ellipsis: true,
      render: (command: string) => <Text code>{command}</Text>,
    },
    {
      title: '操作',
      width: 110,
      render: (_, record) => (
        <Popconfirm
          title="确认执行安装命令？"
          description={
            record.requiresAdmin
              ? '该操作可能需要管理员权限。'
              : '该操作会在后台执行。'
          }
          okText="执行"
          cancelText="取消"
          onConfirm={() => void handleInstall(record)}
        >
          <Button
            icon={<Play size={16} />}
            loading={installingId === record.id}
            disabled={Boolean(installingId)}
          >
            安装
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const keyColumns: ColumnsType<ApiKeyProfile> = [
    {
      title: '服务商',
      dataIndex: 'provider',
      width: 150,
      render: (provider: string) => <Tag>{provider}</Tag>,
    },
    {
      title: '标签',
      dataIndex: 'label',
      width: 180,
      render: (label: string) => <Text strong>{label}</Text>,
    },
    {
      title: 'Key',
      dataIndex: 'maskedKey',
      width: 180,
      render: (maskedKey: string) => <Text code>{maskedKey}</Text>,
    },
    {
      title: '备注',
      dataIndex: 'note',
      ellipsis: true,
      render: (note: string) => note || <Text type="secondary">无</Text>,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 190,
    },
    {
      title: '操作',
      width: 220,
      render: (_, record) => (
        <Space>
          <Button icon={<Eye size={16} />} onClick={() => void handleRevealKey(record)}>
            查看
          </Button>
          <Button onClick={() => openEditKeyModal(record)}>更新</Button>
          <Popconfirm
            title="删除这个 API Key？"
            okText="删除"
            cancelText="取消"
            onConfirm={() => void handleDeleteKey(record.id)}
          >
            <Button danger icon={<Trash2 size={16} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Layout className="app-shell">
      <Header className="app-header">
        <div className="header-brand">
          <span className="brand-mark">
            <ShieldCheck size={24} />
          </span>
          <div>
            <div className="brand-title">环境配置工具</div>
            <div className="brand-subtitle">Dev Env Manager</div>
          </div>
        </div>
        <Menu
          className="top-nav"
          mode="horizontal"
          selectedKeys={[activeModule]}
          onClick={({ key }) => setActiveModule(key as ModuleKey)}
          items={[
            {
              key: 'environment',
              icon: MODULE_ICONS.environment,
              label: '环境检测',
            },
            {
              key: 'installer',
              icon: MODULE_ICONS.installer,
              label: '安装任务',
            },
            {
              key: 'keys',
              icon: MODULE_ICONS.keys,
              label: 'API Key',
            },
          ]}
        />
        <Button
          type="primary"
          icon={<RefreshCw size={16} />}
          loading={loadingScan}
          onClick={() => void loadAll()}
        >
          重新扫描
        </Button>
      </Header>

      <Content className="app-content">
        <div className="page-title-bar">
          <div className="page-title-main">
            <span className="page-icon">{MODULE_ICONS[activeModule]}</span>
            <div>
              <Title level={3}>{moduleTitle[activeModule]}</Title>
              <Text type="secondary">{moduleDescription[activeModule]}</Text>
            </div>
          </div>
          <div className="page-actions">
            <Tag color="blue">v1.0.4</Tag>
            {activeModule === 'keys' && (
              <Button
                type="primary"
                icon={<KeyRound size={16} />}
                onClick={openCreateKeyModal}
              >
                新增 Key
              </Button>
            )}
          </div>
        </div>

        {activeModule === 'environment' && (
          <>
            <Row gutter={[16, 16]}>
              {statCards.map((item) => (
                <Col xs={24} sm={12} lg={6} key={item.title}>
                  <Card className="stat-card">
                    <div className={`stat-icon stat-icon-${item.tone}`}>
                      {item.icon}
                    </div>
                    <Statistic title={item.title} value={item.value} />
                  </Card>
                </Col>
              ))}
            </Row>

            <Row gutter={[16, 16]} className="main-grid">
              <Col xs={24} xl={16}>
                <Card
                  className="data-card"
                  title="检测结果"
                  extra={
                    <Text type="secondary">
                      语言、包管理器、版本控制和 AI 工具
                    </Text>
                  }
                >
                  <Table
                    rowKey="id"
                    columns={toolColumns}
                    dataSource={tools}
                    loading={loadingScan}
                    scroll={{ x: 1180 }}
                    pagination={{ pageSize: 10 }}
                  />
                </Card>
              </Col>
              <Col xs={24} xl={8}>
                <Card className="data-card" title="状态分布">
                  <ReactECharts option={chartOption} style={{ height: 360 }} />
                </Card>
              </Col>
            </Row>
          </>
        )}

        {activeModule === 'installer' && (
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={16}>
              <Card className="data-card" title="可安装环境">
                <Table
                  rowKey="id"
                  columns={installColumns}
                  dataSource={installTargets}
                  pagination={false}
                  scroll={{ x: 980 }}
                />
              </Card>
            </Col>
            <Col xs={24} xl={8}>
              <Card className="data-card" title="安装日志">
                <pre className="install-log">{installLog}</pre>
              </Card>
            </Col>
          </Row>
        )}

        {activeModule === 'keys' && (
          <Card className="data-card" title="已保存的 API Key">
            <Table
              rowKey="id"
              columns={keyColumns}
              dataSource={apiKeys}
              pagination={false}
              scroll={{ x: 1120 }}
              locale={{ emptyText: '还没有保存 API Key' }}
            />
          </Card>
        )}
      </Content>

      <Modal
        title={editingKey ? '更新 API Key' : '新增 API Key'}
        open={keyModalOpen}
        okText="保存"
        cancelText="取消"
        onOk={() => void handleSaveKey()}
        onCancel={() => setKeyModalOpen(false)}
      >
        <Form form={form} layout="vertical" className="key-form">
          <Form.Item
            name="provider"
            label="服务商"
            rules={[{ required: true, message: '请选择服务商' }]}
          >
            <Select options={PROVIDERS.map((provider) => ({ label: provider, value: provider }))} />
          </Form.Item>
          <Form.Item
            name="label"
            label="标签"
            rules={[{ required: true, message: '请输入标签' }]}
          >
            <Input placeholder="例如：个人 OpenAI 账号" />
          </Form.Item>
          <Form.Item
            name="apiKey"
            label="API Key"
            rules={[{ required: true, message: '请输入 API Key' }]}
          >
            <Input.Password placeholder="密钥会保存到系统凭据库" />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <Input.TextArea rows={3} placeholder="例如用途、额度、所属项目" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}

export default App;

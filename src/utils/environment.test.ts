import { describe, expect, it } from 'vitest';
import type { ToolStatus } from '../types';
import {
  categoryLabel,
  createEnvironmentChartOption,
  summarizeEnvironment,
} from './environment';

const tools: ToolStatus[] = [
  {
    id: 'node',
    name: 'Node.js',
    category: 'language',
    command: 'node -v',
    installed: true,
    version: 'v24.3.0',
    recommendation: '建议安装 LTS 版本',
  },
  {
    id: 'claude',
    name: 'Claude Code',
    category: 'aiTool',
    command: 'claude --version',
    installed: false,
    recommendation: '可安装 Claude Code',
  },
];

describe('environment utils', () => {
  it('统计已安装和未安装数量', () => {
    expect(summarizeEnvironment(tools)).toEqual({
      total: 2,
      installed: 1,
      missing: 1,
    });
  });

  it('返回中文分类名称', () => {
    expect(categoryLabel('aiTool')).toBe('AI 工具');
  });

  it('生成图表配置', () => {
    const option = createEnvironmentChartOption(tools);
    expect(option.series).toHaveLength(2);
  });
});

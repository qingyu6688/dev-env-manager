import type { EChartsOption } from 'echarts';
import type { ToolCategory, ToolStatus } from '../types';

export interface EnvironmentSummary {
  total: number;
  installed: number;
  missing: number;
}

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  language: '语言',
  packageManager: '包管理器',
  versionControl: '版本控制',
  aiTool: 'AI 工具',
};

export function categoryLabel(category: ToolCategory): string {
  return CATEGORY_LABELS[category];
}

export function summarizeEnvironment(tools: ToolStatus[]): EnvironmentSummary {
  const installed = tools.filter((tool) => tool.installed).length;

  return {
    total: tools.length,
    installed,
    missing: tools.length - installed,
  };
}

export function createEnvironmentChartOption(
  tools: ToolStatus[],
): EChartsOption {
  const categories = Object.keys(CATEGORY_LABELS) as ToolCategory[];
  const installed = categories.map(
    (category) =>
      tools.filter((tool) => tool.category === category && tool.installed)
        .length,
  );
  const missing = categories.map(
    (category) =>
      tools.filter((tool) => tool.category === category && !tool.installed)
        .length,
  );

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0f172a',
      borderColor: '#0f172a',
      textStyle: { color: '#ffffff' },
    },
    legend: {
      bottom: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: '#475569' },
    },
    grid: { left: 8, right: 8, top: 24, bottom: 48, containLabel: true },
    xAxis: {
      type: 'category',
      data: categories.map(categoryLabel),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#d6e6fb' } },
      axisLabel: { color: '#64748b' },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#e4eefb' } },
      axisLabel: { color: '#64748b' },
    },
    series: [
      {
        name: '已安装',
        type: 'bar',
        stack: 'total',
        barWidth: 28,
        itemStyle: { color: '#1677ff', borderRadius: [0, 0, 4, 4] },
        data: installed,
      },
      {
        name: '未检测到',
        type: 'bar',
        stack: 'total',
        barWidth: 28,
        itemStyle: { color: '#93c5fd', borderRadius: [4, 4, 0, 0] },
        data: missing,
      },
    ],
  };
}

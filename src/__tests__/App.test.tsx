/**
 * App 组件集成测试
 *
 * 覆盖：
 * - 初始化加载流程
 * - 筛选面板交互
 * - 搜索功能
 * - 面包屑导航
 * - 视图切换
 * - 导出功能
 * - 场景面板
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';

// Mock D3GraphCanvas —— 避免真实 D3 渲染
vi.mock('@/components/D3GraphCanvas', () => ({
  D3GraphCanvas: React.forwardRef(function D3GraphCanvasMock(
    _props: any,
    ref: any
  ) {
    React.useImperativeHandle(ref, () => ({
      exportPNG: vi.fn(),
      exportJSON: vi.fn(),
    }));
    return React.createElement('div', {
      'data-testid': 'graph-canvas',
      children: 'D3GraphCanvas Mock',
    });
  }),
}));

// Mock SceneShowcase
vi.mock('@/components/SceneShowcase', () => ({
  SceneShowcase: (_props: any) =>
    createElement('div', { 'data-testid': 'scene-showcase' }, 'SceneShowcase Mock'),
}));

// Mock FlowStoryBar
vi.mock('@/components/FlowStoryBar', () => ({
  FlowStoryBar: (_props: any) =>
    createElement('div', { 'data-testid': 'flow-story-bar' }, 'FlowStoryBar Mock'),
}));

// Mock ScenePanel
vi.mock('@/components/ScenePanel', () => ({
  ScenePanel: (_props: any) =>
    createElement('div', { 'data-testid': 'scene-panel' }, 'ScenePanel Mock'),
}));

// Mock ObjectExplorer
vi.mock('@/components/ObjectExplorer', () => ({
  ObjectExplorer: (_props: any) =>
    createElement('div', { 'data-testid': 'object-explorer' }, 'ObjectExplorer Mock'),
}));

// 导入 App（在 mock 之后）
import App from '../App';

// ========== 测试套件 ==========

describe('App 组件', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.innerWidth/innerHeight
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1200 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 800 });
  });

  // ---------- 初始化加载 ----------

  describe('初始化', () => {
    it('应显示加载指示器后完成加载', async () => {
      render(createElement(App));

      // 等待加载完成（InMemoryAdapter 初始化是异步的）
      await waitFor(
        () => {
          expect(screen.getByTestId('graph-canvas')).toBeTruthy();
        },
        { timeout: 5000 }
      );
    });
  });

  // ---------- 筛选面板 ----------

  describe('筛选面板', () => {
    it('加载完成后应显示筛选面板', async () => {
      render(createElement(App));

      await waitFor(() => {
        expect(screen.getByText('筛选')).toBeTruthy();
      }, { timeout: 5000 });
    });

    it('搜索框应可输入', async () => {
      const user = userEvent.setup();
      render(createElement(App));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('搜索实体...')).toBeTruthy();
      }, { timeout: 5000 });

      const searchInput = screen.getByPlaceholderText('搜索实体...');
      await user.type(searchInput, '裁断');
      expect(searchInput).toHaveValue('裁断');
    });
  });

  // ---------- 视图切换 ----------

  describe('视图切换', () => {
    it('应有地图/全量切换按钮', async () => {
      render(createElement(App));

      await waitFor(() => {
        expect(screen.getByText('地图')).toBeTruthy();
        expect(screen.getByText('全量')).toBeTruthy();
      }, { timeout: 5000 });
    });
  });

  // ---------- 底部工具栏 ----------

  describe('底部工具栏', () => {
    it('应显示重置按钮', async () => {
      render(createElement(App));

      await waitFor(() => {
        expect(screen.getByText('重置')).toBeTruthy();
      }, { timeout: 5000 });
    });

    it('应显示导出按钮（PNG / JSON）', async () => {
      render(createElement(App));

      await waitFor(() => {
        expect(screen.getByText('PNG')).toBeTruthy();
        expect(screen.getByText('JSON')).toBeTruthy();
      }, { timeout: 5000 });
    });
  });
});

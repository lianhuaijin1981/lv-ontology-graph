/**
 * GraphCanvas - 图谱画布 React 组件
 * 封装 GraphEngine，处理生命周期和事件转发
 */

import { useRef, useEffect, useCallback } from 'react';
import { GraphEngine } from '@/graph/GraphEngine';
import type { EntityId } from '@/types';
import type { GraphData, GraphEvent } from '@/graph/types';

interface GraphCanvasProps {
  data: GraphData;
  width: number;
  height: number;
  onNodeClick?: (nodeId: EntityId) => void;
  onNodeHover?: (nodeId: EntityId | null) => void;
  selectedNodeId?: EntityId;
}

export function GraphCanvas({
  data,
  width,
  height,
  onNodeClick,
  onNodeHover,
  selectedNodeId,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const engineRef = useRef<GraphEngine | null>(null);

  const handleEvent = useCallback(
    (event: GraphEvent) => {
      switch (event.type) {
        case 'nodeClick':
          onNodeClick?.(event.payload.node.id);
          break;
        case 'nodeHover':
          onNodeHover?.(event.payload.node.id);
          break;
        case 'nodeLeave':
          onNodeHover?.(null);
          break;
      }
    },
    [onNodeClick, onNodeHover]
  );

  // 初始化引擎
  useEffect(() => {
    if (!svgRef.current) return;

    const engine = new GraphEngine({
      container: svgRef.current,
      width,
      height,
      onEvent: handleEvent,
    });

    engineRef.current = engine;
    engine.setData(data);
    engine.fitView();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 数据更新
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.updateData(data);
    engine.fitView();
  }, [data]);

  // 尺寸更新
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.resize(width, height);
  }, [width, height]);

  // 选中节点更新
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (selectedNodeId) {
      engine.setSelectedNode(selectedNodeId);
      engine.focusNode(selectedNodeId);
    } else {
      engine.setSelectedNode(undefined);
    }
  }, [selectedNodeId]);

  return (
    <svg
      ref={svgRef}
      style={{
        width: '100%',
        height: '100%',
        background: '#0B0F19',
        cursor: 'grab',
      }}
    />
  );
}

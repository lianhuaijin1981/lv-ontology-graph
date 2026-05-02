/**
 * ObjectExplorer - Palantir 风格实体详情面板
 * 显示选中实体的属性、可执行动作、关联对象
 */

import { useState, useEffect } from 'react';
import type { OntologyObject, OntologyLink, ActionType, ObjectType, LinkType } from '@/ontology/types';
import type { EntityId } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronRight,
  Activity,
  ArrowRight,
  FileSearch,
  AlertTriangle,
  Download,
  Layers,
} from 'lucide-react';

interface ObjectExplorerProps {
  entityId: EntityId | null;
  getObject: (id: EntityId) => OntologyObject | undefined;
  getLinksForObject: (id: EntityId) => OntologyLink[];
  getObjectType: (id: string) => ObjectType | undefined;
  getLinkType: (id: string) => LinkType | undefined;
  getActionTypesForObject: (typeId: string) => ActionType[];
  onNavigateToEntity: (id: EntityId) => void;
  onAction: (actionId: string, entityId: EntityId) => void;
}

export function ObjectExplorer({
  entityId,
  getObject,
  getLinksForObject,
  getObjectType,
  getLinkType,
  getActionTypesForObject,
  onNavigateToEntity,
  onAction,
}: ObjectExplorerProps) {
  const [object, setObject] = useState<OntologyObject | null>(null);
  const [links, setLinks] = useState<OntologyLink[]>([]);
  const [actions, setActions] = useState<ActionType[]>([]);
  const [relatedOpen, setRelatedOpen] = useState(true);
  const [actionsOpen, setActionsOpen] = useState(true);

  useEffect(() => {
    if (!entityId) {
      setObject(null);
      setLinks([]);
      setActions([]);
      return;
    }

    const obj = getObject(entityId);
    if (obj) {
      setObject(obj);
      setLinks(getLinksForObject(entityId));
      setActions(getActionTypesForObject(obj.typeId));
    }
  }, [entityId, getObject, getLinksForObject, getActionTypesForObject]);

  if (!object) {
    return (
      <div className="h-full w-80 bg-slate-900 border-l border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300">对象浏览器</h3>
          <p className="text-xs text-slate-500 mt-1">点击图谱节点查看详情</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-600">
            <Layers className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">未选择对象</p>
          </div>
        </div>
      </div>
    );
  }

  const typeDef = getObjectType(object.typeId);
  const domainColor = typeDef?.color || '#64748B';

  // 分组关联对象
  const outgoingLinks = links.filter((l) => l.sourceId === object.id);
  const incomingLinks = links.filter((l) => l.targetId === object.id);

  return (
    <div className="h-full w-80 bg-slate-900 border-l border-slate-800 flex flex-col">
      {/* 头部 */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: domainColor }}
          />
          <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
            {typeDef?.displayName || object.typeId}
          </Badge>
        </div>
        <h2 className="text-base font-bold text-slate-100">{object.displayName}</h2>
        <p className="text-xs text-slate-500 mt-1">{object.domain}</p>
      </div>

      <ScrollArea className="flex-1">
        {/* 属性表 */}
        <div className="p-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            属性
          </h4>
          <div className="space-y-2">
            {typeDef?.properties.map((prop) => {
              const value = object.properties[prop.key];
              if (value == null) return null;
              return (
                <div key={prop.key} className="flex justify-between items-start text-sm">
                  <span className="text-slate-500">{prop.displayName}</span>
                  <span className="text-slate-200 max-w-[150px] truncate">
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <Separator className="bg-slate-800" />

        {/* 可执行动作 */}
        {actions.length > 0 && (
          <div className="p-4">
            <Collapsible open={actionsOpen} onOpenChange={setActionsOpen}>
              <CollapsibleTrigger className="flex items-center gap-1 w-full text-left mb-2">
                {actionsOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  可执行动作
                </h4>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2">
                  {actions.map((action) => (
                    <Button
                      key={action.id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 text-slate-300 hover:text-white hover:bg-slate-800"
                      onClick={() => onAction(action.id, object.id)}
                    >
                      {action.category === 'drillDown' && <ArrowRight className="w-4 h-4" />}
                      {action.category === 'analysis' && <Activity className="w-4 h-4" />}
                      {action.category === 'export' && <Download className="w-4 h-4" />}
                      {action.category === 'alert' && <AlertTriangle className="w-4 h-4" />}
                      {action.category === 'workflow' && <FileSearch className="w-4 h-4" />}
                      <span className="text-xs">{action.displayName}</span>
                    </Button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        <Separator className="bg-slate-800" />

        {/* 关联对象 */}
        <div className="p-4">
          <Collapsible open={relatedOpen} onOpenChange={setRelatedOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 w-full text-left mb-2">
              {relatedOpen ? (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                关联对象 ({links.length})
              </h4>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-3">
                {/* 出向关联 */}
                {outgoingLinks.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-600 mb-1">出向关联</p>
                    {outgoingLinks.map((link) => {
                      const target = getObject(link.targetId);
                      const linkType = getLinkType(link.typeId);
                      if (!target) return null;
                      return (
                        <button
                          key={link.id}
                          className="w-full text-left flex items-center gap-2 p-2 rounded hover:bg-slate-800 transition-colors"
                          onClick={() => onNavigateToEntity(target.id)}
                        >
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-300 truncate">{target.displayName}</p>
                            <p className="text-[10px] text-slate-500">{linkType?.displayName || link.typeId}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 入向关联 */}
                {incomingLinks.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-600 mb-1">入向关联</p>
                    {incomingLinks.map((link) => {
                      const source = getObject(link.sourceId);
                      const linkType = getLinkType(link.typeId);
                      if (!source) return null;
                      return (
                        <button
                          key={link.id}
                          className="w-full text-left flex items-center gap-2 p-2 rounded hover:bg-slate-800 transition-colors"
                          onClick={() => onNavigateToEntity(source.id)}
                        >
                          <ArrowRight className="w-3 h-3 text-slate-500 rotate-180" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-300 truncate">{source.displayName}</p>
                            <p className="text-[10px] text-slate-500">{linkType?.displayName || link.typeId}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}

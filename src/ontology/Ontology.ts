/**
 * 本体注册中心
 * 集中管理所有 Ontology 类型定义，提供类型查询和验证能力
 */

import type {
  OntologyRegistry,
  ObjectType,
  LinkType,
  ActionType,
} from '@/ontology/types';
import type { ObjectTypeId, LinkTypeId } from '@/types';

export class OntologyRegistryImpl implements OntologyRegistry {
  private objectTypes = new Map<ObjectTypeId, ObjectType>();
  private linkTypes = new Map<LinkTypeId, LinkType>();
  private actionTypes = new Map<string, ActionType>();

  registerObjectType(type: ObjectType): void {
    this.objectTypes.set(type.id, type);
  }

  registerLinkType(type: LinkType): void {
    this.linkTypes.set(type.id, type);
  }

  registerActionType(type: ActionType): void {
    this.actionTypes.set(type.id, type);
  }

  getObjectType(id: ObjectTypeId): ObjectType | undefined {
    return this.objectTypes.get(id);
  }

  getLinkType(id: LinkTypeId): LinkType | undefined {
    return this.linkTypes.get(id);
  }

  getActionType(id: string): ActionType | undefined {
    return this.actionTypes.get(id);
  }

  listObjectTypes(): ObjectType[] {
    return Array.from(this.objectTypes.values());
  }

  listObjectTypesByDomain(domain: string): ObjectType[] {
    return this.listObjectTypes().filter((t) => t.domain === domain);
  }

  listLinkTypes(): LinkType[] {
    return Array.from(this.linkTypes.values());
  }

  listLinkTypesForObject(typeId: ObjectTypeId): LinkType[] {
    return this.listLinkTypes().filter(
      (lt) => lt.sourceTypeId === typeId || lt.targetTypeId === typeId
    );
  }

  listActionTypes(): ActionType[] {
    return Array.from(this.actionTypes.values());
  }

  listActionTypesForObject(typeId: ObjectTypeId): ActionType[] {
    return this.listActionTypes().filter((at) =>
      at.applicableTypeIds.includes(typeId)
    );
  }

  /** 验证实体属性是否符合类型定义 */
  validateProperties(typeId: ObjectTypeId, properties: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const type = this.getObjectType(typeId);
    if (!type) return { valid: false, errors: [`ObjectType ${typeId} not found`] };
    
    const errors: string[] = [];
    for (const propDef of type.properties) {
      if (propDef.required && !(propDef.key in properties)) {
        errors.push(`Missing required property: ${propDef.key}`);
      }
    }
    return { valid: errors.length === 0, errors };
  }
}

export const globalOntologyRegistry = new OntologyRegistryImpl();

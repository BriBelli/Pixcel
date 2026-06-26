/**
 * A2UI Component Registry
 * 
 * The registry maps component types to their implementations.
 * This is framework-agnostic - each renderer (React, Lit, Flutter, etc.)
 * provides its own component implementations.
 */

import type { A2UIComponent, A2UIBuiltinComponentType } from './types';

/**
 * Component renderer function type
 * The generic R represents the rendered output (e.g., ReactElement, LitElement, etc.)
 */
export type ComponentRenderer<R, C = unknown> = (
  component: A2UIComponent,
  context: RendererContext<R, C>
) => R;

/**
 * Context provided to component renderers
 */
export interface RendererContext<R, C = unknown> {
  /** Render a child component by ID */
  renderChild: (childId: string) => R | null;
  /** Current data model */
  data: Record<string, unknown>;
  /** Emit an event from a component */
  emit: (event: string, payload?: Record<string, unknown>) => void;
  /** Update a value in the data model */
  updateData: (path: string, value: unknown) => void;
  /** Additional context from the host application */
  context?: C;
}

/**
 * Component registration entry
 */
export interface RegistryEntry<R, C = unknown> {
  /** Component type identifier */
  type: string;
  /** Renderer function */
  render: ComponentRenderer<R, C>;
  /** Whether this is a built-in component */
  builtin?: boolean;
  /** Component metadata */
  meta?: {
    displayName?: string;
    description?: string;
    category?: string;
  };
}

/**
 * A2UI Component Registry
 * 
 * Manages the mapping between component types and their implementations.
 * Each framework creates its own registry instance with appropriate renderers.
 */
export class A2UIRegistry<R, C = unknown> {
  private components: Map<string, RegistryEntry<R, C>> = new Map();
  private fallback?: ComponentRenderer<R, C>;

  /**
   * Register a component renderer
   */
  register(entry: RegistryEntry<R, C>): this {
    this.components.set(entry.type, entry);
    return this;
  }

  /**
   * Register multiple components at once
   */
  registerAll(entries: RegistryEntry<R, C>[]): this {
    entries.forEach((entry) => this.register(entry));
    return this;
  }

  /**
   * Unregister a component
   */
  unregister(type: string): boolean {
    return this.components.delete(type);
  }

  /**
   * Get a component renderer by type
   */
  get(type: string): RegistryEntry<R, C> | undefined {
    return this.components.get(type);
  }

  /**
   * Check if a component type is registered
   */
  has(type: string): boolean {
    return this.components.has(type);
  }

  /**
   * Get all registered component types
   */
  getTypes(): string[] {
    return Array.from(this.components.keys());
  }

  /**
   * Get all registered components
   */
  getAll(): RegistryEntry<R, C>[] {
    return Array.from(this.components.values());
  }

  /**
   * Set a fallback renderer for unknown component types
   */
  setFallback(renderer: ComponentRenderer<R, C>): this {
    this.fallback = renderer;
    return this;
  }

  /**
   * Get the fallback renderer
   */
  getFallback(): ComponentRenderer<R, C> | undefined {
    return this.fallback;
  }

  /**
   * Render a component using the appropriate renderer
   */
  render(component: A2UIComponent, context: RendererContext<R, C>): R | null {
    const entry = this.components.get(component.type);
    
    if (entry) {
      return entry.render(component, context);
    }

    if (this.fallback) {
      return this.fallback(component, context);
    }

    console.warn(`A2UI: Unknown component type "${component.type}" and no fallback registered`);
    return null;
  }

  /**
   * Clone the registry (useful for creating isolated instances)
   */
  clone(): A2UIRegistry<R, C> {
    const newRegistry = new A2UIRegistry<R, C>();
    this.components.forEach((entry, type) => {
      newRegistry.components.set(type, { ...entry });
    });
    if (this.fallback) {
      newRegistry.fallback = this.fallback;
    }
    return newRegistry;
  }

  /**
   * Extend the registry with another registry's components
   */
  extend(other: A2UIRegistry<R, C>): this {
    other.components.forEach((entry, type) => {
      if (!this.components.has(type)) {
        this.components.set(type, entry);
      }
    });
    return this;
  }
}

/**
 * Built-in component types that should be supported by all renderers
 */
export const BUILTIN_COMPONENT_TYPES: A2UIBuiltinComponentType[] = [
  'card',
  'button',
  'text-field',
  'text',
  'image',
  'container',
  'list',
  'select',
  'checkbox',
  'slider',
  'date-picker',
  'chip',
  'divider',
  'progress',
  'icon',
];

/**
 * Create a new registry instance
 */
export function createRegistry<R, C = unknown>(): A2UIRegistry<R, C> {
  return new A2UIRegistry<R, C>();
}

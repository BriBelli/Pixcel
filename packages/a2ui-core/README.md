# @a2ui/core

Core library for the A2UI (Agent-to-User Interface) protocol. Framework-agnostic — defines the data contract, validation, and utilities that all renderers depend on.

## What's Inside

- **Types** — `A2UIResponse`, `A2UIComponent`, actions, events, accessibility, metadata
- **Schema validation** — `validateResponse()`, `validateComponent()`
- **Registry** — Generic component registry (maps type strings to renderers)
- **Utilities** — `findComponent()`, `applyUpdate()`, `buildComponentTree()`, `resolveBinding()`, `evaluateCondition()`
- **Patterns** — Domain composition patterns (dashboard, stock, weather, compare, etc.)

## Usage

```ts
import type { A2UIResponse, A2UIComponent } from '@a2ui/core';
import { findComponent, validateResponse } from '@a2ui/core';
```

> `@a2ui/core` is a **path alias** resolved by `tsconfig.base.json` — not an npm package.

## Building

```bash
npm run a2ui:core:build
```

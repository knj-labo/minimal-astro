# @minimal-astro/runtime

Runtime package for minimal-astro. Handles client-side hydration, events, and state management.

## Components

- **Hydration**: Client-side hydration strategies (load, idle, visible, media, only)
- **Events**: Custom event system for component communication
- **State**: State management utilities
- **Data Access**: Utilities for accessing component data

## Installation

```bash
pnpm add @minimal-astro/runtime
```

## Usage

```typescript
import { hydrate } from '@minimal-astro/runtime/hydration';
import { createEventBus } from '@minimal-astro/runtime/events';

// Hydrate components with specific strategies
hydrate('load', Component, props, element);

// Create event bus for component communication
const bus = createEventBus();
bus.on('update', (data) => console.log(data));
bus.emit('update', { message: 'Hello' });
```
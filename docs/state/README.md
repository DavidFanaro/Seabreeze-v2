# State Management Documentation

This section covers state management approaches and patterns in Seabreeze.

## Overview

Seabreeze uses Zustand stores with SecureStore persistence for managing application state across three primary domains:
- **Authentication** - API credentials for AI providers
- **Provider/Model** - Selected provider and model configuration
- **Settings** - User preferences (theme, haptics, font size)

## Contents

- [State Model](./state-model.md) - State boundaries, ownership, and transition rules
- [State Lifecycle and Data Flow](./state-lifecycle-and-data-flow.md) - Runtime lifecycle and data/control flow

## Related

- [Architecture Overview](../architecture/README.md)
- [Providers](../providers/README.md)

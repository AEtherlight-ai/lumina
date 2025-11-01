---
name: Component Structure
category: ui
tags: [components, react, typescript, ui]
---

# Component Structure Pattern

## When to Use
- Building reusable UI components
- Structuring React/TypeScript projects
- Maintaining consistent component patterns

## Implementation
```typescript
// interfaces/types.ts
export interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

// Button.tsx
import React from 'react';
import { ButtonProps } from './interfaces';

export const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false
}) => {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? 'Loading...' : label}
    </button>
  );
};

// Usage
<Button
  label="Save"
  onClick={handleSave}
  variant="primary"
  loading={isSubmitting}
/>
```

## Best Practices
- Use TypeScript for type safety
- Define clear prop interfaces
- Provide sensible defaults
- Keep components focused (single responsibility)
- Extract complex logic to custom hooks
- Use composition over inheritance
- Document component props
- Add prop validation

## Component File Structure
```
components/
├── Button/
│   ├── Button.tsx          # Main component
│   ├── Button.test.tsx     # Tests
│   ├── Button.styles.ts    # Styles (if styled-components)
│   ├── interfaces.ts       # TypeScript interfaces
│   └── index.ts            # Public exports
```

## Related Patterns
- Custom Hooks
- Compound Components
- Render Props
- Higher-Order Components

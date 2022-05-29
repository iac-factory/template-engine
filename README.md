# `@iac-factory/template-engine`

## Task Board

- [ ] Include Reference & as Dependency in `@iac-factory/cli-utilities`
  - [ ] Create Repository Generator

## Usage 

See [example](./example) for a complete, packaged implementation.

```typescript
import("@iac-factory/ecma");

import { Template } from "@iac-factory/template-engine";

(async () => Template.hydrate("./package.template.json", "./package.hydration.json"))();

export {}
```
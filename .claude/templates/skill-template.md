---
name: {{name}}
description: {{description}}
version: 1.0
author: {{author}}
created: {{date}}
tags: [{{tags}}]
---

# {{name}}

## What This Skill Does

{{description}}

<!-- Provide detailed explanation of what this skill accomplishes -->
<!-- Include key features and capabilities -->

## When Claude Should Use This

<!-- Describe triggers and conditions for using this skill -->
<!-- Examples:
- Use when the user says "[specific phrase]"
- Use when the user wants to [specific action]
- Use when dealing with [specific scenario]
-->

Use this skill when the user:
{{#each triggers}}
- {{this}}
{{/each}}

## Workflow Process

<!-- Describe step-by-step process for executing this skill -->

### 1. {{step1_title}}
```
{{step1_description}}
```

### 2. {{step2_title}}
```
{{step2_description}}
```

### 3. {{step3_title}}
```
{{step3_description}}
```

<!-- Add more steps as needed -->

## Context Requirements

<!-- Describe what context/information is needed to execute this skill -->

**Required Context:**
{{#each required_context}}
- {{this}}
{{/each}}

**Optional Context:**
{{#each optional_context}}
- {{this}}
{{/each}}

## Validation Criteria

<!-- Define success criteria and validation checks -->

**Success Criteria:**
{{#each validation_criteria}}
- [ ] {{this}}
{{/each}}

## Related Patterns

<!-- Reference related patterns from docs/patterns/ -->

{{#each patterns}}
- **{{pattern_id}}:** {{pattern_description}}
{{/each}}

## Performance Targets

<!-- Define performance expectations -->

{{#each performance_targets}}
- **{{metric}}:** {{target}}
{{/each}}

## Error Handling

<!-- Define error handling approach -->

**Common Errors:**
{{#each common_errors}}
- **{{error}}:** {{handling}}
{{/each}}

## Examples

### Example 1: {{example1_title}}

**User Request:**
```
{{example1_request}}
```

**Skill Response:**
```
{{example1_response}}
```

### Example 2: {{example2_title}}

**User Request:**
```
{{example2_request}}
```

**Skill Response:**
```
{{example2_response}}
```

## Notes

<!-- Additional notes, warnings, or considerations -->

{{notes}}

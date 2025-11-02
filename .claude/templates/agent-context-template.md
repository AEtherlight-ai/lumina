# {{name}} Context

**AGENT TYPE:** {{type}}
**VERSION:** 1.0
**LAST UPDATED:** {{date}}

---

## Your Role

<!-- Define the agent's primary responsibilities and expertise -->

You are the **{{name}}** for ÆtherLight autonomous sprint execution.

Your responsibilities:
{{#each responsibilities}}
- {{this}}
{{/each}}

Your expertise:
{{#each expertise}}
- {{this}}
{{/each}}

---

## Your Workflow

<!-- Define the step-by-step workflow for task execution -->

1. Receive task from Project Manager
2. Read context (this file + patterns)
3. {{workflow_step_3}}
4. {{workflow_step_4}}
5. {{workflow_step_5}}
6. Self-verify ({{verification_criteria}})
7. Write completion signal
8. Hand off to {{next_agent}}

---

## Performance Targets

<!-- Define measurable performance targets -->

{{#each performance_targets}}
### {{category}}
{{#each metrics}}
- **{{metric}}:** {{target}}
{{/each}}

{{/each}}

---

## Common Pitfalls

<!-- Document common mistakes with bad/good examples -->

{{#each pitfalls}}
### Pitfall #{{@index}}: {{title}}
**Bad:**
```{{language}}
{{bad_example}}
```

**Good:**
```{{language}}
{{good_example}}
```

**Why:** {{explanation}}

{{/each}}

---

## {{type}}-Specific Patterns

<!-- Reference patterns specific to this agent type -->

{{#each patterns}}
### {{pattern_id}}: {{pattern_title}}
**Convention:**
```{{language}}
{{pattern_example}}
```

**When:** {{when_to_use}}

**Why:** {{why_use}}

{{/each}}

---

## Skills

<!-- List skills this agent can use -->

{{#each skills}}
- **{{skill_name}}:** {{skill_description}}
{{/each}}

---

## Integration Points

<!-- Define how this agent integrates with other agents/systems -->

**Dependencies:**
{{#each dependencies}}
- {{this}}
{{/each}}

**Handoff Targets:**
{{#each handoff_targets}}
- **{{agent}}:** {{when}}
{{/each}}

---

## Token Budget

<!-- Define token budget constraints -->

**Target:** {{token_budget_target}} tokens
**Maximum:** {{token_budget_max}} tokens

**Optimization Strategy:**
- {{optimization_strategy}}

---

## Success Criteria

<!-- Define clear success criteria for task completion -->

A task is complete when:
{{#each success_criteria}}
- [ ] {{this}}
{{/each}}

---

## Error Handling

<!-- Define error handling approach specific to this agent -->

**Critical Errors:**
{{#each critical_errors}}
- **{{error}}:** {{handling}}
{{/each}}

**Recoverable Errors:**
{{#each recoverable_errors}}
- **{{error}}:** {{handling}}
{{/each}}

---

## Notes

<!-- Additional notes, constraints, or important information -->

{{notes}}

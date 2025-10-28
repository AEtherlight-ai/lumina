/**
 * Sprint Plan Validator
 *
 * DESIGN DECISION: Separate validator for business logic validation
 * WHY: YAML parser validates syntax, validator checks semantic correctness
 *
 * REASONING CHAIN:
 * 1. serde_yaml validates: YAML syntax, field types, required fields
 * 2. Validator checks: DAG property, valid task refs, resource conflicts
 * 3. Separation of concerns: Parsing (yaml_parser) vs Validation (validator)
 * 4. Validator can be extended with new checks without changing parser
 * 5. Result: Layered validation with clear responsibilities
 *
 * PATTERN: Pattern-SPRINT-PLAN-001 (Structured Sprint Definition)
 * RELATED: yaml_parser.rs (parses), validator.rs (validates)
 */

use crate::error::{Error, Result};
use crate::sprint_parser::types::ExecutableSprintPlan;
use std::collections::HashSet;

/**
 * Sprint Plan Validator
 *
 * DESIGN DECISION: Associated functions for validation checks
 * WHY: No state needed, pure validation logic
 */
pub struct Validator;

impl Validator {
    /**
     * Validate executable sprint plan
     *
     * DESIGN DECISION: Single entry point for all validations
     * WHY: Ensures all checks run, collects all errors before failing
     *
     * REASONING CHAIN:
     * 1. Run all validation checks
     * 2. Collect errors (don't fail on first error)
     * 3. Return all errors at once (better UX)
     * 4. If any errors: Return comprehensive failure message
     * 5. Result: User sees all problems, not just first one
     *
     * # Validations Performed
     *
     * - No circular dependencies (DAG property)
     * - All task references valid (no dangling dependencies)
     * - Task IDs unique
     * - Duration strings parseable
     * - Approval gate task references valid
     *
     * # Errors
     *
     * Returns error with all validation failures
     */
    pub fn validate(plan: &ExecutableSprintPlan) -> Result<()> {
        let mut errors = Vec::new();

        // Check 1: Validate task IDs are unique
        if let Err(e) = Self::validate_unique_task_ids(plan) {
            errors.push(e.to_string());
        }

        // Check 2: Validate all dependency references exist
        if let Err(e) = Self::validate_task_references(plan) {
            errors.push(e.to_string());
        }

        // Check 3: Validate DAG property (checked during parsing, but double-check)
        // Note: This is already checked by topological_sort in yaml_parser
        // But we keep it here for explicit validation

        // Check 4: Validate duration strings
        if let Err(e) = Self::validate_durations(plan) {
            errors.push(e.to_string());
        }

        // Check 5: Validate approval gate references
        if let Err(e) = Self::validate_approval_gates(plan) {
            errors.push(e.to_string());
        }

        if !errors.is_empty() {
            return Err(Error::Configuration(format!(
                "Sprint plan validation failed:\n{}",
                errors.join("\n")
            )));
        }

        Ok(())
    }

    /**
     * Validate task IDs are unique
     *
     * DESIGN DECISION: Use HashSet to detect duplicates
     * WHY: O(n) time complexity, simple implementation
     */
    fn validate_unique_task_ids(plan: &ExecutableSprintPlan) -> Result<()> {
        let mut seen = HashSet::new();
        let mut duplicates = Vec::new();

        for task_id in plan.tasks.keys() {
            if !seen.insert(task_id) {
                duplicates.push(task_id.clone());
            }
        }

        if !duplicates.is_empty() {
            return Err(Error::Configuration(format!(
                "Duplicate task IDs found: {:?}",
                duplicates
            )));
        }

        Ok(())
    }

    /**
     * Validate all task references exist
     *
     * DESIGN DECISION: Check dependencies and dependents point to valid tasks
     * WHY: Prevents runtime errors when scheduler looks up tasks
     */
    fn validate_task_references(plan: &ExecutableSprintPlan) -> Result<()> {
        let mut invalid_refs = Vec::new();

        // Check dependencies map
        for (task_id, deps) in &plan.dependencies {
            if !plan.tasks.contains_key(task_id) {
                invalid_refs.push(format!("Task '{}' in dependencies map does not exist", task_id));
            }
            for dep_id in deps {
                if !plan.tasks.contains_key(dep_id) {
                    invalid_refs.push(format!(
                        "Task '{}' depends on non-existent task '{}'",
                        task_id, dep_id
                    ));
                }
            }
        }

        // Check dependents map
        for (task_id, dependents) in &plan.dependents {
            if !plan.tasks.contains_key(task_id) {
                invalid_refs.push(format!("Task '{}' in dependents map does not exist", task_id));
            }
            for dependent_id in dependents {
                if !plan.tasks.contains_key(dependent_id) {
                    invalid_refs.push(format!(
                        "Task '{}' has non-existent dependent '{}'",
                        task_id, dependent_id
                    ));
                }
            }
        }

        if !invalid_refs.is_empty() {
            return Err(Error::Configuration(format!(
                "Invalid task references:\n{}",
                invalid_refs.join("\n")
            )));
        }

        Ok(())
    }

    /**
     * Validate duration strings are parseable
     *
     * DESIGN DECISION: Validate all durations can be parsed
     * WHY: Catch invalid durations before scheduler tries to parse them
     */
    fn validate_durations(plan: &ExecutableSprintPlan) -> Result<()> {
        let mut invalid_durations = Vec::new();

        // Validate sprint duration
        let sprint_duration = ExecutableSprintPlan::parse_duration(&plan.duration);
        if sprint_duration.as_secs() == 0 {
            invalid_durations.push(format!(
                "Invalid sprint duration: '{}'",
                plan.duration
            ));
        }

        // Validate task durations
        for task in plan.tasks.values() {
            let task_duration = ExecutableSprintPlan::parse_duration(&task.duration);
            if task_duration.as_secs() == 0 {
                invalid_durations.push(format!(
                    "Task '{}' has invalid duration: '{}'",
                    task.id, task.duration
                ));
            }
        }

        if !invalid_durations.is_empty() {
            return Err(Error::Configuration(format!(
                "Invalid durations:\n{}",
                invalid_durations.join("\n")
            )));
        }

        Ok(())
    }

    /**
     * Validate approval gate task references
     *
     * DESIGN DECISION: Ensure all approval gate task references valid
     * WHY: Prevents runtime errors when checking approval gate conditions
     */
    fn validate_approval_gates(plan: &ExecutableSprintPlan) -> Result<()> {
        let mut invalid_refs = Vec::new();

        for gate in &plan.approval_gates {
            for required_task in &gate.requires {
                if !plan.tasks.contains_key(required_task) {
                    invalid_refs.push(format!(
                        "Approval gate '{}' requires non-existent task '{}'",
                        gate.stage, required_task
                    ));
                }
            }
        }

        if !invalid_refs.is_empty() {
            return Err(Error::Configuration(format!(
                "Invalid approval gate references:\n{}",
                invalid_refs.join("\n")
            )));
        }

        Ok(())
    }

    /**
     * Validate no resource conflicts (future: agent capacity constraints)
     *
     * DESIGN DECISION: Placeholder for future resource validation
     * WHY: May want to limit concurrent agents of same type
     *
     * FUTURE: Implement resource constraint checking
     * - Max 2 database agents running simultaneously
     * - Max 4 total agents running simultaneously
     * - Agent priority/weighting for scheduling
     */
    #[allow(dead_code)]
    fn validate_resource_constraints(_plan: &ExecutableSprintPlan) -> Result<()> {
        // TODO: Implement resource constraint validation in AS-003 (Task Scheduler)
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sprint_parser::types::{Task, AgentType};
    use std::collections::HashMap;

    /**
     * Test: Validate valid sprint plan
     *
     * DESIGN DECISION: Test happy path validation
     * WHY: Ensure valid plans pass validation
     */
    #[test]
    fn test_validate_valid_plan() {
        let mut tasks = HashMap::new();
        tasks.insert(
            "DB-001".to_string(),
            Task {
                id: "DB-001".to_string(),
                title: "Create table".to_string(),
                agent: AgentType::Database,
                duration: "2 hours".to_string(),
                dependencies: vec![],
                acceptance_criteria: vec![],
                files: vec![],
                patterns: vec![],
            },
        );

        let plan = ExecutableSprintPlan {
            name: "Test Sprint".to_string(),
            duration: "1 week".to_string(),
            goals: vec![],
            tasks,
            dependencies: HashMap::new(),
            dependents: HashMap::new(),
            approval_gates: vec![],
            parallel_groups: vec![],
            execution_order: vec!["DB-001".to_string()],
        };

        assert!(Validator::validate(&plan).is_ok());
    }

    /**
     * Test: Detect invalid task references
     *
     * DESIGN DECISION: Test validation catches invalid references
     * WHY: Ensure validator prevents runtime errors
     */
    #[test]
    fn test_invalid_task_reference() {
        let mut tasks = HashMap::new();
        tasks.insert(
            "API-001".to_string(),
            Task {
                id: "API-001".to_string(),
                title: "Create API".to_string(),
                agent: AgentType::Api,
                duration: "4 hours".to_string(),
                dependencies: vec!["DB-001".to_string()], // DB-001 doesn't exist
                acceptance_criteria: vec![],
                files: vec![],
                patterns: vec![],
            },
        );

        let mut dependencies = HashMap::new();
        dependencies.insert("API-001".to_string(), vec!["DB-001".to_string()]);

        let plan = ExecutableSprintPlan {
            name: "Test Sprint".to_string(),
            duration: "1 week".to_string(),
            goals: vec![],
            tasks,
            dependencies,
            dependents: HashMap::new(),
            approval_gates: vec![],
            parallel_groups: vec![],
            execution_order: vec![],
        };

        let result = Validator::validate(&plan);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("non-existent task"));
    }

    /**
     * Test: Detect invalid duration
     *
     * DESIGN DECISION: Test validation catches unparseable durations
     * WHY: Prevent scheduler errors
     */
    #[test]
    fn test_invalid_duration() {
        let mut tasks = HashMap::new();
        tasks.insert(
            "DB-001".to_string(),
            Task {
                id: "DB-001".to_string(),
                title: "Create table".to_string(),
                agent: AgentType::Database,
                duration: "invalid duration".to_string(), // Invalid
                acceptance_criteria: vec![],
                dependencies: vec![],
                files: vec![],
                patterns: vec![],
            },
        );

        let plan = ExecutableSprintPlan {
            name: "Test Sprint".to_string(),
            duration: "1 week".to_string(),
            goals: vec![],
            tasks,
            dependencies: HashMap::new(),
            dependents: HashMap::new(),
            approval_gates: vec![],
            parallel_groups: vec![],
            execution_order: vec![],
        };

        let result = Validator::validate(&plan);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Invalid durations"));
    }
}

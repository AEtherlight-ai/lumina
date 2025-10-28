/**
 * Progress Monitoring and Metrics Collection
 *
 * DESIGN DECISION: Real-time sprint execution metrics
 * WHY: Enable progress UI, performance analysis, continuous improvement
 *
 * REASONING CHAIN:
 * 1. Autonomous sprints need visibility: What's happening? How long will it take?
 * 2. Metrics enable: Progress bars, time estimates, bottleneck detection
 * 3. Historical data enables: Better estimates, process improvements
 * 4. ProgressMonitor tracks: Start/end times, parallel efficiency, task durations
 * 5. Result: Transparent execution with actionable metrics
 *
 * PATTERN: Pattern-MONITOR-001 (Real-Time Sprint Metrics)
 * PERFORMANCE: <5ms metrics calculation, minimal overhead
 */

use crate::sprint_parser::types::TaskId;
use std::time::{Duration, Instant};
use std::collections::HashMap;

/**
 * Sprint execution result
 *
 * DESIGN DECISION: Comprehensive metrics for sprint completion
 * WHY: Enable performance analysis and continuous improvement
 *
 * REASONING CHAIN:
 * 1. Success metrics: Total time, tasks completed, parallel efficiency
 * 2. Failure metrics: Tasks failed, error analysis
 * 3. Efficiency metrics: Actual vs theoretical time, bottlenecks
 * 4. Historical data: Feed into planning agent for better estimates
 * 5. Result: Data-driven sprint optimization
 */
#[derive(Debug, Clone)]
pub struct SprintResult {
    /// Total sprint duration (wall-clock time)
    pub total_time: Duration,
    /// Number of tasks completed successfully
    pub tasks_completed: usize,
    /// Number of tasks failed
    pub tasks_failed: usize,
    /// Parallel efficiency (0.0 to 1.0)
    /// 1.0 = perfect parallel execution
    /// 0.0 = completely sequential
    pub parallel_efficiency: f64,
    /// Theoretical minimum time (if all tasks parallel)
    pub theoretical_min_time: Duration,
    /// Actual time saved vs sequential execution
    pub time_saved: Duration,
    /// Individual task durations
    pub task_durations: HashMap<TaskId, Duration>,
}

impl SprintResult {
    /**
     * Calculate parallel efficiency
     *
     * DESIGN DECISION: Measure how well we utilized parallelism
     * WHY: Identify bottlenecks, optimize task scheduling
     *
     * FORMULA:
     * efficiency = (theoretical_max - actual) / (theoretical_max - theoretical_min)
     *
     * Where:
     * - theoretical_max = sum of all task durations (completely sequential)
     * - theoretical_min = longest single task duration (perfect parallel)
     * - actual = wall-clock time
     *
     * Examples:
     * - 4 tasks × 2h each, sequential = 8h, parallel = 2h (longest task)
     * - If actual = 2h: efficiency = (8-2)/(8-2) = 1.0 (perfect!)
     * - If actual = 5h: efficiency = (8-5)/(8-2) = 0.5 (50% efficient)
     */
    pub fn new(
        total_time: Duration,
        tasks_completed: usize,
        tasks_failed: usize,
        task_durations: HashMap<TaskId, Duration>,
    ) -> Self {
        // Calculate theoretical times
        let sum_of_durations: Duration = task_durations.values().sum();
        let longest_task = task_durations.values().max().copied().unwrap_or(Duration::ZERO);

        // Calculate parallel efficiency
        let efficiency = if sum_of_durations > longest_task {
            let saved = sum_of_durations.saturating_sub(total_time);
            let possible_savings = sum_of_durations.saturating_sub(longest_task);
            if possible_savings > Duration::ZERO {
                saved.as_secs_f64() / possible_savings.as_secs_f64()
            } else {
                1.0 // Only one task, no parallelism possible
            }
        } else {
            0.0
        };

        let time_saved = sum_of_durations.saturating_sub(total_time);

        Self {
            total_time,
            tasks_completed,
            tasks_failed,
            parallel_efficiency: efficiency,
            theoretical_min_time: longest_task,
            time_saved,
            task_durations,
        }
    }

    /**
     * Format result as human-readable summary
     */
    pub fn summary(&self) -> String {
        format!(
            "Sprint Result:\n\
             - Total time: {:.1}h\n\
             - Tasks completed: {}\n\
             - Tasks failed: {}\n\
             - Parallel efficiency: {:.1}%\n\
             - Time saved: {:.1}h\n\
             - Theoretical min: {:.1}h",
            self.total_time.as_secs_f64() / 3600.0,
            self.tasks_completed,
            self.tasks_failed,
            self.parallel_efficiency * 100.0,
            self.time_saved.as_secs_f64() / 3600.0,
            self.theoretical_min_time.as_secs_f64() / 3600.0,
        )
    }
}

/**
 * Real-time sprint metrics
 *
 * DESIGN DECISION: Lightweight metrics collected during execution
 * WHY: Minimal overhead, real-time progress updates
 */
#[derive(Debug, Clone)]
pub struct SprintMetrics {
    /// Sprint start time
    pub started_at: Instant,
    /// Current elapsed time
    pub elapsed: Duration,
    /// Number of tasks completed so far
    pub completed: usize,
    /// Number of tasks currently running
    pub running: usize,
    /// Number of tasks remaining
    pub remaining: usize,
    /// Estimated time to completion (based on current progress)
    pub estimated_remaining: Option<Duration>,
}

/**
 * Progress monitor for sprint execution
 *
 * DESIGN DECISION: Non-invasive monitoring with minimal overhead
 * WHY: Enable progress UI without impacting execution performance
 *
 * REASONING CHAIN:
 * 1. Track sprint start time
 * 2. Record each task start/complete with timestamp
 * 3. Calculate metrics on-demand (not continuously)
 * 4. Estimate remaining time based on completion rate
 * 5. Result: <5ms overhead, real-time progress visibility
 */
#[derive(Debug)]
pub struct ProgressMonitor {
    /// Sprint start time
    started_at: Option<Instant>,
    /// Task ID → Start time
    task_starts: HashMap<TaskId, Instant>,
    /// Task ID → Duration
    task_durations: HashMap<TaskId, Duration>,
    /// Total number of tasks
    total_tasks: usize,
}

impl ProgressMonitor {
    pub fn new(total_tasks: usize) -> Self {
        Self {
            started_at: None,
            task_starts: HashMap::new(),
            task_durations: HashMap::new(),
            total_tasks,
        }
    }

    /**
     * Record sprint start
     */
    pub fn start_sprint(&mut self) {
        self.started_at = Some(Instant::now());
    }

    /**
     * Record task start
     */
    pub fn start_task(&mut self, task_id: TaskId) {
        self.task_starts.insert(task_id, Instant::now());
    }

    /**
     * Record task completion
     */
    pub fn complete_task(&mut self, task_id: &TaskId) {
        if let Some(start_time) = self.task_starts.remove(task_id) {
            let duration = start_time.elapsed();
            self.task_durations.insert(task_id.clone(), duration);
        }
    }

    /**
     * Get current sprint metrics
     */
    pub fn metrics(&self, running_count: usize) -> Option<SprintMetrics> {
        let started_at = self.started_at?;
        let elapsed = started_at.elapsed();
        let completed = self.task_durations.len();
        let remaining = self.total_tasks.saturating_sub(completed).saturating_sub(running_count);

        // Estimate remaining time based on average task duration
        let estimated_remaining = if completed > 0 {
            let avg_duration = elapsed.checked_div(completed as u32)?;
            Some(avg_duration.checked_mul((remaining + running_count) as u32)?)
        } else {
            None
        };

        Some(SprintMetrics {
            started_at,
            elapsed,
            completed,
            running: running_count,
            remaining,
            estimated_remaining,
        })
    }

    /**
     * Generate final sprint result
     */
    pub fn finalize(
        self,
        tasks_completed: usize,
        tasks_failed: usize,
    ) -> Option<SprintResult> {
        let started_at = self.started_at?;
        let total_time = started_at.elapsed();

        Some(SprintResult::new(
            total_time,
            tasks_completed,
            tasks_failed,
            self.task_durations,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;

    #[test]
    fn test_sprint_result_calculation() {
        let mut task_durations = HashMap::new();
        task_durations.insert("DB-001".to_string(), Duration::from_secs(7200)); // 2h
        task_durations.insert("UI-001".to_string(), Duration::from_secs(7200)); // 2h
        task_durations.insert("API-001".to_string(), Duration::from_secs(7200)); // 2h

        // Sequential: 6h total, Parallel: 2h (longest), Actual: 3h
        let result = SprintResult::new(
            Duration::from_secs(10800), // 3h actual
            3,
            0,
            task_durations,
        );

        // Efficiency = (6h - 3h) / (6h - 2h) = 3h / 4h = 0.75 = 75%
        assert!((result.parallel_efficiency - 0.75).abs() < 0.01);
        assert_eq!(result.time_saved, Duration::from_secs(10800)); // 3h saved
    }

    #[test]
    fn test_progress_monitor() {
        let mut monitor = ProgressMonitor::new(3);
        monitor.start_sprint();

        // Start first task
        monitor.start_task("DB-001".to_string());
        thread::sleep(Duration::from_millis(10));

        // Complete first task
        monitor.complete_task(&"DB-001".to_string());

        // Check metrics
        let metrics = monitor.metrics(0).unwrap();
        assert_eq!(metrics.completed, 1);
        assert_eq!(metrics.remaining, 2);
        assert!(metrics.estimated_remaining.is_some());
    }

    #[test]
    fn test_perfect_parallel_efficiency() {
        let mut task_durations = HashMap::new();
        task_durations.insert("DB-001".to_string(), Duration::from_secs(7200));
        task_durations.insert("UI-001".to_string(), Duration::from_secs(7200));

        // Perfect parallel: actual = longest task
        let result = SprintResult::new(
            Duration::from_secs(7200), // 2h (same as longest task)
            2,
            0,
            task_durations,
        );

        // Should be 100% efficient
        assert!((result.parallel_efficiency - 1.0).abs() < 0.01);
    }
}

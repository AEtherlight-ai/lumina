/**
 * Conversation Manager Implementation
 *
 * DESIGN DECISION: Stateful manager with session storage
 * WHY: Voice conversations span multiple requests (WebSocket messages)
 *
 * REASONING CHAIN:
 * 1. User starts conversation → Create session with unique ID
 * 2. System asks clarifying question → Store in session
 * 3. User responds → Retrieve session, update intent, ask next question
 * 4. All params filled → Execute function, close session
 * 5. Session expires after 5 minutes → Clean up
 *
 * PATTERN: Pattern-CONVERSATION-001 (Multi-Turn Dialog Management)
 * PERFORMANCE: <50ms per turn processing
 */

use crate::conversation_manager::types::{
    ConversationSession, SystemResponse, SessionState, SessionError
};
use crate::function_call_generator::{FunctionCallGenerator, FunctionCall};
use crate::function_registry::{FunctionRegistry, FunctionParameter};
use std::sync::{Arc, RwLock};
use std::collections::HashMap;
use uuid::Uuid;

/**
 * Conversation Manager - Multi-Turn Dialog State Machine
 *
 * DESIGN DECISION: In-memory session storage with RwLock
 * WHY: Fast access, sessions are temporary (5 min), loss on restart acceptable
 *
 * FUTURE: Persist sessions to SQLite for recovery on crash/restart
 */
pub struct ConversationManager {
    /// Active sessions (session_id → session)
    sessions: Arc<RwLock<HashMap<String, ConversationSession>>>,

    /// Function call generator
    call_generator: Arc<FunctionCallGenerator>,

    /// Function registry (for parameter metadata)
    registry: Arc<FunctionRegistry>,

    /// Maximum turns per session
    max_turns: usize,
}

impl ConversationManager {
    /**
     * Create new conversation manager
     *
     * DESIGN DECISION: Share function call generator and registry
     * WHY: Avoid duplication, enable concurrent access
     *
     * # Arguments
     * * `call_generator` - Function call generator
     * * `registry` - Function registry
     */
    pub fn new(
        call_generator: Arc<FunctionCallGenerator>,
        registry: Arc<FunctionRegistry>,
    ) -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
            call_generator,
            registry,
            max_turns: 5,
        }
    }

    /**
     * Start new conversation session
     *
     * DESIGN DECISION: Auto-generate session ID with UUID
     * WHY: Guaranteed uniqueness across distributed systems
     *
     * # Arguments
     * * `user_id` - User identifier
     * * `initial_query` - Initial user query
     *
     * # Returns
     * * `(session_id, system_response)` - Session ID and initial response
     */
    pub fn start_session(
        &self,
        user_id: String,
        initial_query: String,
    ) -> Result<(String, SystemResponse), SessionError> {
        let session_id = Uuid::new_v4().to_string();
        let mut session = ConversationSession::new(session_id.clone(), user_id);

        // Process initial query
        let response = self.process_initial_query(&mut session, &initial_query)?;

        // Store session
        self.sessions
            .write()
            .map_err(|e| SessionError::ParameterExtractionError(e.to_string()))?
            .insert(session_id.clone(), session);

        Ok((session_id, response))
    }

    /**
     * Process turn in existing conversation
     *
     * DESIGN DECISION: Retrieve session, update intent, return next response
     * WHY: Stateful processing enables context-aware clarifications
     *
     * # Arguments
     * * `session_id` - Session identifier
     * * `user_input` - User's response to previous question
     *
     * # Returns
     * * `SystemResponse` - Next system response (question, confirmation, or result)
     */
    pub fn process_turn(
        &self,
        session_id: &str,
        user_input: String,
    ) -> Result<SystemResponse, SessionError> {
        let mut sessions = self.sessions
            .write()
            .map_err(|e| SessionError::ParameterExtractionError(e.to_string()))?;

        let session = sessions
            .get_mut(session_id)
            .ok_or_else(|| SessionError::SessionNotFound(session_id.to_string()))?;

        // Check if session expired
        if session.is_expired() {
            return Err(SessionError::SessionExpired(session_id.to_string()));
        }

        // Check max turns
        if session.turn_count() >= self.max_turns {
            session.state = SessionState::Expired;
            return Err(SessionError::MaxTurnsExceeded(self.max_turns));
        }

        // Process based on current state
        let response = match session.state {
            SessionState::Active => {
                self.process_active_turn(session, &user_input)?
            }
            SessionState::AwaitingConfirmation => {
                self.process_confirmation_turn(session, &user_input)?
            }
            _ => {
                return Err(SessionError::InvalidState {
                    expected: "Active or AwaitingConfirmation".to_string(),
                    actual: format!("{:?}", session.state),
                });
            }
        };

        // Add turn to history
        session.add_turn(user_input, response.clone());

        Ok(response)
    }

    /**
     * Cancel session
     */
    pub fn cancel_session(&self, session_id: &str) -> Result<(), SessionError> {
        let mut sessions = self.sessions
            .write()
            .map_err(|e| SessionError::ParameterExtractionError(e.to_string()))?;

        if let Some(session) = sessions.get_mut(session_id) {
            session.state = SessionState::Cancelled;
        }

        sessions.remove(session_id);
        Ok(())
    }

    /**
     * Get session by ID (for inspection/debugging)
     */
    pub fn get_session(&self, session_id: &str) -> Result<ConversationSession, SessionError> {
        let sessions = self.sessions
            .read()
            .map_err(|e| SessionError::ParameterExtractionError(e.to_string()))?;

        sessions
            .get(session_id)
            .cloned()
            .ok_or_else(|| SessionError::SessionNotFound(session_id.to_string()))
    }

    /**
     * Clean up expired sessions
     *
     * DESIGN DECISION: Periodic cleanup (not on every operation)
     * WHY: Avoid overhead on hot path
     *
     * FUTURE: Run in background thread with tokio::spawn
     */
    pub fn cleanup_expired_sessions(&self) -> usize {
        let mut sessions = self.sessions.write().unwrap();
        let initial_count = sessions.len();

        sessions.retain(|_, session| !session.is_expired());

        initial_count - sessions.len()
    }

    /**
     * Process initial query (first turn)
     */
    fn process_initial_query(
        &self,
        session: &mut ConversationSession,
        query: &str,
    ) -> Result<SystemResponse, SessionError> {
        // Generate function calls
        let function_calls = self.call_generator
            .generate(query, 1)
            .map_err(|e| SessionError::FunctionCallError(e.to_string()))?;

        if function_calls.is_empty() {
            return Ok(SystemResponse::Error {
                message: "I didn't understand that command. Could you rephrase?".to_string(),
                recoverable: true,
            });
        }

        let mut best_call = function_calls[0].clone();
        session.intent = Some(best_call.clone());

        // Check for missing required parameters
        if !best_call.missing_params.is_empty() {
            // Ask for first missing parameter
            let param_name = best_call.missing_params[0].clone();
            let function = self.registry
                .get(&best_call.function_id)
                .ok_or_else(|| SessionError::FunctionCallError(
                    format!("Function not found: {}", best_call.function_id)
                ))?;

            let param = function.parameters
                .iter()
                .find(|p| p.name == param_name)
                .ok_or_else(|| SessionError::ParameterExtractionError(
                    format!("Parameter not found: {}", param_name)
                ))?;

            return Ok(SystemResponse::AskForMissingParam {
                param_name: param.name.clone(),
                param_type: param.param_type.clone(),
                prompt: format!("What {} would you like?", param.description),
                examples: param.examples.clone(),
            });
        }

        // All params present, ask for confirmation
        session.state = SessionState::AwaitingConfirmation;
        Ok(SystemResponse::Confirmation {
            function_call: best_call.clone(),
            summary: self.generate_confirmation_summary(&best_call),
        })
    }

    /**
     * Process turn when session is active (gathering parameters)
     */
    fn process_active_turn(
        &self,
        session: &mut ConversationSession,
        user_input: &str,
    ) -> Result<SystemResponse, SessionError> {
        let intent = session.intent
            .as_mut()
            .ok_or_else(|| SessionError::InvalidState {
                expected: "Intent present".to_string(),
                actual: "No intent".to_string(),
            })?;

        // Extract parameter from user input
        let missing_param = intent.missing_params
            .first()
            .ok_or_else(|| SessionError::InvalidState {
                expected: "Missing parameters".to_string(),
                actual: "No missing parameters".to_string(),
            })?;

        let function = self.registry
            .get(&intent.function_id)
            .ok_or_else(|| SessionError::FunctionCallError(
                format!("Function not found: {}", intent.function_id)
            ))?;

        let param_def = function.parameters
            .iter()
            .find(|p| p.name == *missing_param)
            .ok_or_else(|| SessionError::ParameterExtractionError(
                format!("Parameter not found: {}", missing_param)
            ))?;

        // Extract parameter value from user input
        if let Some(value) = self.extract_parameter_value(user_input, param_def)? {
            intent.parameters.insert(missing_param.clone(), value);
            intent.missing_params.remove(0);
        } else {
            return Ok(SystemResponse::Error {
                message: format!(
                    "I couldn't extract the {} from your input. Could you try again?",
                    param_def.description
                ),
                recoverable: true,
            });
        }

        // Check if more params needed
        if !intent.missing_params.is_empty() {
            let next_param = &intent.missing_params[0];
            let param = function.parameters
                .iter()
                .find(|p| p.name == *next_param)
                .unwrap();

            return Ok(SystemResponse::AskForMissingParam {
                param_name: param.name.clone(),
                param_type: param.param_type.clone(),
                prompt: format!("And what {}?", param.description),
                examples: param.examples.clone(),
            });
        }

        // All params filled, ask for confirmation
        session.state = SessionState::AwaitingConfirmation;
        Ok(SystemResponse::Confirmation {
            function_call: intent.clone(),
            summary: self.generate_confirmation_summary(intent),
        })
    }

    /**
     * Process turn when awaiting confirmation
     */
    fn process_confirmation_turn(
        &self,
        session: &mut ConversationSession,
        user_input: &str,
    ) -> Result<SystemResponse, SessionError> {
        let user_input_lower = user_input.to_lowercase();

        // Check for affirmative response
        if user_input_lower.contains("yes")
            || user_input_lower.contains("confirm")
            || user_input_lower.contains("ok")
            || user_input_lower.contains("go ahead")
        {
            session.state = SessionState::Completed;

            let intent = session.intent.as_ref().unwrap();
            return Ok(SystemResponse::Execution {
                function_id: intent.function_id.clone(),
                result: serde_json::json!({
                    "status": "ready_to_execute",
                    "function": intent.function_id.clone(),
                    "parameters": intent.parameters,
                }),
            });
        }

        // Check for negative response
        if user_input_lower.contains("no")
            || user_input_lower.contains("cancel")
            || user_input_lower.contains("stop")
        {
            session.state = SessionState::Cancelled;
            return Ok(SystemResponse::Error {
                message: "Cancelled. Let me know if you need anything else!".to_string(),
                recoverable: false,
            });
        }

        // Ambiguous response
        Ok(SystemResponse::Clarification {
            question: "Did you want me to proceed with this action?".to_string(),
            options: vec!["Yes, go ahead".to_string(), "No, cancel".to_string()],
        })
    }

    /**
     * Extract parameter value from user input
     *
     * DESIGN DECISION: Reuse extractors from function_call_generator
     * WHY: Avoid code duplication, consistent extraction logic
     */
    fn extract_parameter_value(
        &self,
        user_input: &str,
        param: &FunctionParameter,
    ) -> Result<Option<crate::function_call_generator::ParameterValue>, SessionError> {
        use crate::function_call_generator::extractors;

        let value = match param.param_type.as_str() {
            "string" => extractors::extract_proper_noun(user_input),
            "number" => extractors::extract_number(user_input),
            "date" | "date_range" => extractors::parse_temporal_expression(user_input),
            "enum" => {
                if let Some(ref allowed) = param.allowed_values {
                    extractors::match_enum_value(user_input, allowed)
                } else {
                    extractors::match_enum_value(user_input, &param.examples)
                }
            }
            "boolean" => extractors::infer_boolean(user_input),
            _ => None,
        };

        Ok(value)
    }

    /**
     * Generate human-readable confirmation summary
     */
    fn generate_confirmation_summary(&self, function_call: &FunctionCall) -> String {
        let function = self.registry.get(&function_call.function_id);
        let function_name = function
            .map(|f| f.name.as_str())
            .unwrap_or(&function_call.function_id);

        let params_summary: Vec<String> = function_call.parameters
            .iter()
            .map(|(k, v)| format!("{} = {:?}", k, v.value))
            .collect();

        format!(
            "Execute {} with: {}?",
            function_name,
            params_summary.join(", ")
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::function_registry::{FunctionRegistry, RegisteredFunction, FunctionParameter};
    use tempfile::tempdir;
    use std::path::Path;

    #[test]
    fn test_start_session() {
        let temp_dir = tempdir().unwrap();
        let model_path = "models/all-MiniLM-L6-v2.onnx";
        let db_path = temp_dir.path().join("test_conv.db");

        if !Path::new(model_path).exists() {
            eprintln!("Skipping test: model not found");
            return;
        }

        let mut registry = FunctionRegistry::new(model_path, &db_path).unwrap();
        let function = RegisteredFunction {
            id: "test.func".to_string(),
            name: "testFunc".to_string(),
            description: "Test function".to_string(),
            parameters: vec![FunctionParameter {
                name: "name".to_string(),
                param_type: "string".to_string(),
                required: true,
                description: "name parameter".to_string(),
                examples: vec![],
                allowed_values: None,
            }],
            examples: vec!["Test query".to_string()],
            tags: vec![],
            namespace: None,
        };
        registry.register(function).unwrap();

        let registry = Arc::new(registry);
        let generator = Arc::new(FunctionCallGenerator::new(registry.clone()));
        let manager = ConversationManager::new(generator, registry);

        let (session_id, response) = manager
            .start_session("user1".to_string(), "Test query".to_string())
            .unwrap();

        assert!(!session_id.is_empty());
        matches!(response, SystemResponse::AskForMissingParam { .. });
    }

    #[test]
    fn test_cleanup_expired_sessions() {
        let temp_dir = tempdir().unwrap();
        let model_path = "models/all-MiniLM-L6-v2.onnx";
        let db_path = temp_dir.path().join("test_conv2.db");

        if !Path::new(model_path).exists() {
            eprintln!("Skipping test: model not found");
            return;
        }

        let registry = Arc::new(FunctionRegistry::new(model_path, &db_path).unwrap());
        let generator = Arc::new(FunctionCallGenerator::new(registry.clone()));
        let manager = ConversationManager::new(generator, registry);

        // No sessions initially
        let cleaned = manager.cleanup_expired_sessions();
        assert_eq!(cleaned, 0);
    }
}

/**
 * Installation Wizard - First-run setup experience
 *
 * DESIGN DECISION: Multi-step wizard with storage + domain configuration
 * WHY: Users need to choose storage allocation and domains before pattern sync
 *
 * REASONING CHAIN:
 * 1. User installs Lumina → first launch detected
 * 2. Show welcome screen with value proposition
 * 3. User chooses storage (200MB - 5GB slider)
 * 4. User selects domains (Marketing, Legal, etc.)
 * 5. Provision PostgreSQL with chosen storage
 * 6. Sync patterns from Code.NET based on domains + RAM
 * 7. Complete setup → show main app
 *
 * PATTERN: Pattern-INSTALLER-001 (First-Run Wizard)
 * RELATED: Installer-002 (Storage Configuration), Storage-001 (PostgreSQL Provisioning)
 * PERFORMANCE: <30s total setup time (including pattern sync)
 */

import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import '../styles/InstallationWizard.css';

interface InstallationState {
  currentStep: number;
  storageMB: number;
  selectedDomains: string[];
  isProvisioning: boolean;
  provisioningProgress: number;
  error: string | null;
}

const AVAILABLE_DOMAINS = [
  { id: 'marketing', name: 'Marketing & Analytics', description: 'Customer segmentation, campaign optimization' },
  { id: 'legal', name: 'Legal & Compliance', description: 'Case management, document analysis' },
  { id: 'healthcare', name: 'Healthcare', description: 'Patient records, medical coding' },
  { id: 'finance', name: 'Finance & Banking', description: 'Risk analysis, fraud detection' },
  { id: 'education', name: 'Education', description: 'Course management, student analytics' },
  { id: 'engineering', name: 'Software Engineering', description: 'Code patterns, architecture' },
];

const STORAGE_TIERS = [
  { mb: 200, patterns: 200, label: '200 MB (Free)' },
  { mb: 500, patterns: 500, label: '500 MB (Network)' },
  { mb: 1000, patterns: 1000, label: '1 GB (Pro)' },
  { mb: 2000, patterns: 2000, label: '2 GB (Team)' },
  { mb: 5000, patterns: 5000, label: '5 GB (Enterprise)' },
];

export default function InstallationWizard({ onComplete }: { onComplete: () => void }) {
  const [state, setState] = useState<InstallationState>({
    currentStep: 0,
    storageMB: 500,
    selectedDomains: [],
    isProvisioning: false,
    provisioningProgress: 0,
    error: null,
  });

  const updateState = (updates: Partial<InstallationState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const handleStorageChange = (mb: number) => {
    updateState({ storageMB: mb });
  };

  const toggleDomain = (domainId: string) => {
    setState((prev) => ({
      ...prev,
      selectedDomains: prev.selectedDomains.includes(domainId)
        ? prev.selectedDomains.filter((id) => id !== domainId)
        : [...prev.selectedDomains, domainId],
    }));
  };

  const startProvisioning = async () => {
    updateState({ isProvisioning: true, provisioningProgress: 0, error: null });

    try {
      // Step 1: Provision PostgreSQL schema (Storage-001)
      updateState({ provisioningProgress: 20 });
      await invoke('provision_postgresql', {
        storageMb: state.storageMB,
      });

      // Step 2: Setup SQLite metadata tables (Storage-003)
      updateState({ provisioningProgress: 40 });
      await invoke('setup_sqlite_metadata');

      // Step 3: Configure Code.NET pattern network (Storage-002)
      updateState({ provisioningProgress: 60 });
      await invoke('configure_pattern_network', {
        domains: state.selectedDomains,
      });

      // Step 4: Sync initial patterns (Storage-004)
      updateState({ provisioningProgress: 80 });
      await invoke('sync_initial_patterns', {
        domains: state.selectedDomains,
        storageMb: state.storageMB,
      });

      // Complete
      updateState({ provisioningProgress: 100 });
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (error) {
      console.error('Provisioning failed:', error);
      updateState({
        error: `Installation failed: ${error}`,
        isProvisioning: false,
      });
    }
  };

  const renderWelcome = () => (
    <div className="wizard-step welcome-step">
      <div className="wizard-icon">🚀</div>
      <h1>Welcome to Lumina</h1>
      <p className="subtitle">Voice-to-Intelligence for Developers</p>

      <div className="feature-list">
        <div className="feature-item">
          <span className="feature-icon">🎤</span>
          <div>
            <h3>Voice Capture</h3>
            <p>Press ` (backtick) to open voice panel or ~ (tilde) to transcribe inline</p>
          </div>
        </div>

        <div className="feature-item">
          <span className="feature-icon">🧠</span>
          <div>
            <h3>Pattern Matching</h3>
            <p>AI matches your voice to proven code patterns</p>
          </div>
        </div>

        <div className="feature-item">
          <span className="feature-icon">🔒</span>
          <div>
            <h3>Privacy First</h3>
            <p>Everything runs locally - your data stays yours</p>
          </div>
        </div>
      </div>

      <button
        className="wizard-button primary"
        onClick={() => updateState({ currentStep: 1 })}
      >
        Get Started
      </button>
    </div>
  );

  const renderStorageConfig = () => {
    const selectedTier = STORAGE_TIERS.find((t) => t.mb === state.storageMB) || STORAGE_TIERS[1];

    return (
      <div className="wizard-step storage-step">
        <h2>Choose Storage Allocation</h2>
        <p className="step-description">
          More storage = more patterns = better AI suggestions
        </p>

        <div className="storage-visual">
          <div className="storage-bar">
            <div
              className="storage-fill"
              style={{ width: `${(state.storageMB / 5000) * 100}%` }}
            />
          </div>
          <div className="storage-label">
            <span className="storage-size">{state.storageMB} MB</span>
            <span className="storage-patterns">~{selectedTier.patterns} patterns</span>
          </div>
        </div>

        <div className="storage-tiers">
          {STORAGE_TIERS.map((tier) => (
            <button
              key={tier.mb}
              className={`tier-button ${state.storageMB === tier.mb ? 'active' : ''}`}
              onClick={() => handleStorageChange(tier.mb)}
            >
              <div className="tier-label">{tier.label}</div>
              <div className="tier-patterns">{tier.patterns} patterns</div>
            </button>
          ))}
        </div>

        <div className="storage-info">
          <div className="info-icon">ℹ️</div>
          <p>
            Lumina stores pattern embeddings in PostgreSQL with pgvector.
            You can change this later in Settings.
          </p>
        </div>

        <div className="wizard-buttons">
          <button
            className="wizard-button secondary"
            onClick={() => updateState({ currentStep: 0 })}
          >
            Back
          </button>
          <button
            className="wizard-button primary"
            onClick={() => updateState({ currentStep: 2 })}
          >
            Continue
          </button>
        </div>
      </div>
    );
  };

  const renderDomainSelection = () => (
    <div className="wizard-step domain-step">
      <h2>Select Your Domains</h2>
      <p className="step-description">
        Choose domains to download relevant patterns (you can add more later)
      </p>

      <div className="domain-grid">
        {AVAILABLE_DOMAINS.map((domain) => (
          <button
            key={domain.id}
            className={`domain-card ${state.selectedDomains.includes(domain.id) ? 'selected' : ''}`}
            onClick={() => toggleDomain(domain.id)}
          >
            <div className="domain-checkbox">
              {state.selectedDomains.includes(domain.id) ? '✓' : ''}
            </div>
            <h3>{domain.name}</h3>
            <p>{domain.description}</p>
          </button>
        ))}
      </div>

      {state.selectedDomains.length === 0 && (
        <div className="domain-warning">
          <div className="warning-icon">⚠️</div>
          <p>Select at least one domain to continue</p>
        </div>
      )}

      <div className="wizard-buttons">
        <button
          className="wizard-button secondary"
          onClick={() => updateState({ currentStep: 1 })}
        >
          Back
        </button>
        <button
          className="wizard-button primary"
          onClick={() => updateState({ currentStep: 3 })}
          disabled={state.selectedDomains.length === 0}
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="wizard-step confirmation-step">
      <h2>Ready to Install</h2>
      <p className="step-description">Review your configuration</p>

      <div className="config-summary">
        <div className="summary-item">
          <span className="summary-label">Storage:</span>
          <span className="summary-value">{state.storageMB} MB</span>
        </div>

        <div className="summary-item">
          <span className="summary-label">Patterns:</span>
          <span className="summary-value">
            ~{STORAGE_TIERS.find((t) => t.mb === state.storageMB)?.patterns || 0} patterns
          </span>
        </div>

        <div className="summary-item">
          <span className="summary-label">Domains:</span>
          <span className="summary-value">{state.selectedDomains.length} selected</span>
        </div>
      </div>

      <div className="selected-domains">
        {state.selectedDomains.map((id) => {
          const domain = AVAILABLE_DOMAINS.find((d) => d.id === id);
          return (
            <div key={id} className="selected-domain-tag">
              {domain?.name}
            </div>
          );
        })}
      </div>

      <div className="wizard-buttons">
        <button
          className="wizard-button secondary"
          onClick={() => updateState({ currentStep: 2 })}
        >
          Back
        </button>
        <button
          className="wizard-button primary"
          onClick={startProvisioning}
          disabled={state.isProvisioning}
        >
          {state.isProvisioning ? 'Installing...' : 'Install Lumina'}
        </button>
      </div>
    </div>
  );

  const renderProvisioning = () => (
    <div className="wizard-step provisioning-step">
      <h2>Installing Lumina</h2>
      <p className="step-description">Setting up your local pattern library...</p>

      <div className="progress-container">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${state.provisioningProgress}%` }}
          />
        </div>
        <div className="progress-label">{state.provisioningProgress}%</div>
      </div>

      <div className="provisioning-steps">
        <div className={`provision-step ${state.provisioningProgress >= 20 ? 'complete' : ''}`}>
          <span className="step-icon">{state.provisioningProgress >= 20 ? '✓' : '⏳'}</span>
          <span>Provisioning PostgreSQL database...</span>
        </div>

        <div className={`provision-step ${state.provisioningProgress >= 40 ? 'complete' : ''}`}>
          <span className="step-icon">{state.provisioningProgress >= 40 ? '✓' : '⏳'}</span>
          <span>Setting up metadata tables...</span>
        </div>

        <div className={`provision-step ${state.provisioningProgress >= 60 ? 'complete' : ''}`}>
          <span className="step-icon">{state.provisioningProgress >= 60 ? '✓' : '⏳'}</span>
          <span>Connecting to Code.NET pattern network...</span>
        </div>

        <div className={`provision-step ${state.provisioningProgress >= 80 ? 'complete' : ''}`}>
          <span className="step-icon">{state.provisioningProgress >= 80 ? '✓' : '⏳'}</span>
          <span>Syncing {state.selectedDomains.length} domain patterns...</span>
        </div>
      </div>

      {state.error && (
        <div className="error-message">
          <div className="error-icon">❌</div>
          <p>{state.error}</p>
          <button
            className="wizard-button secondary"
            onClick={() => updateState({ currentStep: 3, error: null })}
          >
            Back to Configuration
          </button>
        </div>
      )}
    </div>
  );

  const steps = [
    renderWelcome,
    renderStorageConfig,
    renderDomainSelection,
    renderConfirmation,
  ];

  return (
    <div className="installation-wizard">
      {state.isProvisioning ? renderProvisioning() : steps[state.currentStep]()}

      <div className="wizard-footer">
        <div className="step-indicator">
          {!state.isProvisioning && steps.map((_, index) => (
            <div
              key={index}
              className={`step-dot ${index === state.currentStep ? 'active' : ''} ${index < state.currentStep ? 'complete' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

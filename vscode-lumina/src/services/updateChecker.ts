/**
 * Update Checker Service
 *
 * Checks for new versions of ÆtherLight on npm and notifies users
 * Respects user's auto-update preferences
 */

import * as vscode from 'vscode';
import * as https from 'https';

const PACKAGE_NAME = 'aetherlight';
const REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`;

interface RegistryResponse {
  version: string;
  name: string;
}

export class UpdateChecker {
  private context: vscode.ExtensionContext;
  private currentVersion: string;
  private checkTimer?: NodeJS.Timeout;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.currentVersion = this.getExtensionVersion();
  }

  /**
   * Start periodic update checks
   */
  public start(): void {
    // Check immediately on startup (after 10s delay to not slow down activation)
    setTimeout(() => this.checkForUpdates(), 10000);

    // Get check interval from settings (default: 1 hour)
    const config = vscode.workspace.getConfiguration('aetherlight');
    const intervalHours = config.get<number>('updates.checkIntervalHours', 1);
    const intervalMs = intervalHours * 60 * 60 * 1000;

    // Then check at configured interval
    this.checkTimer = setInterval(() => this.checkForUpdates(), intervalMs);
  }

  /**
   * Stop update checks
   */
  public stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = undefined;
    }
  }

  /**
   * Manually check for updates (called by user command)
   */
  public async checkNow(): Promise<void> {
    const latestVersion = await this.fetchLatestVersion();

    if (!latestVersion) {
      vscode.window.showErrorMessage('Failed to check for updates. Please try again later.');
      return;
    }

    if (this.isNewerVersion(latestVersion, this.currentVersion)) {
      this.showUpdateNotification(latestVersion);
    } else {
      vscode.window.showInformationMessage(
        `ÆtherLight is up to date (v${this.currentVersion})`
      );
    }
  }

  /**
   * Check for updates in background
   */
  private async checkForUpdates(): Promise<void> {
    const config = vscode.workspace.getConfiguration('aetherlight');
    const autoCheckEnabled = config.get<boolean>('updates.autoCheck', true);

    if (!autoCheckEnabled) {
      return;
    }

    // Get check interval from settings
    const intervalHours = config.get<number>('updates.checkIntervalHours', 1);
    const intervalMs = intervalHours * 60 * 60 * 1000;

    // Don't check more frequently than configured interval
    const lastCheck = this.context.globalState.get<number>('lastUpdateCheck', 0);
    const now = Date.now();

    if (now - lastCheck < intervalMs) {
      return;
    }

    const latestVersion = await this.fetchLatestVersion();

    if (latestVersion && this.isNewerVersion(latestVersion, this.currentVersion)) {
      // Only notify if user hasn't dismissed this version
      const dismissedVersion = this.context.globalState.get<string>('dismissedUpdateVersion');

      if (dismissedVersion !== latestVersion) {
        this.showUpdateNotification(latestVersion);
      }
    }

    this.context.globalState.update('lastUpdateCheck', now);
  }

  /**
   * Fetch latest version from npm registry
   */
  private fetchLatestVersion(): Promise<string | null> {
    return new Promise((resolve) => {
      const request = https.get(REGISTRY_URL, { timeout: 5000 }, (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            const json: RegistryResponse = JSON.parse(data);
            resolve(json.version);
          } catch (error) {
            console.error('Failed to parse npm registry response:', error);
            resolve(null);
          }
        });
      });

      request.on('error', (error) => {
        console.error('Failed to fetch latest version:', error);
        resolve(null);
      });

      request.on('timeout', () => {
        request.destroy();
        resolve(null);
      });
    });
  }

  /**
   * Compare versions (semver comparison)
   */
  private isNewerVersion(latest: string, current: string): boolean {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (latestParts[i] > currentParts[i]) return true;
      if (latestParts[i] < currentParts[i]) return false;
    }

    return false;
  }

  /**
   * Show update notification with actions
   */
  private showUpdateNotification(latestVersion: string): void {
    const config = vscode.workspace.getConfiguration('aetherlight');
    const autoUpdate = config.get<boolean>('updates.autoUpdate', false);

    const message = `ÆtherLight v${latestVersion} is available (current: v${this.currentVersion})`;

    if (autoUpdate) {
      // Auto-update enabled - just notify and update in background
      vscode.window.showInformationMessage(
        `${message}. Updating automatically...`,
        'Open Release Notes'
      ).then(action => {
        if (action === 'Open Release Notes') {
          this.openReleaseNotes(latestVersion);
        }
      });

      this.performUpdate();
    } else {
      // Manual update - show notification with actions
      vscode.window.showInformationMessage(
        message,
        'Update Now',
        'View Changes',
        'Dismiss',
        'Skip This Version'
      ).then(action => {
        switch (action) {
          case 'Update Now':
            this.performUpdate();
            break;
          case 'View Changes':
            this.openReleaseNotes(latestVersion);
            break;
          case 'Skip This Version':
            this.context.globalState.update('dismissedUpdateVersion', latestVersion);
            break;
        }
      });
    }
  }

  /**
   * Perform the update via npm
   */
  private async performUpdate(): Promise<void> {
    const terminal = vscode.window.createTerminal({
      name: 'ÆtherLight Update',
      hideFromUser: false
    });

    terminal.show(true);
    terminal.sendText('npm update -g aetherlight', true);

    vscode.window.showInformationMessage(
      'Updating ÆtherLight... Please reload VS Code after installation completes.',
      'Reload Now'
    ).then(action => {
      if (action === 'Reload Now') {
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      }
    });
  }

  /**
   * Open release notes in browser
   */
  private openReleaseNotes(version: string): void {
    const url = `https://github.com/AEtherlight-ai/lumina/releases/tag/v${version}`;
    vscode.env.openExternal(vscode.Uri.parse(url));
  }

  /**
   * Get current extension version
   */
  private getExtensionVersion(): string {
    const extension = vscode.extensions.getExtension('aetherlight.aetherlight');
    return extension?.packageJSON?.version || '0.0.0';
  }
}

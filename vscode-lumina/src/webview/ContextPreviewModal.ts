/**
 * ContextPreviewModal - Stub implementation for v0.17.5 API URL fix
 *
 * REASON: This file was imported in v0.17.4 but never created, causing compilation failures.
 * This stub allows v0.17.5 to compile and fixes the critical API URL bug.
 *
 * TODO: Implement full context preview modal functionality in future release
 */

import * as vscode from 'vscode';

/**
 * Stub modal for context preview (not yet implemented)
 */
export class ContextPreviewModal {
  private _context: vscode.ExtensionContext;
  private _data: any;

  constructor(context: vscode.ExtensionContext, data: any) {
    this._context = context;
    this._data = data;
  }

  /**
   * Show context preview modal (stub - immediately calls onProceed with original data)
   */
  show(onProceed: (data: any) => Promise<void>, onCancel?: () => void): void {
    // Stub implementation - immediately proceed with original data
    onProceed(this._data).catch(err => {
      vscode.window.showErrorMessage(`Error: ${err.message}`);
    });
  }
}

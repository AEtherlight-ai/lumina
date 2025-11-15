/**
 * LicenseValidator Test Suite - RED Phase (TDD)
 *
 * BUG-011: Extension license key validation
 * Pattern: Pattern-TDD-001 (Write tests FIRST)
 *
 * Tests Bearer token validation using GET /api/tokens/balance
 * Test credentials: CD7W-AJDK-RLQT-LUFA (free), W7HD-X79Q-CQJ9-XW13 (pro)
 */

import { expect } from 'chai';
import * as sinon from 'sinon';
import { LicenseValidator } from '../../auth/licenseValidator';

describe('LicenseValidator', () => {
  let validator: LicenseValidator;
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    validator = new LicenseValidator();
    // Stub global fetch
    fetchStub = sinon.stub(global, 'fetch' as any);
  });

  afterEach(() => {
    fetchStub.restore();
  });

  describe('validateLicenseKey', () => {
    it('should return valid result for valid free tier license key', async () => {
      // Arrange
      const licenseKey = 'CD7W-AJDK-RLQT-LUFA';
      fetchStub.resolves({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          tier: 'free',
          user_id: 'user-123',
          tokens_balance: 250000
        })
      } as Response);

      // Act
      const result = await validator.validateLicenseKey(licenseKey);

      // Assert
      expect(result.valid).to.be.true;
      expect(result.tier).to.equal('free');
      expect(result.user_id).to.equal('user-123');
      expect(fetchStub.calledOnce).to.be.true;

      // Verify correct endpoint called
      const fetchArgs = fetchStub.firstCall.args;
      expect(fetchArgs[0]).to.equal('https://www.aetherlight.ai/api/tokens/balance');

      // Verify Bearer token auth
      const headers = fetchArgs[1].headers;
      expect(headers.Authorization).to.equal('Bearer CD7W-AJDK-RLQT-LUFA');
    });

    it('should return valid result for valid pro tier license key', async () => {
      // Arrange
      const licenseKey = 'W7HD-X79Q-CQJ9-XW13';
      fetchStub.resolves({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          tier: 'pro',
          user_id: 'user-456',
          tokens_balance: 1000000
        })
      } as Response);

      // Act
      const result = await validator.validateLicenseKey(licenseKey);

      // Assert
      expect(result.valid).to.be.true;
      expect(result.tier).to.equal('pro');
      expect(result.user_id).to.equal('user-456');
    });

    it('should throw error for invalid license key (401)', async () => {
      // Arrange
      const licenseKey = 'INVALID-KEY-0000-0000';
      fetchStub.resolves({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid or missing authentication token' })
      } as Response);

      // Act & Assert
      try {
        await validator.validateLicenseKey(licenseKey);
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).to.include('Invalid license key');
      }
    });

    it('should handle network error with offline mode', async () => {
      // Arrange
      const licenseKey = 'CD7W-AJDK-RLQT-LUFA';
      fetchStub.rejects(new Error('Network error: ECONNREFUSED'));

      // Act
      const result = await validator.validateLicenseKey(licenseKey, { allowOffline: true });

      // Assert
      expect(result.valid).to.be.true;
      expect(result.tier).to.equal('offline');
      expect(result.message).to.include('Offline mode');
    });

    it('should throw error on network failure when offline mode disabled', async () => {
      // Arrange
      const licenseKey = 'CD7W-AJDK-RLQT-LUFA';
      fetchStub.rejects(new Error('Network error'));

      // Act & Assert
      try {
        await validator.validateLicenseKey(licenseKey, { allowOffline: false });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).to.include('Network error');
      }
    });

    it('should timeout after 2 seconds', async () => {
      // Arrange
      const licenseKey = 'CD7W-AJDK-RLQT-LUFA';
      fetchStub.returns(new Promise(() => {})); // Never resolves

      // Act & Assert
      const startTime = Date.now();
      try {
        await validator.validateLicenseKey(licenseKey, { timeout: 2000, allowOffline: false });
        expect.fail('Should have timed out');
      } catch (error: any) {
        const elapsed = Date.now() - startTime;
        expect(elapsed).to.be.greaterThan(1900);
        expect(elapsed).to.be.lessThan(2500);
        expect(error.message).to.include('timeout');
      }
    });

    it('should cache validation result for 24 hours', async () => {
      // Arrange
      const licenseKey = 'CD7W-AJDK-RLQT-LUFA';
      fetchStub.resolves({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          tier: 'free',
          user_id: 'user-123',
          tokens_balance: 250000
        })
      } as Response);

      // Act
      await validator.validateLicenseKey(licenseKey); // First call (hits API)
      await validator.validateLicenseKey(licenseKey); // Second call (should use cache)

      // Assert
      expect(fetchStub.calledOnce).to.be.true; // Only called once (cached on second)
    });

    it('should call API endpoint with correct URL', async () => {
      // Arrange
      const licenseKey = 'CD7W-AJDK-RLQT-LUFA';
      fetchStub.resolves({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          tier: 'free',
          user_id: 'user-123',
          tokens_balance: 250000
        })
      } as Response);

      // Act
      await validator.validateLicenseKey(licenseKey);

      // Assert
      const fetchArgs = fetchStub.firstCall.args;
      expect(fetchArgs[0]).to.equal('https://www.aetherlight.ai/api/tokens/balance');
    });

    it('should handle 429 rate limit error gracefully', async () => {
      // Arrange
      const licenseKey = 'CD7W-AJDK-RLQT-LUFA';
      fetchStub.resolves({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' })
      } as Response);

      // Act & Assert
      try {
        await validator.validateLicenseKey(licenseKey);
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).to.include('Rate limit');
      }
    });

    it('should clear cache when clearCache() called', async () => {
      // Arrange
      const licenseKey = 'CD7W-AJDK-RLQT-LUFA';
      fetchStub.resolves({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          tier: 'free',
          user_id: 'user-123',
          tokens_balance: 250000
        })
      } as Response);

      // Act
      await validator.validateLicenseKey(licenseKey); // First call (cached)
      validator.clearCache(); // Clear cache
      await validator.validateLicenseKey(licenseKey); // Second call (should hit API again)

      // Assert
      expect(fetchStub.calledTwice).to.be.true; // Called twice (cache cleared)
    });
  });
});

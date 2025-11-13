/**
 * TierGate Test Suite - RED Phase (TDD)
 *
 * BUG-011: Feature gating based on user tier
 * Pattern: Pattern-TDD-001 (Write tests FIRST)
 *
 * Tests tier-based feature access control
 * Free tier: No voice capture, all other features allowed
 * Paid tiers: All features allowed
 */

import { expect } from 'chai';
import { TierGate } from '../../auth/tierGate';

describe('TierGate', () => {
  let tierGate: TierGate;

  beforeEach(() => {
    tierGate = new TierGate();
  });

  describe('canUseFeature', () => {
    it('should block voice capture for free tier', () => {
      // Arrange
      tierGate.setUserTier('free');

      // Act
      const canUse = tierGate.canUseFeature('voiceCapture');

      // Assert
      expect(canUse).to.be.false;
    });

    it('should allow voice capture for paid tiers', () => {
      // Arrange
      const paidTiers: Array<'pro' | 'network' | 'enterprise'> = ['pro', 'network', 'enterprise'];

      // Act & Assert
      paidTiers.forEach(tier => {
        tierGate.setUserTier(tier);
        expect(tierGate.canUseFeature('voiceCapture')).to.be.true;
      });
    });

    it('should block voice capture for offline mode', () => {
      // Arrange
      tierGate.setUserTier('offline');

      // Act
      const canUse = tierGate.canUseFeature('voiceCapture');

      // Assert
      expect(canUse).to.be.false; // Offline mode = no voice capture (can't validate credits)
    });

    it('should allow all non-voice features for free tier', () => {
      // Arrange
      tierGate.setUserTier('free');
      const freeFeatures: Array<'sprintPanel' | 'codeAnalyzer' | 'taskTracking' | 'workspaceAnalysis'> =
        ['sprintPanel', 'codeAnalyzer', 'taskTracking', 'workspaceAnalysis'];

      // Act & Assert
      freeFeatures.forEach(feature => {
        expect(tierGate.canUseFeature(feature)).to.be.true;
      });
    });

    it('should throw error if tier not set', () => {
      // Arrange
      const newGate = new TierGate();

      // Act & Assert
      expect(() => newGate.canUseFeature('voiceCapture')).to.throw('User tier not set');
    });
  });

  describe('getFeatureGates', () => {
    it('should return correct feature gates for free tier', () => {
      // Arrange
      tierGate.setUserTier('free');

      // Act
      const gates = tierGate.getFeatureGates();

      // Assert
      expect(gates.voiceCapture).to.be.false;
      expect(gates.sprintPanel).to.be.true;
      expect(gates.codeAnalyzer).to.be.true;
      expect(gates.taskTracking).to.be.true;
      expect(gates.workspaceAnalysis).to.be.true;
    });

    it('should return all features enabled for pro tier', () => {
      // Arrange
      tierGate.setUserTier('pro');

      // Act
      const gates = tierGate.getFeatureGates();

      // Assert
      expect(gates.voiceCapture).to.be.true;
      expect(gates.sprintPanel).to.be.true;
      expect(gates.codeAnalyzer).to.be.true;
      expect(gates.taskTracking).to.be.true;
      expect(gates.workspaceAnalysis).to.be.true;
    });

    it('should return all features enabled for network tier', () => {
      // Arrange
      tierGate.setUserTier('network');

      // Act
      const gates = tierGate.getFeatureGates();

      // Assert
      expect(gates.voiceCapture).to.be.true;
      expect(gates.sprintPanel).to.be.true;
    });

    it('should return all features enabled for enterprise tier', () => {
      // Arrange
      tierGate.setUserTier('enterprise');

      // Act
      const gates = tierGate.getFeatureGates();

      // Assert
      expect(gates.voiceCapture).to.be.true;
      expect(gates.sprintPanel).to.be.true;
    });

    it('should throw error if tier not set', () => {
      // Arrange
      const newGate = new TierGate();

      // Act & Assert
      expect(() => newGate.getFeatureGates()).to.throw('User tier not set');
    });
  });

  describe('getUserTier', () => {
    it('should return null if tier not set', () => {
      // Arrange
      const newGate = new TierGate();

      // Act
      const tier = newGate.getUserTier();

      // Assert
      expect(tier).to.be.null;
    });

    it('should return set tier', () => {
      // Arrange
      tierGate.setUserTier('pro');

      // Act
      const tier = tierGate.getUserTier();

      // Assert
      expect(tier).to.equal('pro');
    });
  });
});

/**
 * Viral Invitation Panel Component
 *
 * DESIGN DECISION: Show storage bonus as primary incentive (not points/money)
 * WHY: Storage = tangible value users understand, immediate benefit
 *
 * REASONING CHAIN:
 * 1. Display current storage usage (50MB used / 500MB total)
 * 2. Show viral bonus calculation (+20MB per invite × 10 invites = +200MB)
 * 3. Generate unique invitation link (contains referral code)
 * 4. Track invitation status (pending, accepted, expired)
 * 5. Update storage quota in real-time when invites convert
 * 6. Result: Clear value proposition drives viral K-factor >1.5
 *
 * PATTERN: Pattern-VIRAL-001 (Storage-Based Viral Growth Mechanics)
 * RELATED: Pattern-BUSINESS-001 (Zero-Marginal-Cost Network Effects)
 * UX: Simple, transparent, no dark patterns
 */

import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import '../styles/InvitationPanel.css';

interface InvitationPanelProps {
    currentTier: 'free' | 'network' | 'pro' | 'enterprise';
}

interface StorageStats {
    used_mb: number;
    base_mb: number;
    bonus_mb: number;
    total_mb: number;
    percentage_used: number;
}

interface Invitation {
    id: string;
    email: string;
    status: 'pending' | 'accepted' | 'expired';
    created_at: string;
}

const InvitationPanel: React.FC<InvitationPanelProps> = ({ currentTier }) => {
    const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [inviteLink, setInviteLink] = useState<string>('');
    const [copySuccess, setCopySuccess] = useState<boolean>(false);

    /**
     * Storage bonus per tier
     *
     * DESIGN DECISION: Tiered bonuses incentivize upgrades
     * WHY: Higher tiers = higher bonus → encourages paid conversion
     */
    const BONUS_PER_INVITE = {
        free: 0,       // Free tier: no viral bonus (upgrade incentive)
        network: 10,   // Network: +10MB per invite
        pro: 20,       // Pro: +20MB per invite (2× Network)
        enterprise: 50 // Enterprise: +50MB per invite (5× Network)
    };

    const BONUS_CAP = {
        free: 0,
        network: 250,   // Max 250MB bonus (25 invites)
        pro: 1000,      // Max 1GB bonus (50 invites)
        enterprise: 10000 // Max 10GB bonus (200 invites)
    };

    useEffect(() => {
        loadStorageStats();
        loadInvitations();
        generateInviteLink();

        // Refresh stats every 30 seconds (check for new acceptances)
        const interval = setInterval(() => {
            loadStorageStats();
            loadInvitations();
        }, 30000);

        return () => clearInterval(interval);
    }, [currentTier]);

    const loadStorageStats = async () => {
        try {
            const stats = await invoke<StorageStats>('get_storage_stats');
            setStorageStats(stats);
        } catch (error) {
            console.error('Failed to load storage stats:', error);
        }
    };

    const loadInvitations = async () => {
        try {
            const invites = await invoke<Invitation[]>('get_my_invitations');
            setInvitations(invites);
        } catch (error) {
            console.error('Failed to load invitations:', error);
        }
    };

    const generateInviteLink = async () => {
        try {
            const referralCode = await invoke<string>('generate_referral_code');
            const link = `https://aetherlight.ai/join?ref=${referralCode}`;
            setInviteLink(link);
        } catch (error) {
            console.error('Failed to generate referral code:', error);
        }
    };

    /**
     * Copy invitation link to clipboard
     *
     * DESIGN DECISION: One-click copy (no multi-step flow)
     * WHY: Reduce friction = higher viral K-factor
     */
    const copyInviteLink = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (error) {
            console.error('Failed to copy link:', error);
        }
    };

    const shareViaEmail = () => {
        const subject = encodeURIComponent('Join me on ÆtherLight!');
        const body = encodeURIComponent(
            `I'm using ÆtherLight for pattern recognition and I thought you'd love it too.\n\n` +
            `Join here: ${inviteLink}\n\n` +
            `We both get bonus storage when you sign up!`
        );
        window.open(`mailto:?subject=${subject}&body=${body}`);
    };

    if (!storageStats) {
        return <div className="invitation-panel loading">Loading...</div>;
    }

    const acceptedInvites = invitations.filter(i => i.status === 'accepted');
    const pendingInvites = invitations.filter(i => i.status === 'pending');

    return (
        <div className="invitation-panel">
            <h2>🚀 Grow Your Storage</h2>

            {/* Storage Stats */}
            <div className="storage-stats">
                <div className="storage-bar-container">
                    <div
                        className="storage-bar-used"
                        style={{ width: `${storageStats.percentage_used}%` }}
                    >
                        <span className="storage-bar-label">
                            {storageStats.percentage_used.toFixed(1)}%
                        </span>
                    </div>
                </div>
                <p className="storage-breakdown">
                    <strong>{storageStats.used_mb} MB</strong> used / <strong>{storageStats.total_mb} MB</strong> total
                    <br />
                    <span className="storage-detail">
                        ({storageStats.base_mb} MB base + {storageStats.bonus_mb} MB bonus)
                    </span>
                </p>
            </div>

            {/* Free Tier Upgrade CTA */}
            {currentTier === 'free' && (
                <div className="upgrade-cta">
                    <p>
                        💡 <strong>Upgrade to Network tier</strong> to earn +10MB per invited user!
                    </p>
                    <button className="btn-primary">Upgrade to Network ($4.99/mo)</button>
                </div>
            )}

            {/* Paid Tier Invitation CTA */}
            {currentTier !== 'free' && (
                <div className="invite-cta">
                    <p className="invite-bonus-text">
                        Earn <strong className="bonus-amount">+{BONUS_PER_INVITE[currentTier]} MB</strong> per invited user
                        (up to {BONUS_CAP[currentTier]} MB total)
                    </p>

                    <div className="invite-link-box">
                        <input
                            type="text"
                            value={inviteLink}
                            readOnly
                            onClick={copyInviteLink}
                            className="invite-link-input"
                        />
                        <button
                            onClick={copyInviteLink}
                            className={`btn-copy ${copySuccess ? 'copied' : ''}`}
                        >
                            {copySuccess ? '✓ Copied!' : '📋 Copy Link'}
                        </button>
                    </div>

                    <div className="share-buttons">
                        <button onClick={shareViaEmail} className="btn-share">
                            📧 Share via Email
                        </button>
                    </div>
                </div>
            )}

            {/* Invitation List */}
            {invitations.length > 0 && (
                <div className="invitation-list">
                    <h3>Your Invitations ({invitations.length})</h3>
                    <div className="invitation-items">
                        {invitations.map(invite => (
                            <div key={invite.id} className="invitation-item">
                                <span className="invite-email">{invite.email || 'Pending signup'}</span>
                                <span className={`invite-status status-${invite.status}`}>
                                    {invite.status === 'pending' && '⏳ Pending'}
                                    {invite.status === 'accepted' && (
                                        <span className="status-accepted">
                                            ✅ +{BONUS_PER_INVITE[currentTier]} MB
                                        </span>
                                    )}
                                    {invite.status === 'expired' && '❌ Expired'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Potential Bonus Preview */}
            {pendingInvites.length > 0 && (
                <div className="potential-bonus">
                    <p>
                        💡 <strong>{pendingInvites.length * BONUS_PER_INVITE[currentTier]} MB</strong> more
                        when your pending invites sign up!
                    </p>
                </div>
            )}

            {/* K-Factor Stats (for power users) */}
            {acceptedInvites.length >= 5 && (
                <div className="k-factor-stats">
                    <h4>📊 Your Viral Impact</h4>
                    <div className="stat">
                        <span className="stat-label">Total Invites:</span>
                        <span className="stat-value">{invitations.length}</span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">Conversions:</span>
                        <span className="stat-value">{acceptedInvites.length}</span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">Conversion Rate:</span>
                        <span className="stat-value">
                            {((acceptedInvites.length / invitations.length) * 100).toFixed(1)}%
                        </span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">Storage Earned:</span>
                        <span className="stat-value">{storageStats.bonus_mb} MB</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvitationPanel;

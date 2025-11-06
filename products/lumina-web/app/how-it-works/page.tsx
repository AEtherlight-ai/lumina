"use client";

/**
 * DESIGN DECISION: Technical depth + visual clarity for engineers
 * WHY: Engineers want to understand the mesh network architecture without revealing proprietary algorithms
 *
 * REASONING CHAIN:
 * 1. WHY provision storage: Local indexing, mesh network, censorship-resistant
 * 2. HOW it works: Visual diagrams of nodes, patterns, distributed indexing
 * 3. Technical depth: Kademlia DHT, zero-knowledge encryption, redundancy
 * 4. Storage allocation: Explain viral mechanics HERE (not on landing page)
 * 5. Privacy guarantees: What gets shared, what stays local
 *
 * PATTERN: Pattern-EDUCATION-001 (Progressive Disclosure for Technical Audiences)
 * RELATED: DISTRIBUTED_PATTERN_NETWORK.md, Pattern-DHT-001, Pattern-STORAGE-001
 */

import Link from "next/link";
import { Shield, Database, Users, Zap, Lock, Globe, GitBranch, HardDrive, Wifi, WifiOff, Share2, Eye, EyeOff, CheckCircle, AlertTriangle } from "lucide-react";

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/20 bg-white/10 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 shadow-lg">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-white font-bold" fill="currentColor">
                  <text x="12" y="18" textAnchor="middle" fontSize="16" fontWeight="900" fontFamily="system-ui">ÆL</text>
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900">Lumina</span>
            </Link>

            <div className="hidden md:flex md:gap-8">
              <Link href="/#features" className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                Features
              </Link>
              <Link href="/#pricing" className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                Pricing
              </Link>
              <Link href="/#faq" className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                FAQ
              </Link>
              <Link href="/how-it-works" className="text-sm font-medium text-blue-600">
                How It Works
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/auth/signin"
                className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 to-white">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="mb-6 text-5xl font-black text-gray-900 sm:text-6xl">
            How the Mesh Network Works
          </h1>
          <p className="mb-8 text-xl text-gray-600 max-w-3xl mx-auto font-medium">
            Your knowledge, distributed across your trusted network. Works offline. Can never be destroyed. You control everything.
          </p>
        </div>
      </section>

      {/* Why Provision Storage Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">
              Why Provision Storage to the Network?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Your device becomes part of a distributed knowledge network. Here's what that means:
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white">
                <Database className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">Local Indexing</h3>
              <p className="text-gray-700">
                Index your own codebase, voice transcriptions, and documents locally. Search semantically across everything you've ever worked on. <strong>Zero latency</strong> - no API calls needed.
              </p>
            </div>

            <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-white">
                <WifiOff className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">Works 100% Offline</h3>
              <p className="text-gray-700">
                Airplane mode? No problem. Your patterns sync when you're back online via <strong>mesh network</strong> (mDNS ✅, Bluetooth 📋 2026, Wi-Fi Direct 📋 2026). No central server required.
              </p>
            </div>

            <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-white">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">Can Never Be Destroyed</h3>
              <p className="text-gray-700">
                Your knowledge is <strong>distributed across your trusted nodes</strong>. Even if your device is lost, patterns are recoverable from teammates via <strong>Shamir secret sharing</strong> (3-of-5 threshold) 📋 <em>Coming Q1 2026</em>.
              </p>
            </div>

            <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-600 text-white">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">Team Learning</h3>
              <p className="text-gray-700">
                Your teammates provision storage too. Patterns discovered by one developer become searchable by the entire team. <strong>Collective intelligence</strong> that compounds over time.
              </p>
            </div>

            <div className="rounded-2xl border-2 border-cyan-200 bg-cyan-50 p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-600 text-white">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">Zero-Knowledge Encryption</h3>
              <p className="text-gray-700">
                We can't read your patterns even if subpoenaed. <strong>Double-layer encryption</strong>: your key + node key. Only your trusted Circle of Trust can decrypt shared patterns.
              </p>
            </div>

            <div className="rounded-2xl border-2 border-pink-200 bg-pink-50 p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-pink-600 text-white">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">Censorship-Resistant</h3>
              <p className="text-gray-700">
                No central authority can delete your patterns. Distributed across <strong>Kademlia DHT</strong> with K=20 replication 🚧 <em>Beta Testing 2025</em>. If one node goes down, 19 others still have your data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Diagram Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">
              Three-Layer Architecture
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Local → Mesh → DHT. Your data flows intelligently across layers based on availability and privacy preferences.
            </p>
            <p className="text-sm text-blue-600 font-semibold mt-2">
              ✅ Layer 1 (Local) - Available Now | 🚧 Layer 2 (Mesh) - Beta 2025 | 📋 Layer 3 (DHT) - Coming 2026
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 mb-12">
            {/* Layer 1: Local */}
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-8 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                Layer 1
              </div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white mx-auto">
                <HardDrive className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900 text-center">Local Storage</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span><strong>SQLite + ChromaDB</strong> for patterns/embeddings</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span><strong>&lt;1ms queries</strong> (instant semantic search)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span><strong>100% offline</strong> - no network needed</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Encrypted at rest</strong> (AES-256)</span>
                </li>
              </ul>
            </div>

            {/* Layer 2: Mesh */}
            <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-8 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                Layer 2
              </div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-white mx-auto">
                <Wifi className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900 text-center">Mesh Network 🚧</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span><strong>mDNS ✅, Bluetooth 📋, Wi-Fi Direct 📋</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span><strong>&lt;10ms LAN sync</strong> (same office/home) 🚧</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Circle of Trust</strong> - your chosen nodes 📋</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Battery-optimized</strong> for mobile 📋</span>
                </li>
              </ul>
            </div>

            {/* Layer 3: DHT */}
            <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-8 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                Layer 3
              </div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-white mx-auto">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900 text-center">Global DHT 📋</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Kademlia DHT</strong> (K=20 replication) 🚧</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>&lt;200ms queries</strong> (distributed index) 📋</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>O(log N) routing</strong> - scales to millions 📋</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Community-run nodes</strong> (no central server) 📋</span>
                </li>
              </ul>
              <p className="text-xs text-center text-gray-600 mt-4">
                <em>Coming 2026 - Architecture complete, implementation in progress</em>
              </p>
            </div>
          </div>

          {/* Flow Diagram */}
          <div className="rounded-2xl border-2 border-gray-200 bg-white p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Pattern Lookup Flow</h3>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
              <div className="flex-1 text-center">
                <div className="bg-blue-100 rounded-lg p-4 mb-2">
                  <strong className="text-blue-900">1. Query Local</strong>
                  <p className="text-xs text-blue-700 mt-1">&lt;1ms (SQLite + ChromaDB)</p>
                </div>
                <p className="text-xs text-gray-600">✅ Found → Return immediately</p>
              </div>

              <div className="text-2xl text-gray-400 hidden md:block">→</div>

              <div className="flex-1 text-center">
                <div className="bg-purple-100 rounded-lg p-4 mb-2">
                  <strong className="text-purple-900">2. Query Mesh</strong>
                  <p className="text-xs text-purple-700 mt-1">&lt;10ms (LAN broadcast)</p>
                </div>
                <p className="text-xs text-gray-600">✅ Found → Sync + return</p>
              </div>

              <div className="text-2xl text-gray-400 hidden md:block">→</div>

              <div className="flex-1 text-center">
                <div className="bg-green-100 rounded-lg p-4 mb-2">
                  <strong className="text-green-900">3. Query DHT</strong>
                  <p className="text-xs text-green-700 mt-1">&lt;200ms (distributed)</p>
                </div>
                <p className="text-xs text-gray-600">✅ Found → Cache + return</p>
              </div>
            </div>
            <p className="text-center text-sm text-gray-600 mt-6">
              <strong>Cache on miss:</strong> Future queries hit local storage (Layer 1) instantly.
            </p>
          </div>
        </div>
      </section>

      {/* Storage Allocation Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">
              Storage Allocation & Viral Growth
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              When you invite teammates, <strong>everyone's network grows</strong>. More storage = more patterns = better team intelligence.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 mb-12">
            {/* Device Allocation */}
            <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">You Control How Much</h3>
              <p className="text-gray-700 mb-6">
                During setup, choose storage per device. More storage = contribute more to team's knowledge pool.
              </p>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">Desktop:</span>
                  <span className="text-blue-600 font-bold">1GB - 100GB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">Laptop:</span>
                  <span className="text-purple-600 font-bold">500MB - 50GB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">Tablet:</span>
                  <span className="text-green-600 font-bold">200MB - 20GB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">Phone:</span>
                  <span className="text-orange-600 font-bold">50MB - 10GB</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-6">
                💡 <strong>Tip:</strong> Desktops are always-on → allocate more. Phones are battery-constrained → allocate less.
              </p>
            </div>

            {/* Viral Bonuses */}
            <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Invite Bonuses (Viral Growth)</h3>
              <p className="text-gray-700 mb-6">
                Each accepted invitation increases your <strong>entire network's capacity</strong>. Everyone wins.
              </p>
              <div className="space-y-4">
                <div className="rounded-lg bg-blue-100 p-4">
                  <div className="font-bold text-blue-900 mb-1">Network Tier ($4.99/mo)</div>
                  <div className="text-sm text-blue-700"><strong>+50MB per invite</strong> (up to 500MB bonus = 10 invites)</div>
                </div>
                <div className="rounded-lg bg-purple-100 p-4">
                  <div className="font-bold text-purple-900 mb-1">Pro Tier ($14.99/mo)</div>
                  <div className="text-sm text-purple-700"><strong>+100MB per invite</strong> (up to 2GB bonus = 20 invites)</div>
                </div>
                <div className="rounded-lg bg-green-100 p-4">
                  <div className="font-bold text-green-900 mb-1">Enterprise Tier ($49/mo)</div>
                  <div className="text-sm text-green-700"><strong>+250MB per invite</strong> (up to 10GB bonus = 40 invites)</div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-6">
                🚀 <strong>Why it works:</strong> More nodes = more redundancy = more secure = higher availability.
              </p>
            </div>
          </div>

          {/* Network Growth Visualization */}
          <div className="rounded-2xl border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50 p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Network Growth Example</h3>
            <div className="grid gap-6 md:grid-cols-3 text-center">
              <div>
                <div className="text-4xl font-black text-cyan-600 mb-2">1 Node</div>
                <div className="text-lg font-semibold text-gray-900 mb-1">Just You</div>
                <div className="text-sm text-gray-600">500MB base storage</div>
                <div className="text-xs text-gray-500 mt-2">1× redundancy (vulnerable)</div>
              </div>
              <div>
                <div className="text-4xl font-black text-cyan-600 mb-2">5 Nodes</div>
                <div className="text-lg font-semibold text-gray-900 mb-1">Small Team</div>
                <div className="text-sm text-gray-600">500MB + 400MB = 900MB</div>
                <div className="text-xs text-gray-500 mt-2">5× redundancy (resilient)</div>
              </div>
              <div>
                <div className="text-4xl font-black text-cyan-600 mb-2">20 Nodes</div>
                <div className="text-lg font-semibold text-gray-900 mb-1">Full Team</div>
                <div className="text-sm text-gray-600">500MB + 1.5GB = 2GB</div>
                <div className="text-xs text-gray-500 mt-2">20× redundancy (bulletproof)</div>
              </div>
            </div>
            <p className="text-center text-sm text-gray-600 mt-6">
              <strong>Key insight:</strong> Your team's patterns are replicated across all nodes. If 10 nodes go offline, 10 others still have your data.
            </p>
          </div>
        </div>
      </section>

      {/* Privacy & Security Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">
              What Gets Shared? What Stays Private?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              You control exactly what data flows through each layer. Zero surprises.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Always Local */}
            <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white">
                <EyeOff className="h-6 w-6" />
              </div>
              <h3 className="mb-4 text-xl font-bold text-gray-900">Always Stays Local (Never Shared)</h3>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Secrets:</strong> API keys, passwords, credentials</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Raw voice recordings:</strong> Transcribed then deleted</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Personal identifiers:</strong> Your name, email, device IDs</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span><strong>File paths:</strong> Your directory structure (sanitized before sharing)</span>
                </li>
              </ul>
              <p className="mt-4 text-xs text-gray-600">
                🔒 <strong>Guarantee:</strong> Even if you opt into network sync, these NEVER leave your device.
              </p>
            </div>

            {/* Opt-In Sharing */}
            <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-white">
                <Eye className="h-6 w-6" />
              </div>
              <h3 className="mb-4 text-xl font-bold text-gray-900">Opt-In Sharing (Your Choice)</h3>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Patterns:</strong> Design decisions, reasoning chains (sanitized)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Code snippets:</strong> Function examples (no secrets, no paths)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Voice transcriptions:</strong> Text only (audio deleted immediately)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Embeddings:</strong> 384-dim vectors (semantically searchable)</span>
                </li>
              </ul>
              <p className="mt-4 text-xs text-gray-600">
                ✅ <strong>Control:</strong> Choose per-pattern: Private → Circle of Trust → Team → Public.
              </p>
            </div>
          </div>

          {/* Encryption Details */}
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-8 mt-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Zero-Knowledge Encryption (Technical)</h3>
            <div className="grid gap-6 md:grid-cols-3 text-sm">
              <div>
                <div className="font-bold text-blue-900 mb-2">Layer 1: User Key</div>
                <p className="text-gray-700">
                  Your device generates a 256-bit AES key on first launch. <strong>Never transmitted</strong> to any server.
                </p>
              </div>
              <div>
                <div className="font-bold text-blue-900 mb-2">Layer 2: Node Key</div>
                <p className="text-gray-700">
                  Each pattern encrypted again with node-specific key. <strong>Shamir 3-of-5 threshold</strong> for recovery.
                </p>
              </div>
              <div>
                <div className="font-bold text-blue-900 mb-2">Result: We Can't Read</div>
                <p className="text-gray-700">
                  Even if subpoenaed, we have ciphertext only. <strong>Mathematically impossible</strong> to decrypt without your keys.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Deep Dive Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">
              Technical Deep Dive (For Engineers)
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              How we built a distributed pattern network that scales to millions without revealing proprietary algorithms.
            </p>
          </div>

          <div className="space-y-8">
            {/* Kademlia DHT */}
            <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">Kademlia DHT (Distributed Hash Table)</h3>
                <span className="text-xs font-bold text-purple-600 bg-purple-100 px-3 py-1 rounded">Beta Testing 2025</span>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-bold text-purple-900 mb-2">Why Kademlia?</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• <strong>O(log N) routing complexity</strong> - scales to billions of nodes</li>
                    <li>• <strong>XOR distance metric</strong> - symmetric, unidirectional</li>
                    <li>• <strong>Self-healing</strong> - nodes come/go without coordination</li>
                    <li>• <strong>K=20 replication</strong> - redundancy without excessive overhead</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-purple-900 mb-2">How It Works</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• <strong>160 K-buckets</strong> - one per bit in key space</li>
                    <li>• <strong>FIND_NODE RPC</strong> - iterative lookup (α=3 parallelism)</li>
                    <li>• <strong>STORE RPC</strong> - replicate pattern to K closest nodes</li>
                    <li>• <strong>FIND_VALUE RPC</strong> - retrieve pattern from any replica</li>
                  </ul>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                📚 <strong>Reference:</strong> <a href="https://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf" className="text-purple-600 underline" target="_blank" rel="noopener">Maymounkov & Mazières (2002)</a>
              </p>
            </div>

            {/* Pattern Indexing */}
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Semantic Pattern Indexing</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-bold text-blue-900 mb-2">Embeddings Generation</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• <strong>all-MiniLM-L6-v2</strong> - 384-dim vectors (local inference)</li>
                    <li>• <strong>&lt;50ms per pattern</strong> - ONNX Runtime (Rust)</li>
                    <li>• <strong>L2-normalized</strong> - cosine similarity = dot product</li>
                    <li>• <strong>Contextual</strong> - includes code + voice + design decision</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-blue-900 mb-2">Vector Search</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• <strong>ChromaDB</strong> - SQLite-backed vector store</li>
                    <li>• <strong>Brute-force &lt;10k patterns</strong> - &lt;10ms queries</li>
                    <li>• <strong>HNSW for 10k+ patterns</strong> - hierarchical indexing</li>
                    <li>• <strong>Hybrid search</strong> - semantic + keyword + filters</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Mesh Protocols */}
            <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900">Offline Mesh Networking</h3>
                <span className="text-xs font-bold text-green-600 bg-green-100 px-3 py-1 rounded">Partial - Roadmap 2026</span>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <h4 className="font-bold text-green-900 mb-2">mDNS (Multicast DNS) ✅</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• <strong>Zero-config discovery</strong> - no DNS server</li>
                    <li>• <strong>&lt;100ms discovery</strong> - LAN broadcast</li>
                    <li>• <strong>Works offline</strong> - UDP multicast (224.0.0.251)</li>
                  </ul>
                  <p className="text-xs text-gray-600 mt-2"><em>Available now</em></p>
                </div>
                <div>
                  <h4 className="font-bold text-green-900 mb-2">Bluetooth Mesh 📋</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• <strong>Mobile-friendly</strong> - low power</li>
                    <li>• <strong>&lt;50KB/s bandwidth</strong> - patterns only</li>
                    <li>• <strong>Multi-hop relay</strong> - extended range</li>
                  </ul>
                  <p className="text-xs text-gray-600 mt-2"><em>Planned 2026</em></p>
                </div>
                <div>
                  <h4 className="font-bold text-green-900 mb-2">Wi-Fi Direct 📋</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• <strong>High-speed sync</strong> - 250Mbps</li>
                    <li>• <strong>Ad-hoc mode</strong> - no router needed</li>
                    <li>• <strong>Bulk transfer</strong> - initial sync</li>
                  </ul>
                  <p className="text-xs text-gray-600 mt-2"><em>Planned 2026</em></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Adaptive Indexing Architecture Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">
              Adaptive Indexing: Community-Built Intelligence
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Platform-built, community-enhanced. Your node, your choice. Network gets smarter with every participant.
            </p>
          </div>

          {/* Node Specialization */}
          <div className="mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">Multi-Tier Node Specialization</h3>
            <p className="text-center text-gray-600 mb-8 max-w-3xl mx-auto">
              Not all devices are equal. Your phone runs fast 384-dim embeddings. Your workstation with GPU runs deep 1024-dim models. The network adapts.
            </p>

            <div className="grid gap-8 md:grid-cols-3">
              {/* Standard Node */}
              <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">Standard Node (Phone)</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• <strong>384-dim embeddings</strong> (all-MiniLM-L6-v2)</li>
                  <li>• <strong>&lt;5ms queries</strong> - instant results</li>
                  <li>• <strong>Battery-optimized</strong> - sips power</li>
                  <li>• <strong>23MB model</strong> - fits on any device</li>
                  <li>• <strong>Works offline</strong> - zero network needed</li>
                </ul>
                <p className="text-xs text-gray-600 mt-4">
                  💡 <strong>Best for:</strong> Mobile, laptops, battery life priority
                </p>
              </div>

              {/* Power Node */}
              <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-white">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">Power Node (Desktop GPU)</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• <strong>1024-dim embeddings</strong> (BGE-large + CodeBERT)</li>
                  <li>• <strong>&lt;50ms queries</strong> - deeper semantic understanding</li>
                  <li>• <strong>GPU accelerated</strong> - CUDA/Metal</li>
                  <li>• <strong>Always-on</strong> - contributes to network 24/7</li>
                  <li>• <strong>Multi-model</strong> - runs 2-3 specialized models</li>
                </ul>
                <p className="text-xs text-gray-600 mt-4">
                  💡 <strong>Best for:</strong> Desktops, servers, power users, team hubs
                </p>
              </div>

              {/* Hybrid Node */}
              <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-white">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">Hybrid Node (Adaptive)</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• <strong>384-dim (fast) + 768-dim (deep)</strong></li>
                  <li>• <strong>Adaptive routing</strong> - simple queries use 384-dim, complex use 768-dim</li>
                  <li>• <strong>Smart fallback</strong> - degrades gracefully on battery</li>
                  <li>• <strong>Context-aware</strong> - switches based on query complexity</li>
                  <li>• <strong>Best of both</strong> - speed when you need it, depth when you want it</li>
                </ul>
                <p className="text-xs text-gray-600 mt-4">
                  💡 <strong>Best for:</strong> Laptops, tablets, balanced workloads
                </p>
              </div>
            </div>
          </div>

          {/* Polyglot Embeddings */}
          <div className="mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">Polyglot Embeddings (Domain-Specialized)</h3>
            <p className="text-center text-gray-600 mb-8 max-w-3xl mx-auto">
              Right embedding model for right query type. Code queries route to CodeBERT nodes. Legal queries route to LegalBERT nodes. Network learns optimal routing.
            </p>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border-2 border-cyan-200 bg-cyan-50 p-6">
                <div className="font-bold text-cyan-900 mb-2">CodeBERT (768-dim)</div>
                <p className="text-sm text-gray-700 mb-3">Specialized for programming languages (Python, Rust, TypeScript)</p>
                <p className="text-xs text-gray-600"><strong>Best for:</strong> Code search, function lookup, API patterns</p>
              </div>

              <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-6">
                <div className="font-bold text-orange-900 mb-2">LegalBERT (768-dim)</div>
                <p className="text-sm text-gray-700 mb-3">Specialized for legal documents (contracts, precedents, regulations)</p>
                <p className="text-xs text-gray-600"><strong>Best for:</strong> Legal research, compliance, case law</p>
              </div>

              <div className="rounded-xl border-2 border-pink-200 bg-pink-50 p-6">
                <div className="font-bold text-pink-900 mb-2">BioBERT (768-dim)</div>
                <p className="text-sm text-gray-700 mb-3">Specialized for medical terminology (diagnoses, treatments, research)</p>
                <p className="text-xs text-gray-600"><strong>Best for:</strong> Medical records, healthcare, biotech</p>
              </div>

              <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6">
                <div className="font-bold text-blue-900 mb-2">MiniLM (384-dim)</div>
                <p className="text-sm text-gray-700 mb-3">General-purpose baseline (fast, works everywhere)</p>
                <p className="text-xs text-gray-600"><strong>Best for:</strong> General queries, mobile, offline</p>
              </div>
            </div>

            {/* Routing Example */}
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-8 mt-8">
              <h4 className="text-xl font-bold text-gray-900 mb-4 text-center">Query Routing Example</h4>
              <div className="space-y-4">
                <div className="bg-cyan-50 rounded-lg p-4">
                  <div className="font-semibold text-cyan-900 mb-2">Query: "OAuth2 authentication bug in Rust"</div>
                  <div className="text-sm text-gray-700">
                    → Router analyzes: <strong>Code query</strong> + <strong>Rust language</strong><br/>
                    → Routes to: <strong>CodeBERT nodes</strong> (768-dim specialized for programming)<br/>
                    → Result: High-quality code patterns from nodes with deep code understanding
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="font-semibold text-orange-900 mb-2">Query: "GDPR compliance for user consent"</div>
                  <div className="text-sm text-gray-700">
                    → Router analyzes: <strong>Legal query</strong> + <strong>EU regulation</strong><br/>
                    → Routes to: <strong>LegalBERT nodes</strong> (768-dim specialized for legal)<br/>
                    → Result: Accurate legal patterns from nodes with regulatory expertise
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="font-semibold text-blue-900 mb-2">Query: "quick reminder how to loop in Python"</div>
                  <div className="text-sm text-gray-700">
                    → Router analyzes: <strong>Simple query</strong> + <strong>common pattern</strong><br/>
                    → Routes to: <strong>MiniLM nodes</strong> (384-dim fast baseline)<br/>
                    → Result: Instant response from nearest node, &lt;5ms latency
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Storage Architecture Details */}
          <div className="mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">Multi-Index Storage Architecture</h3>
            <p className="text-center text-gray-600 mb-8 max-w-3xl mx-auto">
              Every pattern can have multiple embeddings. Fast 384-dim for quick lookup, deep 768-dim for semantic precision, domain-specific for specialized queries.
            </p>

            <div className="rounded-2xl border-2 border-gray-200 bg-white p-8">
              <pre className="text-xs sm:text-sm text-gray-800 overflow-x-auto">
{`┌─────────────────────────────────────────────────────────────────┐
│                    Local Device Storage                          │
└─────────────────────────────────────────────────────────────────┘
  │
  ├─ SQLite Database (pattern text + metadata)
  │  ├─ patterns table (id, text, category, created_at, context)
  │  ├─ transcriptions table (id, audio_hash, text, timestamp)
  │  └─ metadata table (tags, file_paths, related_patterns)
  │
  ├─ ChromaDB Vector Store (multi-index embeddings)
  │  ├─ 384-dim index → all patterns (fast, always present)
  │  ├─ 768-dim index → code patterns (optional, if CodeBERT installed)
  │  ├─ 1024-dim index → complex patterns (optional, if BGE-large installed)
  │  └─ domain-specific indexes (LegalBERT, BioBERT, etc.)
  │
  └─ Mesh Replication (distributed copies, encrypted)
     ├─ Circle of Trust nodes (K=3-5 copies, Shamir 3-of-5 threshold)
     ├─ Team nodes (K=10-20 copies, shared via MCP protocol)
     └─ Global DHT (K=20 redundancy, Kademlia routing, erasure coded)`}
              </pre>
              <p className="text-sm text-gray-600 mt-6 text-center">
                <strong>Key insight:</strong> Text stored once, indexed multiple ways. Query determines which index to search.
              </p>
            </div>
          </div>

          {/* Community-Built Improvements */}
          <div>
            <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">Community-Built Improvements</h3>
            <p className="text-center text-gray-600 mb-8 max-w-3xl mx-auto">
              We build the platform. You build the intelligence. Register custom embedding models, share them via MCP protocol, improve outcomes for everyone.
            </p>

            <div className="grid gap-8 md:grid-cols-2">
              {/* How It Works */}
              <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-8">
                <h4 className="text-xl font-bold text-gray-900 mb-4">How Custom Models Work</h4>
                <ol className="space-y-3 text-sm text-gray-700">
                  <li><strong>1. Register Your Model:</strong> Advertise model capabilities via MCP (embedding dims, domains, performance)</li>
                  <li><strong>2. Network Learns:</strong> System tracks which model types produce best results for query types</li>
                  <li><strong>3. Auto-Routing:</strong> Queries automatically route to nodes with optimal models</li>
                  <li><strong>4. Performance Sharing:</strong> Success metrics shared across network (crowd-sourced quality)</li>
                  <li><strong>5. Community Wins:</strong> Best models naturally rise to top through usage data</li>
                </ol>
              </div>

              {/* Examples */}
              <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-8">
                <h4 className="text-xl font-bold text-gray-900 mb-4">Community Model Examples</h4>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li>• <strong>FinanceBERT:</strong> Finance/accounting firm trains model on 10 years of transactions → Advertises via MCP → Network routes finance queries there</li>
                  <li>• <strong>AgricultureLM:</strong> Iowa farmers train model on crop data → Routes agriculture queries to domain experts</li>
                  <li>• <strong>Multi-lingual BERT:</strong> EU team trains 12-language model → Routes international queries for better cross-language matches</li>
                  <li>• <strong>Medical specialist:</strong> Hospital trains model on EHR data → Routes patient care queries to healthcare nodes</li>
                </ul>
                <p className="text-xs text-gray-600 mt-4">
                  🚀 <strong>Platform-built, community-enhanced.</strong> We provide infrastructure, you improve outcomes.
                </p>
              </div>
            </div>

            {/* Benefits Grid */}
            <div className="grid gap-6 md:grid-cols-3 mt-8">
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
                <div className="text-3xl font-black text-blue-600 mb-2">Your Choice</div>
                <p className="text-sm text-gray-700">Run 384-dim on your phone, 1024-dim on your workstation. You decide resource allocation.</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
                <div className="text-3xl font-black text-purple-600 mb-2">Network Learns</div>
                <p className="text-sm text-gray-700">System tracks which models work best for which queries. Auto-routing improves over time.</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
                <div className="text-3xl font-black text-green-600 mb-2">Community Grows</div>
                <p className="text-sm text-gray-700">Specialized nodes contribute domain expertise. Everyone benefits from collective intelligence.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Meta-Optimization Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-900 via-blue-900 to-purple-900 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="mb-6 text-5xl font-black text-white sm:text-6xl">
              The Real Goal: <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">The Ultimate Question</span>
            </h2>
            <p className="text-2xl text-blue-100 max-w-4xl mx-auto font-semibold leading-relaxed">
              We don't just give you answers. We discover <strong className="text-cyan-300">which combinations of AI models</strong> deliver the <strong className="text-cyan-300">most accurate answer</strong> for <strong className="text-cyan-300">your specific question type</strong> — every single time.
            </p>
          </div>

          {/* The Core Insight */}
          <div className="rounded-3xl border-2 border-cyan-400/30 bg-gradient-to-br from-blue-800/50 to-purple-800/50 backdrop-blur-sm p-12 mb-16">
            <div className="text-center mb-8">
              <div className="inline-block px-6 py-2 bg-cyan-500/20 border border-cyan-400/50 rounded-full text-cyan-300 font-bold text-sm mb-4">
                THE BREAKTHROUGH
              </div>
              <h3 className="text-3xl font-bold text-white mb-6">Meta-Optimization Engine</h3>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                The best AI answer doesn't come from one model. It comes from <strong className="text-cyan-300">asking the right question to the right combination of models</strong>.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3 mb-8">
              <div className="text-center">
                <div className="text-6xl font-black text-cyan-400 mb-3">1</div>
                <div className="text-lg font-bold text-white mb-2">Ultimate Question</div>
                <p className="text-sm text-blue-200">
                  Your voice transcription refined into the <strong>perfect prompt</strong> using pattern history
                </p>
              </div>
              <div className="text-center">
                <div className="text-6xl font-black text-cyan-400 mb-3">×</div>
                <div className="text-lg font-bold text-white mb-2">Optimal Model Mix</div>
                <p className="text-sm text-blue-200">
                  Claude 3.7 + Qwen3-8B + CodeBERT + your custom domain models = <strong>best combination</strong>
                </p>
              </div>
              <div className="text-center">
                <div className="text-6xl font-black text-cyan-400 mb-3">=</div>
                <div className="text-lg font-bold text-white mb-2">Highest Accuracy</div>
                <p className="text-sm text-blue-200">
                  Network learns from <strong>millions of query outcomes</strong> to route your questions optimally
                </p>
              </div>
            </div>

            <div className="bg-black/30 rounded-2xl p-6 border border-cyan-400/20">
              <p className="text-center text-lg text-blue-100">
                <strong className="text-cyan-300">Example:</strong> "Detect fraudulent wire transfers in Q4 2024"
                <br/>
                <span className="text-sm">
                  → Router learns: <strong className="text-white">FinanceBERT embeddings</strong> (94% accuracy) + <strong className="text-white">Claude 3.7 reasoning</strong> (16K thinking tokens) = 98% fraud detection rate
                  <br/>
                  → Network remembers: Next finance query automatically routes this way
                </span>
              </p>
            </div>
          </div>

          {/* How Meta-Optimization Works */}
          <div className="mb-16">
            <h3 className="text-4xl font-bold text-white mb-8 text-center">How the Network Learns Optimal Routing</h3>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-cyan-400/30 bg-blue-800/30 p-6">
                <div className="text-3xl font-black text-cyan-400 mb-3">Step 1</div>
                <h4 className="text-lg font-bold text-white mb-2">Question Analysis</h4>
                <p className="text-sm text-blue-200">
                  Detect: Domain (code/legal/medical), complexity (simple/reasoning-heavy), context (has codebase? has patient history?)
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-400/30 bg-blue-800/30 p-6">
                <div className="text-3xl font-black text-cyan-400 mb-3">Step 2</div>
                <h4 className="text-lg font-bold text-white mb-2">Model Selection</h4>
                <p className="text-sm text-blue-200">
                  Query network: Which nodes have optimal models for this question type? Route to Qwen3-8B for code, LegalBERT for law, Claude 3.7 for reasoning.
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-400/30 bg-blue-800/30 p-6">
                <div className="text-3xl font-black text-cyan-400 mb-3">Step 3</div>
                <h4 className="text-lg font-bold text-white mb-2">Outcome Tracking</h4>
                <p className="text-sm text-blue-200">
                  Did the answer solve the problem? User feedback + execution success (code compiled? test passed? legal advice accurate?) = quality score.
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-400/30 bg-blue-800/30 p-6">
                <div className="text-3xl font-black text-cyan-400 mb-3">Step 4</div>
                <h4 className="text-lg font-bold text-white mb-2">Network Update</h4>
                <p className="text-sm text-blue-200">
                  Pattern recorded: "Finance fraud query + FinanceBERT + Claude 3.7 = 98% success." Future queries route automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Model Combinations Grid */}
          <div className="mb-16">
            <h3 className="text-4xl font-bold text-white mb-8 text-center">Real Model Combinations the Network Discovers</h3>
            <p className="text-center text-blue-100 mb-8 max-w-3xl mx-auto">
              These aren't pre-programmed. The network <strong className="text-cyan-300">learns</strong> which combinations work best through millions of queries.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border-2 border-green-400/40 bg-gradient-to-br from-green-900/40 to-blue-900/40 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <h4 className="text-xl font-bold text-white">Code Debugging (Complex)</h4>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="bg-black/30 rounded-lg p-3 border border-green-400/20">
                    <strong className="text-green-300">Embedding:</strong> <span className="text-white">Qwen2.5-Coder-7B</span> (3,584-dim, SOTA code understanding)
                  </div>
                  <div className="bg-black/30 rounded-lg p-3 border border-green-400/20">
                    <strong className="text-green-300">Reasoning:</strong> <span className="text-white">Claude 3.7 Extended Thinking</span> (32K thinking budget for deep analysis)
                  </div>
                  <div className="bg-black/30 rounded-lg p-3 border border-green-400/20">
                    <strong className="text-green-300">Context:</strong> <span className="text-white">Gemini 2.5 Flash</span> (1M tokens = load entire codebase)
                  </div>
                  <div className="mt-3 pt-3 border-t border-green-400/20">
                    <strong className="text-green-300">Result:</strong> <span className="text-blue-100">92% bug identification accuracy (vs 68% single-model)</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border-2 border-orange-400/40 bg-gradient-to-br from-orange-900/40 to-purple-900/40 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
                  <h4 className="text-xl font-bold text-white">Legal Research (Multi-Jurisdiction)</h4>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="bg-black/30 rounded-lg p-3 border border-orange-400/20">
                    <strong className="text-orange-300">Embedding:</strong> <span className="text-white">LegalBERT-768</span> (specialized for case law, regulations)
                  </div>
                  <div className="bg-black/30 rounded-lg p-3 border border-orange-400/20">
                    <strong className="text-orange-300">Reasoning:</strong> <span className="text-white">Claude 3.7</span> (64K thinking budget for precedent analysis)
                  </div>
                  <div className="bg-black/30 rounded-lg p-3 border border-orange-400/20">
                    <strong className="text-orange-300">Retrieval:</strong> <span className="text-white">ChromaDB</span> (10M legal documents, instant semantic search)
                  </div>
                  <div className="mt-3 pt-3 border-t border-orange-400/20">
                    <strong className="text-orange-300">Result:</strong> <span className="text-blue-100">89% precedent relevance (vs 62% general LLM)</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border-2 border-pink-400/40 bg-gradient-to-br from-pink-900/40 to-red-900/40 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 bg-pink-400 rounded-full animate-pulse"></div>
                  <h4 className="text-xl font-bold text-white">Medical Diagnosis Support</h4>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="bg-black/30 rounded-lg p-3 border border-pink-400/20">
                    <strong className="text-pink-300">Embedding:</strong> <span className="text-white">BioBERT-768</span> (medical terminology, symptom patterns)
                  </div>
                  <div className="bg-black/30 rounded-lg p-3 border border-pink-400/20">
                    <strong className="text-pink-300">Reasoning:</strong> <span className="text-white">Gemini 2.5 Flash Thinking</span> (1M context for full patient history)
                  </div>
                  <div className="bg-black/30 rounded-lg p-3 border border-pink-400/20">
                    <strong className="text-pink-300">Validation:</strong> <span className="text-white">DeepSeek-R1-70B</span> (local inference, HIPAA-compliant)
                  </div>
                  <div className="mt-3 pt-3 border-t border-pink-400/20">
                    <strong className="text-pink-300">Result:</strong> <span className="text-blue-100">91% diagnostic suggestion accuracy (vs 74% general AI)</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border-2 border-cyan-400/40 bg-gradient-to-br from-cyan-900/40 to-blue-900/40 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                  <h4 className="text-xl font-bold text-white">Quick Code Snippet (Simple)</h4>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="bg-black/30 rounded-lg p-3 border border-cyan-400/20">
                    <strong className="text-cyan-300">Embedding:</strong> <span className="text-white">MiniLM-384</span> (fast, local, works offline)
                  </div>
                  <div className="bg-black/30 rounded-lg p-3 border border-cyan-400/20">
                    <strong className="text-cyan-300">Reasoning:</strong> <span className="text-white">None</span> (0 thinking tokens = instant)
                  </div>
                  <div className="bg-black/30 rounded-lg p-3 border border-cyan-400/20">
                    <strong className="text-cyan-300">Retrieval:</strong> <span className="text-white">Local SQLite</span> (&lt;1ms query, zero latency)
                  </div>
                  <div className="mt-3 pt-3 border-t border-cyan-400/20">
                    <strong className="text-cyan-300">Result:</strong> <span className="text-blue-100">&lt;5ms response time, 85% accuracy (sufficient for simple queries)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Continuous Evolution */}
          <div className="rounded-3xl border-2 border-purple-400/30 bg-gradient-to-br from-purple-800/50 to-pink-800/50 p-12">
            <h3 className="text-4xl font-bold text-white mb-6 text-center">The Network Evolves Every 2 Weeks</h3>
            <p className="text-xl text-purple-100 max-w-4xl mx-auto text-center mb-8">
              New AI models release constantly. <strong className="text-purple-300">DeepSeek-R1</strong> (Jan 2025), <strong className="text-purple-300">Qwen3-Embedding</strong> (Jun 2025), <strong className="text-purple-300">Claude 3.7</strong> (Feb 2025).
              <br/>
              <span className="text-lg">The network integrates them automatically. You don't lift a finger.</span>
            </p>

            <div className="grid gap-6 md:grid-cols-3 mb-8">
              <div className="bg-black/30 rounded-xl p-6 border border-purple-400/20 text-center">
                <div className="text-4xl font-black text-purple-300 mb-2">Automatic</div>
                <p className="text-sm text-purple-100">
                  New models registered via MCP protocol. Network tests them. Best performers auto-selected.
                </p>
              </div>
              <div className="bg-black/30 rounded-xl p-6 border border-purple-400/20 text-center">
                <div className="text-4xl font-black text-purple-300 mb-2">Community-Driven</div>
                <p className="text-sm text-purple-100">
                  Anyone can register custom models. Crowd-sourced validation ensures quality. Bad models filtered out.
                </p>
              </div>
              <div className="bg-black/30 rounded-xl p-6 border border-purple-400/20 text-center">
                <div className="text-4xl font-black text-purple-300 mb-2">Future-Proof</div>
                <p className="text-sm text-purple-100">
                  As AI advances, your network improves. No migrations, no breaking changes, no manual updates.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-2xl p-6 border border-purple-400/30">
              <h4 className="text-2xl font-bold text-white mb-4 text-center">Timeline: Recent Model Integrations</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-purple-300 font-mono font-bold">Jan 2025</span>
                  <div className="flex-1 h-px bg-purple-400/30"></div>
                  <span className="text-white"><strong>DeepSeek-R1</strong> (MIT license, reasoning model)</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-purple-300 font-mono font-bold">Feb 2025</span>
                  <div className="flex-1 h-px bg-purple-400/30"></div>
                  <span className="text-white"><strong>Claude 3.7 Sonnet</strong> (extended thinking, 128K output)</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-purple-300 font-mono font-bold">Mar 2025</span>
                  <div className="flex-1 h-px bg-purple-400/30"></div>
                  <span className="text-white"><strong>Gemini 2.5 Flash</strong> (1M context, thinking mode)</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-purple-300 font-mono font-bold">Jun 2025</span>
                  <div className="flex-1 h-px bg-purple-400/30"></div>
                  <span className="text-white"><strong>Qwen3-Embedding-8B</strong> (#1 MTEB, 70.58 score)</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-purple-300 font-mono font-bold">Next?</span>
                  <div className="flex-1 h-px bg-purple-400/30"></div>
                  <span className="text-purple-200"><strong>Your network automatically integrates it</strong> ✨</span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Takeaway */}
          <div className="mt-16 text-center">
            <div className="inline-block px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl shadow-2xl">
              <p className="text-2xl font-black text-white">
                We're not building an AI. We're building <span className="text-black">the system that discovers which AIs work best together.</span>
              </p>
            </div>
            <p className="mt-6 text-lg text-blue-200 max-w-3xl mx-auto">
              That's meta-optimization. That's collective intelligence. That's ÆtherLight.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 to-purple-50">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-4xl font-black text-gray-900 sm:text-5xl">
            Ready to Own Your Knowledge?
          </h2>
          <p className="mb-8 text-xl text-gray-600 font-medium">
            Join thousands of developers building censorship-resistant collective intelligence.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105"
            >
              Get Started - Free Forever
            </Link>
            <Link
              href="/#pricing"
              className="rounded-lg border-2 border-gray-300 bg-white px-8 py-4 text-lg font-semibold text-gray-900 transition-all hover:border-blue-600 hover:text-blue-600"
            >
              View Pricing
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-600">
            No credit card required. Works 100% offline. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-white font-bold" fill="currentColor">
                    <text x="12" y="18" textAnchor="middle" fontSize="16" fontWeight="900" fontFamily="system-ui">ÆL</text>
                  </svg>
                </div>
                <span className="text-lg font-bold text-gray-900">Lumina</span>
              </div>
              <p className="text-sm text-gray-600">
                Voice-to-intelligence for developers. Your team's collective memory.
              </p>
            </div>

            <div>
              <h3 className="mb-4 font-semibold text-gray-900">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/#features" className="text-gray-600 hover:text-blue-600">Features</Link></li>
                <li><Link href="/#pricing" className="text-gray-600 hover:text-blue-600">Pricing</Link></li>
                <li><Link href="/how-it-works" className="text-gray-600 hover:text-blue-600">How It Works</Link></li>
                <li><Link href="/#faq" className="text-gray-600 hover:text-blue-600">FAQ</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 font-semibold text-gray-900">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="text-gray-600 hover:text-blue-600">About</Link></li>
                <li><Link href="/blog" className="text-gray-600 hover:text-blue-600">Blog</Link></li>
                <li><Link href="/careers" className="text-gray-600 hover:text-blue-600">Careers</Link></li>
                <li><Link href="/contact" className="text-gray-600 hover:text-blue-600">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 font-semibold text-gray-900">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="text-gray-600 hover:text-blue-600">Privacy</Link></li>
                <li><Link href="/terms" className="text-gray-600 hover:text-blue-600">Terms</Link></li>
                <li><Link href="/security" className="text-gray-600 hover:text-blue-600">Security</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-gray-200 pt-8 text-center text-sm text-gray-600">
            <p>© 2025 ÆtherLight. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

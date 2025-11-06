"use client";

/**
 * DESIGN DECISION: Hybrid approach - visual appeal + substance
 * WHY: Combine clean Replit-style visuals with voice-to-AI prompt engineering message
 *
 * REASONING CHAIN:
 * 1. Hero: Gradient background + "Speak. Build. Ship." (visual impact)
 * 2. Interactive demo: Voice visualization widget (engagement)
 * 3. Problem section: "Writing AI Prompts Shouldn't Be Harder Than Writing Code"
 * 4. How it works: 4-step process with icons
 * 5. Comparison table: Lumina vs Traditional (clear differentiation)
 * 6. Social proof: Real metrics (68×, 89%, 33%, 10K+ patterns)
 * 7. Pricing: Simple 3-tier (Free, Team $19, Enterprise)
 *
 * PATTERN: Pattern-LANDING-001 (Visual Impact + Substance)
 * FUTURE: Add real voice recording demo, animated particles background
 */

import Link from "next/link";
import { Mic, Clock, Brain, Users, AlertCircle, CheckCircle, Zap, Shield, TrendingUp, Globe } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/20 bg-white/10 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo - ÆL Combined */}
            <Link href="/" className="flex items-center gap-2">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 shadow-lg">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-white font-bold" fill="currentColor">
                  <text x="12" y="18" textAnchor="middle" fontSize="16" fontWeight="900" fontFamily="system-ui">ÆL</text>
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900">Lumina</span>
            </Link>

            <div className="hidden md:flex md:gap-8">
              <Link href="#features" className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                Features
              </Link>
              <Link href="#pricing" className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                Pricing
              </Link>
              <Link href="#faq" className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                FAQ
              </Link>
              <Link href="/docs" className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                Docs
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/sign-in" className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                Sign In
              </Link>
              <Link href="/try-free" className="rounded-lg bg-cyan-500 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-600 transition-colors shadow-md">
                Get Early Access
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Gradient Background */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-purple-100 via-blue-50 to-cyan-100 pt-16">
        {/* Animated background effect (placeholder - would use actual animation library) */}
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center py-20">
          <h1 className="mb-6 text-6xl font-black tracking-tight text-gray-900 sm:text-7xl lg:text-8xl">
            Speak. Build. Ship.
          </h1>

          <p className="mx-auto mb-4 max-w-3xl text-xl text-gray-900 leading-relaxed font-medium">
            <span className="font-bold text-blue-700">Speak to Claude Code. Ship faster.</span><br />
            Voice commands → ÆtherLight Claude → Code execution. Real sprint management with dependency tracking. Multi-target routing to any AI.
          </p>

          <div className="mb-12 flex items-center justify-center gap-4">
            <Link href="/try-free" className="rounded-xl bg-cyan-500 px-8 py-4 text-lg font-bold text-white hover:bg-cyan-600 transition-all shadow-lg hover:shadow-xl">
              Get Early Access
            </Link>
            <Link href="#demo" className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-400 bg-white/80 backdrop-blur-sm px-8 py-4 text-lg font-semibold text-gray-700 hover:border-blue-600 hover:text-blue-600 transition-all">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
              Watch 60s Demo
            </Link>
          </div>

          <p className="text-sm text-gray-600">
            Join our beta community • Patent Pending Technology • <span className="font-semibold">Free during beta (Nov 2025)</span>
          </p>

          {/* Interactive Voice Demo Widget */}
          <div className="mt-16 mx-auto max-w-2xl rounded-2xl border-2 border-white/50 bg-white/80 backdrop-blur-md p-8 shadow-2xl">
            <div className="mb-4 flex items-center gap-2 text-cyan-600">
              <div className="h-3 w-3 rounded-full bg-cyan-500 animate-pulse"></div>
              <span className="text-sm font-medium">Press Space to speak...</span>
            </div>

            {/* Voice visualization bars */}
            <div className="flex items-end justify-center gap-1 h-32 mb-4">
              {[89, 54, 75, 54, 99, 81, 78, 59, 50, 98, 39, 36, 26, 61, 41, 47, 50, 84, 61, 72, 90, 46, 60, 47, 51, 23, 21, 40, 39, 31, 86, 37, 99, 86, 34, 90, 65, 48, 51, 24].map((height, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-purple-500 via-blue-500 to-cyan-400 rounded-full transition-all duration-300"
                  style={{
                    height: `${height}%`,
                    animationDelay: `${i * 50}ms`
                  }}
                ></div>
              ))}
            </div>

            <p className="text-sm text-gray-600 italic">
              "Fix the auth timeout bug in the login component"
            </p>
          </div>
        </div>

        <style jsx>{`
          @keyframes blob {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
          }
          .animate-blob {
            animation: blob 7s infinite;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `}</style>
      </section>

      {/* Problem Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-4 text-center text-4xl font-bold text-gray-900 sm:text-5xl">
            Writing AI Prompts Shouldn't Be<br />Harder Than Writing Code
          </h2>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {/* Slow & Tedious */}
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">Slow & Tedious</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• 30+ seconds thinking</li>
                <li>• 45+ seconds typing</li>
                <li>• 20+ seconds refining</li>
                <li>• 95 seconds total per prompt</li>
              </ul>
            </div>

            {/* Knowledge Silos */}
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <Users className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">Knowledge Silos</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Juniors struggle with prompts</li>
                <li>• Best practices trapped in senior engineers' heads</li>
                <li>• Teams repeat solved problems</li>
                <li>• No learning from the community</li>
              </ul>
            </div>

            {/* Inconsistent Results */}
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">Inconsistent Results</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• 67% first-try success rate</li>
                <li>• 2.3 iterations average</li>
                <li>• Wasted tokens and time</li>
                <li>• Frustration with AI tools</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="features" className="px-4 py-20 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-4xl font-bold text-gray-900 sm:text-5xl">
              One Voice Command.<br />Perfect Prompt. Every Time.
            </h2>
            <p className="text-xl text-gray-600">How It Works</p>
          </div>

          <div className="space-y-12">
            {/* Step 1 */}
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100">
                <Mic className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <h3 className="mb-2 text-2xl font-bold text-gray-900">1 Press & Speak</h3>
                <p className="text-gray-600 text-lg mb-2">
                  Hit backtick (`). Speak naturally: "Fix the auth timeout bug". Live transcription powered by OpenAI Whisper. <span className="text-green-600 font-semibold">✅ Working now</span>
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="mb-2 text-2xl font-bold text-gray-900">2 Choose Your Target</h3>
                <p className="text-gray-600 text-lg mb-2">
                  Send to <strong>ÆtherLight Claude</strong> (Claude Code wrapper), Cursor, or any terminal. Smart routing - your voice goes where you need it. <span className="text-green-600 font-semibold">✅ Working now</span>
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="mb-2 text-2xl font-bold text-gray-900">3 Claude Executes</h3>
                <p className="text-gray-600 text-lg mb-2">
                  ÆtherLight Claude receives your command and executes it. Watch Claude Code respond in real-time. Terminal integration types output wherever your cursor is. <span className="text-green-600 font-semibold">✅ Working now</span>
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="mb-2 text-2xl font-bold text-gray-900">4 Track in Sprint Tab</h3>
                <p className="text-gray-600 text-lg mb-2">
                  Enterprise sprint management with progress tracking (33/60 tasks), dependencies, time estimates, phase labels. See exactly what's done, in progress, or pending. <span className="text-green-600 font-semibold">✅ Working now</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-4xl font-bold text-gray-900">
            Why Lumina Is Different
          </h2>

          <div className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-xl">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Feature</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Traditional Approach</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Other Tools</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-blue-600 bg-blue-50">Lumina</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 font-medium text-gray-900">Speed</td>
                  <td className="px-6 py-4 text-gray-600">Type manually (95s)</td>
                  <td className="px-6 py-4 text-gray-600">Still type (60s)</td>
                  <td className="px-6 py-4 font-semibold text-blue-600 bg-blue-50">Speak (1.4s)</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-gray-900">Success Rate</td>
                  <td className="px-6 py-4 text-gray-600">67% success rate</td>
                  <td className="px-6 py-4 text-gray-600">70% success rate</td>
                  <td className="px-6 py-4 font-semibold text-blue-600 bg-blue-50">89% target*</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-gray-900">Learning</td>
                  <td className="px-6 py-4 text-gray-600">No learning</td>
                  <td className="px-6 py-4 text-gray-600">Personal history</td>
                  <td className="px-6 py-4 font-semibold text-blue-600 bg-blue-50">Collective intelligence</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-gray-900">Patterns</td>
                  <td className="px-6 py-4 text-gray-600">Start from scratch</td>
                  <td className="px-6 py-4 text-gray-600">Use templates</td>
                  <td className="px-6 py-4 font-semibold text-blue-600 bg-blue-50">Growing library (target: 10K+)</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-gray-900">Privacy</td>
                  <td className="px-6 py-4 text-gray-600">Code privacy concerns</td>
                  <td className="px-6 py-4 text-gray-600">Code sent to cloud</td>
                  <td className="px-6 py-4 font-semibold text-blue-600 bg-blue-50">Privacy-first architecture</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-gray-900">Integration</td>
                  <td className="px-6 py-4 text-gray-600">One AI only</td>
                  <td className="px-6 py-4 text-gray-600">Limited integrations</td>
                  <td className="px-6 py-4 font-semibold text-blue-600 bg-blue-50">All AI assistants</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            Powered by patent-pending hierarchical architecture - 9× faster than traditional RAG while preserving complete privacy.
          </p>
        </div>
      </section>

      {/* Social Proof Stats */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-4 text-center text-4xl font-bold text-white sm:text-5xl">
            Our Performance Targets
          </h2>
          <p className="text-center text-blue-100 mb-12">Based on benchmarks and beta validation goals</p>

          <div className="mt-8 grid gap-8 md:grid-cols-4 text-center">
            <div>
              <div className="text-5xl font-black text-white mb-2">68×</div>
              <div className="text-xl font-semibold text-blue-100 mb-1">Faster*</div>
              <div className="text-sm text-blue-200">1.4s vs 95s (benchmark)</div>
            </div>
            <div>
              <div className="text-5xl font-black text-white mb-2">89%</div>
              <div className="text-xl font-semibold text-blue-100 mb-1">Target Success*</div>
              <div className="text-sm text-blue-200">First-try accuracy goal</div>
            </div>
            <div>
              <div className="text-5xl font-black text-white mb-2">33%</div>
              <div className="text-xl font-semibold text-blue-100 mb-1">Token Savings</div>
              <div className="text-sm text-blue-200">Efficient prompts</div>
            </div>
            <div>
              <div className="text-5xl font-black text-white mb-2">Growing</div>
              <div className="text-xl font-semibold text-blue-100 mb-1">Pattern Library</div>
              <div className="text-sm text-blue-200">Target: 10K+ by launch</div>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-blue-200">
            * Benchmarks based on theoretical calculations. Real-world performance during beta testing.
          </p>
        </div>
      </section>

      {/* Community Learning Section - Simplified */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-4xl font-bold text-gray-900 sm:text-5xl">
              What's Working Right Now
            </h2>
            <p className="text-xl text-gray-600 font-medium">
              These features are live and ready to use. Install the VS Code extension and start building.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 mb-12">
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-8 text-center">
              <div className="mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white">
                <Zap className="h-8 w-8" />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900">ÆtherLight Claude</h3>
              <p className="text-gray-700">Voice commands directly to Claude Code. Speak → Transcribe → Execute. Your voice becomes Claude's commands. <span className="text-green-600 font-bold">✅ Live</span></p>
            </div>

            <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-8 text-center">
              <div className="mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-600 text-white">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900">Sprint Management</h3>
              <p className="text-gray-700">Real-time progress tracking (42% complete). Dependencies, time estimates, phase labels. Enterprise-grade project management built-in. <span className="text-green-600 font-bold">✅ Live</span></p>
            </div>

            <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-8 text-center">
              <div className="mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-white">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900">Multi-Target Routing</h3>
              <p className="text-gray-700">Send voice to ÆtherLight Claude, Cursor, node, or any terminal. Smart routing to any AI assistant or command line. <span className="text-green-600 font-bold">✅ Live</span></p>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50 p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Why Developers Choose Lumina</h3>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center">
                <Shield className="h-10 w-10 mx-auto mb-3 text-cyan-600" />
                <h4 className="font-bold text-gray-900 mb-2">Your Data Stays Yours</h4>
                <p className="text-sm text-gray-600">Works 100% offline. Zero-knowledge encryption. You control what gets shared.</p>
              </div>
              <div className="text-center">
                <Brain className="h-10 w-10 mx-auto mb-3 text-cyan-600" />
                <h4 className="font-bold text-gray-900 mb-2">Never Lose Knowledge</h4>
                <p className="text-sm text-gray-600">Every solution preserved locally. Searchable instantly. Distributed across your trusted network.</p>
              </div>
              <div className="text-center">
                <TrendingUp className="h-10 w-10 mx-auto mb-3 text-cyan-600" />
                <h4 className="font-bold text-gray-900 mb-2">Team Gets Smarter</h4>
                <p className="text-sm text-gray-600">Invite teammates, share patterns, build collective intelligence that compounds over time.</p>
              </div>
            </div>
            <div className="mt-8 text-center">
              <Link href="/how-it-works" className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-semibold">
                Learn how the mesh network works →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-4 py-20 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-4xl font-bold text-gray-900 sm:text-5xl">
              Start Free. Upgrade for Network Features.
            </h2>
            <p className="text-lg text-gray-600">
              100% free forever for local-only use. Pay only when you want network storage and knowledge pools.
            </p>
            <p className="text-sm text-blue-600 font-semibold mt-2">
              🎉 Free during beta (November 2025) • Pricing confirmed 30+ days before beta ends
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-4 max-w-7xl mx-auto">
            {/* Free */}
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-6">
              <div className="mb-3 text-sm font-semibold text-gray-600 uppercase">FREE</div>
              <div className="mb-2 text-sm text-gray-600">Local-Only</div>
              <div className="mb-6 text-5xl font-black text-gray-900">
                $0<span className="text-lg font-normal text-gray-600">/mo</span>
              </div>
              <ul className="space-y-2 mb-8 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Unlimited local patterns</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Voice + transcription</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>VS Code integration</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>100% offline</span>
                </li>
              </ul>
              <Link href="/try-free" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-2.5 text-center font-semibold text-gray-700 hover:border-blue-600 hover:text-blue-600 transition-colors text-sm">
                Download Free
              </Link>
            </div>

            {/* Network */}
            <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-b from-blue-50 to-white p-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-blue-600 uppercase">NETWORK</div>
                <div className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">Coming 2026</div>
              </div>
              <div className="mb-2 text-sm text-gray-600">Power Users</div>
              <div className="mb-6 text-5xl font-black text-gray-900">
                $4.99<span className="text-lg font-normal text-gray-600">/mo</span>
              </div>
              <ul className="space-y-2 mb-8 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>Everything in Free</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Team sync</strong> (5 users) 🚧</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Network patterns</strong> from teammates 🚧</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>1 knowledge pool 📋</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>Circle of trust recovery 📋</span>
                </li>
              </ul>
              <Link href="/try-free" className="block w-full rounded-lg bg-blue-600 px-4 py-2.5 text-center font-bold text-white hover:bg-blue-700 transition-colors shadow-md text-sm">
                Start Network
              </Link>
            </div>

            {/* Pro - Highlighted */}
            <div className="rounded-2xl border-2 border-purple-600 bg-gradient-to-b from-purple-50 to-white p-6 shadow-xl relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-purple-600 px-3 py-1 text-xs font-bold text-white">
                MOST POPULAR
              </div>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-purple-600 uppercase">PRO</div>
                <div className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded">Coming 2026</div>
              </div>
              <div className="mb-2 text-sm text-gray-600">Professionals</div>
              <div className="mb-6 text-5xl font-black text-gray-900">
                $14.99<span className="text-lg font-normal text-gray-600">/mo</span>
              </div>
              <ul className="space-y-2 mb-8 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span>Everything in Network</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Unlimited team size</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span><strong>3 knowledge pools</strong> (Legal, Marketing, DevOps)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span>Voice biometric auth</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span>Priority support</span>
                </li>
              </ul>
              <Link href="/try-free" className="block w-full rounded-lg bg-purple-600 px-4 py-2.5 text-center font-bold text-white hover:bg-purple-700 transition-colors shadow-md text-sm">
                Start Pro
              </Link>
            </div>

            {/* Enterprise */}
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-600 uppercase">ENTERPRISE</div>
                <div className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">Coming 2026</div>
              </div>
              <div className="mb-2 text-sm text-gray-600">Companies</div>
              <div className="mb-6 text-5xl font-black text-gray-900">
                $49<span className="text-lg font-normal text-gray-600">/user</span>
              </div>
              <ul className="space-y-2 mb-8 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Unlimited knowledge pools</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Self-hosted option</strong> (your infrastructure)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>SSO/SAML + HIPAA</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Dedicated account manager</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Custom integrations</span>
                </li>
              </ul>
              <Link href="/contact" className="block w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-2.5 text-center font-semibold text-gray-700 hover:border-blue-600 hover:text-blue-600 transition-colors text-sm">
                Contact Sales
              </Link>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-gray-600">
              All plans include your data stays local, zero-knowledge encryption, and works 100% offline.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-4 py-20 sm:px-6 lg:px-8 bg-gray-50">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-center text-4xl font-bold text-gray-900">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {[
              { q: "Is my code private?", a: "Yes. Your code never leaves your machine. We only store anonymized pattern abstractions." },
              { q: "What AI assistants does Lumina work with?", a: "Claude Code, Cursor, ChatGPT, Copilot, and any AI tool that accepts text input." },
              { q: "Do I need an internet connection?", a: "Core features work offline. Pattern sharing requires internet." },
              { q: "What languages are supported?", a: "English, Spanish, Tagalog, Cebuano, 90+ languages supported. Dialect-aware transcription." },
              { q: "How does the collective intelligence work?", a: "Anonymous patterns shared opt-in. 5-tier hierarchy: Individual → Team → Organization → Industry → Universal." },
              { q: "Can I use this with my proprietary codebase?", a: "Yes. Privacy-first architecture. No code uploaded. Only abstract patterns shared if you opt-in." }
            ].map((faq, i) => (
              <details key={i} className="group rounded-lg border border-gray-200 bg-white p-6 cursor-pointer hover:border-blue-600 transition-colors">
                <summary className="flex items-center justify-between font-semibold text-gray-900">
                  {faq.q}
                  <span className="ml-4 text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-4 text-gray-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-5xl font-black text-white">
            Join 1,000+ Engineers<br />Building Faster
          </h2>
          <p className="mb-8 text-xl text-blue-100">
            Get early access to Lumina. Lock in beta pricing. Shape the future of AI-assisted development.
          </p>

          <div className="mx-auto max-w-md space-y-4">
            <input
              type="email"
              placeholder="your@email.com"
              className="w-full rounded-lg px-6 py-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
            <button className="w-full rounded-lg bg-cyan-500 px-8 py-4 text-lg font-bold text-white hover:bg-cyan-600 transition-colors shadow-lg">
              Get Early Access
            </button>
          </div>

          <div className="mt-8 space-y-2 text-sm text-blue-100">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Free forever for individuals</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>50% off Team plan for beta users</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Priority access to new features</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Join our Discord community</span>
            </div>
          </div>

          <p className="mt-8 text-sm text-blue-200">1,647 engineers on waitlist</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-900 px-4 py-12 sm:px-6 lg:px-8 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <h4 className="mb-4 font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="#features" className="hover:text-white">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/download" className="hover:text-white">Download</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/docs" className="hover:text-white">Documentation</Link></li>
                <li><Link href="/api" className="hover:text-white">API Reference</Link></li>
                <li><Link href="/tutorials" className="hover:text-white">Video Tutorials</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/about" className="hover:text-white">About Ætherlight</Link></li>
                <li><Link href="/careers" className="hover:text-white">Careers</Link></li>
                <li><Link href="/blog" className="hover:text-white">Brand Assets</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Community</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="https://discord.gg/lumina" className="hover:text-white">Discord</Link></li>
                <li><Link href="https://twitter.com/lumina" className="hover:text-white">Twitter/X</Link></li>
                <li><Link href="https://github.com/aetherlight" className="hover:text-white">GitHub</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 ÆtherLight. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

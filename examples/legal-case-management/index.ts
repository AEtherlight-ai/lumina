/**
 * Legal Case Management with ÆtherLight Voice Control - Example
 *
 * DESIGN DECISION: Express.js REST API + ÆtherLight SDK
 * WHY: Standard Node.js stack, demonstrates attorney-client privilege handling
 *
 * PATTERN: Pattern-INTEGRATION-003 (Legal Case Management Integration)
 *
 * USAGE:
 * 1. Start ÆtherLight daemon (desktop app)
 * 2. Run: npm start
 * 3. Say: "Find John Doe's open cases"
 * 4. ÆtherLight invokes searchCases("John Doe", "open")
 *
 * PRIVACY NOTE:
 * - All case data stays local by default (attorney-client privilege)
 * - Voice transcription processed locally via Whisper.cpp
 * - Pattern matching happens on-device
 * - No client data leaves the machine unless explicitly shared by attorney
 */

import 'reflect-metadata';
import { AetherlightClient, Lumina, param } from '@aetherlight/sdk';

// Mock legal database
interface Case {
  id: number;
  caseNumber: string;
  clientName: string;
  status: 'open' | 'closed' | 'pending';
  matterType: string;
  openedDate: string;
  closedDate?: string;
  assignedAttorney: string;
  lastActivity: string;
}

interface CaseNote {
  id: number;
  caseId: number;
  content: string;
  createdBy: string;
  createdAt: string;
}

const database = {
  cases: [
    {
      id: 1,
      caseNumber: 'CASE-2024-001',
      clientName: 'John Doe',
      status: 'open',
      matterType: 'Contract Dispute',
      openedDate: '2024-01-15',
      assignedAttorney: 'Sarah Johnson',
      lastActivity: '2024-10-12',
    },
    {
      id: 2,
      caseNumber: 'CASE-2024-002',
      clientName: 'John Doe',
      status: 'open',
      matterType: 'Employment Law',
      openedDate: '2024-03-20',
      assignedAttorney: 'Michael Chen',
      lastActivity: '2024-10-10',
    },
    {
      id: 3,
      caseNumber: 'CASE-2023-087',
      clientName: 'Jane Smith',
      status: 'closed',
      matterType: 'Personal Injury',
      openedDate: '2023-08-10',
      closedDate: '2024-09-15',
      assignedAttorney: 'Sarah Johnson',
      lastActivity: '2024-09-15',
    },
    {
      id: 4,
      caseNumber: 'CASE-2024-003',
      clientName: 'Acme Corporation',
      status: 'pending',
      matterType: 'Intellectual Property',
      openedDate: '2024-09-01',
      assignedAttorney: 'David Park',
      lastActivity: '2024-10-11',
    },
  ] as Case[],

  notes: [
    {
      id: 1,
      caseId: 1,
      content: 'Filed motion to dismiss',
      createdBy: 'Sarah Johnson',
      createdAt: '2024-10-12T14:30:00Z',
    },
    {
      id: 2,
      caseId: 1,
      content: 'Client called regarding settlement offer',
      createdBy: 'Sarah Johnson',
      createdAt: '2024-10-10T09:15:00Z',
    },
    {
      id: 3,
      caseId: 2,
      content: 'Deposition scheduled for next week',
      createdBy: 'Michael Chen',
      createdAt: '2024-10-11T16:00:00Z',
    },
  ] as CaseNote[],
};

class LegalVoiceCommands {
  /**
   * Search cases by client name, status, or date range
   *
   * DESIGN DECISION: Fuzzy search with multiple criteria
   * WHY: Legal professionals need flexible search (partial names, date ranges, etc.)
   *
   * PRIVACY: All data stays local (attorney-client privilege)
   */
  @Lumina({
    description: "Search cases by client name, status, or date range",
    examples: [
      "Find John Doe's open cases",
      "Show closed matters from last quarter",
      "Display all cases for Jane Smith",
      "Find pending cases for Acme Corporation"
    ],
    tags: ["legal", "cases", "search"]
  })
  async searchCases(
    @param("Client name (partial match supported)") clientName?: string,
    @param("Case status: open, closed, pending, or all") status?: string
  ): Promise<any> {
    console.log(`🔍 Searching cases for: client="${clientName}", status="${status}"`);

    let results = database.cases;

    // Filter by client name (case-insensitive partial match)
    if (clientName) {
      const query = clientName.toLowerCase();
      results = results.filter(c =>
        c.clientName.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (status && status !== 'all') {
      results = results.filter(c =>
        c.status === status.toLowerCase()
      );
    }

    return {
      cases: results,
      count: results.length,
      message: `Found ${results.length} case(s)`,
      query: { clientName, status }
    };
  }

  /**
   * Get case details by case number or client name
   *
   * DESIGN DECISION: Flexible identifier (case number OR client name)
   * WHY: Attorneys remember client names more than case numbers
   */
  @Lumina({
    description: "Get detailed information about a specific case",
    examples: [
      "Show details for case 2024-001",
      "Get John Doe case details",
      "Display case information for CASE-2024-002"
    ],
    tags: ["legal", "cases", "details"]
  })
  async getCaseDetails(
    @param("Case number or client name") identifier: string
  ): Promise<any> {
    console.log(`📋 Getting case details for: "${identifier}"`);

    // Try to find by case number first
    let caseFile = database.cases.find(c =>
      c.caseNumber.toLowerCase().includes(identifier.toLowerCase())
    );

    // If not found, search by client name
    if (!caseFile) {
      caseFile = database.cases.find(c =>
        c.clientName.toLowerCase().includes(identifier.toLowerCase())
      );
    }

    if (!caseFile) {
      throw new Error(`Case not found for identifier: "${identifier}"`);
    }

    // Get case notes
    const notes = database.notes.filter(n => n.caseId === caseFile!.id);

    return {
      case: caseFile,
      notes,
      message: `Retrieved case ${caseFile.caseNumber}`
    };
  }

  /**
   * Add note to case file
   *
   * DESIGN DECISION: Voice-to-text note entry
   * WHY: Faster than typing, hands-free during meetings/calls
   *
   * PATTERN: Pattern-LEGAL-001 (Voice Note Taking)
   */
  @Lumina({
    description: "Add note to case file",
    examples: [
      "Add note to John Doe case: Filed motion to dismiss",
      "Note on case 2024-001: Client called about settlement",
      "Add note: Deposition scheduled for next week"
    ],
    tags: ["legal", "notes", "case-management"]
  })
  async addCaseNote(
    @param("Case number or client name") caseIdentifier: string,
    @param("Note content") noteContent: string
  ): Promise<any> {
    console.log(`📝 Adding note to case: "${caseIdentifier}"`);
    console.log(`📝 Note: "${noteContent}"`);

    // Find case
    let caseFile = database.cases.find(c =>
      c.caseNumber.toLowerCase().includes(caseIdentifier.toLowerCase()) ||
      c.clientName.toLowerCase().includes(caseIdentifier.toLowerCase())
    );

    if (!caseFile) {
      throw new Error(`Case not found: "${caseIdentifier}"`);
    }

    // Create note
    const newNote: CaseNote = {
      id: database.notes.length + 1,
      caseId: caseFile.id,
      content: noteContent,
      createdBy: 'Current User',  // Would use actual auth in real app
      createdAt: new Date().toISOString(),
    };

    database.notes.push(newNote);

    return {
      note: newNote,
      case: caseFile,
      message: `Note added to case ${caseFile.caseNumber}`
    };
  }

  /**
   * Get upcoming deadlines across all cases
   *
   * DESIGN DECISION: Proactive deadline tracking
   * WHY: Missing deadlines = malpractice risk
   */
  @Lumina({
    description: "Show upcoming deadlines across all cases",
    examples: [
      "What are my upcoming deadlines?",
      "Show deadlines for this week",
      "Display upcoming case deadlines"
    ],
    tags: ["legal", "deadlines", "calendar"]
  })
  async getUpcomingDeadlines(): Promise<any> {
    console.log(`📅 Getting upcoming deadlines`);

    // Mock deadlines (in real app, would query calendar/deadline system)
    const deadlines = [
      {
        caseNumber: 'CASE-2024-001',
        clientName: 'John Doe',
        deadline: '2024-10-20',
        type: 'Motion to Dismiss Filing',
        daysRemaining: 8,
      },
      {
        caseNumber: 'CASE-2024-002',
        clientName: 'John Doe',
        deadline: '2024-10-18',
        type: 'Deposition',
        daysRemaining: 6,
      },
      {
        caseNumber: 'CASE-2024-003',
        clientName: 'Acme Corporation',
        deadline: '2024-10-25',
        type: 'Discovery Response Due',
        daysRemaining: 13,
      },
    ];

    // Sort by days remaining
    deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return {
      deadlines,
      count: deadlines.length,
      message: `${deadlines.length} upcoming deadline(s)`
    };
  }

  /**
   * Get case statistics for reporting
   *
   * DESIGN DECISION: Real-time analytics
   * WHY: Firm management needs quick insights
   */
  @Lumina({
    description: "Get case statistics and analytics",
    examples: [
      "Show my case statistics",
      "How many open cases do I have?",
      "Display case analytics"
    ],
    tags: ["legal", "analytics", "reporting"]
  })
  async getCaseStats(): Promise<any> {
    console.log(`📊 Generating case statistics`);

    const stats = {
      totalCases: database.cases.length,
      openCases: database.cases.filter(c => c.status === 'open').length,
      closedCases: database.cases.filter(c => c.status === 'closed').length,
      pendingCases: database.cases.filter(c => c.status === 'pending').length,
      byMatterType: {} as Record<string, number>,
      byAttorney: {} as Record<string, number>,
    };

    // Count by matter type
    database.cases.forEach(c => {
      stats.byMatterType[c.matterType] = (stats.byMatterType[c.matterType] || 0) + 1;
    });

    // Count by attorney
    database.cases.forEach(c => {
      stats.byAttorney[c.assignedAttorney] = (stats.byAttorney[c.assignedAttorney] || 0) + 1;
    });

    return {
      stats,
      message: `${stats.totalCases} total case(s), ${stats.openCases} open`
    };
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Legal Case Management with ÆtherLight Voice Control\n');
  console.log('🔐 PRIVACY: All data stays local (attorney-client privilege preserved)\n');

  // Create ÆtherLight client
  const client = new AetherlightClient({
    host: 'localhost',
    port: 9876,
    autoReconnect: true,
  });

  // Event listeners
  client.on('connected', () => {
    console.log('✅ Connected to ÆtherLight daemon');
    console.log('🎙️  Voice control enabled\n');
    console.log('Try saying:');
    console.log('  - "Find John Doe\'s open cases"');
    console.log('  - "Show case details for CASE-2024-001"');
    console.log('  - "Add note to John Doe case: Client called about settlement"');
    console.log('  - "What are my upcoming deadlines?"');
    console.log('  - "Show case statistics"\n');
  });

  client.on('disconnected', () => {
    console.log('⚠️  Disconnected from ÆtherLight daemon');
  });

  client.on('function_invoked', ({ function_id, parameters, result }) => {
    console.log('\n🎯 Function invoked:', function_id);
    console.log('📥 Parameters:', parameters);
    console.log('📤 Result:', result);
    console.log('');
  });

  // Register voice commands
  const voiceCommands = new LegalVoiceCommands();
  client.register(voiceCommands);

  // Connect to daemon
  try {
    await client.connect();
  } catch (error) {
    console.error('❌ Failed to connect to ÆtherLight daemon:', error);
    console.log('\n💡 Make sure ÆtherLight desktop app is running on localhost:9876');
    process.exit(1);
  }

  // Keep process alive
  console.log('📡 Listening for voice commands... (Press Ctrl+C to exit)\n');
}

main().catch(console.error);

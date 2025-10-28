/**
 * Marketing Platform with ÆtherLight Voice Control - Example
 *
 * DESIGN DECISION: Express.js REST API + ÆtherLight SDK
 * WHY: Standard Node.js stack, easy to understand, replicable
 *
 * PATTERN: Pattern-INTEGRATION-002 (Marketing Platform Integration)
 *
 * USAGE:
 * 1. Start ÆtherLight daemon (desktop app)
 * 2. Run: npm start
 * 3. Say: "Show me high value customers"
 * 4. ÆtherLight invokes getSegment("high value")
 */

import 'reflect-metadata';
import { AetherlightClient, Lumina, param } from '@aetherlight/sdk';

// Mock database
const database = {
  segments: [
    { id: 1, name: 'High Value Customers', size: 1250, revenue: '$125K' },
    { id: 2, name: 'Churned Users', size: 480, revenue: '$0' },
    { id: 3, name: 'Trial Users', size: 3200, revenue: '$0' },
  ],
  campaigns: [
    { id: 1, name: 'Q4 Promotion', sent: 5000, opened: 2500, clicked: 750 },
    { id: 2, name: 'Win-back Campaign', sent: 480, opened: 120, clicked: 30 },
  ],
};

class MarketingVoiceCommands {
  /**
   * Get customer segment by name
   *
   * DESIGN DECISION: Fuzzy search implementation
   * WHY: Users won't say exact segment names
   */
  @Lumina({
    description: "Show customer segments by name or criteria",
    examples: [
      "Show me high value customers",
      "Display churned users segment",
      "Find trial users"
    ],
    tags: ["marketing", "segments"]
  })
  async getSegment(
    @param("Segment name or search query") query: string
  ): Promise<any> {
    console.log(`📊 Searching segments for: "${query}"`);

    // Fuzzy search segments
    const results = database.segments.filter(s =>
      s.name.toLowerCase().includes(query.toLowerCase())
    );

    return {
      segments: results,
      message: `Found ${results.length} matching segment(s)`,
      query
    };
  }

  /**
   * Get campaign performance metrics
   */
  @Lumina({
    description: "Show campaign performance metrics",
    examples: [
      "How did the Q4 promotion perform?",
      "Show win-back campaign stats",
      "Display Q4 promotion metrics"
    ],
    tags: ["marketing", "campaigns", "analytics"]
  })
  async getCampaignStats(
    @param("Campaign name") campaignName: string
  ): Promise<any> {
    console.log(`📈 Getting stats for campaign: "${campaignName}"`);

    const campaign = database.campaigns.find(c =>
      c.name.toLowerCase().includes(campaignName.toLowerCase())
    );

    if (!campaign) {
      throw new Error(`Campaign "${campaignName}" not found`);
    }

    const openRate = ((campaign.opened / campaign.sent) * 100).toFixed(1);
    const clickRate = ((campaign.clicked / campaign.opened) * 100).toFixed(1);

    return {
      campaign,
      openRate: openRate + '%',
      clickRate: clickRate + '%',
      message: `${campaign.name}: ${openRate}% open rate, ${clickRate}% click rate`
    };
  }

  /**
   * Create new customer segment
   */
  @Lumina({
    description: "Create new customer segment with filters",
    examples: [
      "Create segment for users who spent over $100",
      "Make segment for inactive users",
      "Create high spenders segment"
    ],
    tags: ["marketing", "segments", "create"]
  })
  async createSegment(
    @param("Segment name") name: string,
    @param("Segment criteria description") criteria: string
  ): Promise<any> {
    console.log(`✨ Creating segment: "${name}" with criteria: "${criteria}"`);

    const newSegment = {
      id: database.segments.length + 1,
      name,
      criteria,
      size: 0,  // Would calculate in real app
      createdAt: new Date().toISOString(),
    };

    database.segments.push(newSegment);

    return {
      segment: newSegment,
      message: `Created segment "${name}" successfully`
    };
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Marketing Platform with ÆtherLight Voice Control\n');

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
    console.log('  - "Show me high value customers"');
    console.log('  - "How did the Q4 promotion perform?"');
    console.log('  - "Create segment for power users"\n');
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
  const voiceCommands = new MarketingVoiceCommands();
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

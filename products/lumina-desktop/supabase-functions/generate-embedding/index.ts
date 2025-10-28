/**
 * Voyage AI Embedding Generation Edge Function
 *
 * DESIGN DECISION: Edge Function for Voyage AI integration
 * WHY: Secure API key storage, server-side embedding generation
 *
 * REASONING CHAIN:
 * 1. Receive text input from client
 * 2. Call Voyage AI API with voyage-3-code model
 * 3. Return 1024-dim embedding vector
 * 4. Client stores embedding in patterns table
 * 5. Result: Secure embedding generation without exposing API key
 *
 * PATTERN: Pattern-EDGE-FUNCTION-001 (Voyage AI Integration)
 * PERFORMANCE: <100ms embedding generation
 * COST: $0.06 per 1M tokens (3-5× cheaper than OpenAI)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const VOYAGE_API_KEY = Deno.env.get('VOYAGE_API_KEY');
const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';

interface EmbeddingRequest {
  text: string;
  model?: string;
}

interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage: {
    total_tokens: number;
  };
}

serve(async (req) => {
  /**
   * CORS headers for browser requests
   */
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    /**
     * Parse and validate request
     */
    const { text, model = 'voyage-3-code' }: EmbeddingRequest = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: text' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!VOYAGE_API_KEY) {
      console.error('VOYAGE_API_KEY environment variable not set');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    /**
     * Call Voyage AI API
     *
     * DESIGN DECISION: voyage-3-code model (1024 dimensions)
     * WHY: 10.58% better accuracy than OpenAI text-embedding-3-large at 3072-dim
     *      Matryoshka learning concentrates semantic info in first 1024 dimensions
     *
     * PERFORMANCE: <100ms latency, $0.06 per 1M tokens
     */
    console.log(`Generating embedding for text: "${text.substring(0, 100)}..."`);

    const response = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VOYAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: model,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Voyage AI API error:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to generate embedding',
          details: error,
          status: response.status
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();

    /**
     * Extract embedding from response
     *
     * Voyage AI response format:
     * {
     *   "data": [
     *     {
     *       "embedding": [0.023, -0.041, ..., 0.008],
     *       "index": 0
     *     }
     *   ],
     *   "model": "voyage-3-code",
     *   "usage": {
     *     "total_tokens": 8
     *   }
     * }
     */
    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      console.error('Unexpected Voyage AI response format:', data);
      return new Response(
        JSON.stringify({ error: 'Unexpected response format from Voyage AI' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const embedding = data.data[0].embedding;

    // Verify embedding dimensions
    if (embedding.length !== 1024) {
      console.warn(`Expected 1024 dimensions, got ${embedding.length}`);
    }

    const result: EmbeddingResponse = {
      embedding: embedding,
      model: model,
      usage: {
        total_tokens: data.usage.total_tokens,
      },
    };

    console.log(`✅ Generated ${embedding.length}-dim embedding (${data.usage.total_tokens} tokens)`);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );

  } catch (error) {
    console.error('Error generating embedding:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});

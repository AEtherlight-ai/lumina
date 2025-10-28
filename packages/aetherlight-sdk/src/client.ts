/**
 * ÆtherLight Application Integration SDK - WebSocket Client
 *
 * DESIGN DECISION: Decorator-based function registration (TypeScript)
 * WHY: Clean syntax, type-safe, auto-generates function metadata
 *
 * REASONING CHAIN:
 * 1. Developer installs @aetherlight/sdk via npm
 * 2. Connects to ÆtherLight daemon via WebSocket
 * 3. Registers functions with decorators/annotations
 * 4. ÆtherLight automatically handles voice → function calls
 * 5. Developer receives callbacks with extracted parameters
 *
 * PATTERN: Pattern-SDK-001 (Application Integration SDK)
 * PERFORMANCE: <10ms function invocation latency
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import 'reflect-metadata';

export interface AetherlightConfig {
  host?: string;       // Default: 'localhost'
  port?: number;       // Default: 9876
  autoReconnect?: boolean;  // Default: true
  reconnectInterval?: number;  // Default: 5000ms
}

export interface FunctionMetadata {
  description: string;
  examples: string[];
  tags?: string[];
}

export interface ParamMetadata {
  name: string;
  type: string;
  description: string;
  required?: boolean;
}

/**
 * ÆtherLight Client - WebSocket connection to ÆtherLight daemon
 *
 * DESIGN DECISION: EventEmitter base class for async events
 * WHY: Enables reactive programming patterns for function invocations
 */
export class AetherlightClient extends EventEmitter {
  private ws?: WebSocket;
  private config: Required<AetherlightConfig>;
  private registeredFunctions: Map<string, Function> = new Map();
  private requestId: number = 0;
  private pendingRequests: Map<number, { resolve: Function; reject: Function }> = new Map();

  constructor(config: AetherlightConfig = {}) {
    super();
    this.config = {
      host: config.host ?? 'localhost',
      port: config.port ?? 9876,
      autoReconnect: config.autoReconnect ?? true,
      reconnectInterval: config.reconnectInterval ?? 5000,
    };
  }

  /**
   * Connect to ÆtherLight daemon
   *
   * DESIGN DECISION: Promise-based connection with auto-reconnect
   * WHY: Enables await syntax + resilient to daemon restarts
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `ws://${this.config.host}:${this.config.port}`;
      this.ws = new WebSocket(url);

      const connectionTimeout = setTimeout(() => {
        reject(new Error(`Connection timeout after 10s connecting to ${url}`));
      }, 10000);

      this.ws.on('open', () => {
        clearTimeout(connectionTimeout);
        this.emit('connected');
        console.log(`✅ Connected to ÆtherLight daemon at ${url}`);
        resolve();
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      });

      this.ws.on('close', () => {
        this.emit('disconnected');
        console.warn('⚠️ Disconnected from ÆtherLight daemon');

        if (this.config.autoReconnect) {
          console.log(`🔄 Reconnecting in ${this.config.reconnectInterval}ms...`);
          setTimeout(() => {
            this.connect().catch(err => {
              console.error('❌ Reconnection failed:', err);
            });
          }, this.config.reconnectInterval);
        }
      });

      this.ws.on('error', (error) => {
        clearTimeout(connectionTimeout);
        console.error('❌ WebSocket error:', error);
        reject(error);
      });
    });
  }

  /**
   * Register a class instance with voice-command decorated methods
   *
   * DESIGN DECISION: Reflect metadata for automatic parameter extraction
   * WHY: TypeScript decorators provide compile-time type information
   *
   * REASONING CHAIN:
   * 1. Iterate over instance methods
   * 2. Check for @Lumina decorator metadata
   * 3. Extract parameter metadata from @param decorators
   * 4. Send register_function JSON-RPC request
   * 5. Store function reference for later invocation
   */
  register(instance: any): void {
    const prototype = Object.getPrototypeOf(instance);
    const methods = Object.getOwnPropertyNames(prototype)
      .filter(name => name !== 'constructor');

    for (const methodName of methods) {
      const metadata = Reflect.getMetadata('voiceCommand', prototype, methodName);
      if (!metadata) continue;

      const paramMetadata = Reflect.getMetadata('voiceParams', prototype, methodName) || [];
      const functionId = `${instance.constructor.name}.${methodName}`;

      // Register function in ÆtherLight
      this.sendRequest('register_function', {
        function_id: functionId,
        name: methodName,
        description: metadata.description,
        parameters: paramMetadata,
        examples: metadata.examples,
        tags: metadata.tags || [],
      }).then(() => {
        console.log(`✅ Registered function: ${functionId}`);
      }).catch(err => {
        console.error(`❌ Failed to register ${functionId}:`, err);
      });

      // Store function reference for invocation
      this.registeredFunctions.set(functionId, instance[methodName].bind(instance));
    }

    console.log(`📝 Registered ${this.registeredFunctions.size} voice command(s)`);
  }

  /**
   * Disconnect from ÆtherLight daemon
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  /**
   * Handle incoming JSON-RPC message
   *
   * DESIGN DECISION: Support both requests and responses
   * WHY: Bidirectional communication (ÆtherLight can invoke our functions)
   */
  private async handleMessage(message: any): Promise<void> {
    // Handle response to our request
    if (message.id && message.result !== undefined) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        this.pendingRequests.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error.message || 'Unknown error'));
        } else {
          pending.resolve(message.result);
        }
      }
      return;
    }

    // Handle function invocation from ÆtherLight
    if (message.method === 'invoke_function') {
      const { function_id, parameters } = message.params;
      const func = this.registeredFunctions.get(function_id);

      if (!func) {
        this.sendResponse(message.id, null, {
          code: -32601,
          message: `Function ${function_id} not found`,
        });
        return;
      }

      try {
        // Invoke function with extracted parameters
        const result = await func(...Object.values(parameters));

        this.sendResponse(message.id, result);
        this.emit('function_invoked', { function_id, parameters, result });
        console.log(`✅ Executed ${function_id}`);
      } catch (error: any) {
        this.sendResponse(message.id, null, {
          code: -32603,
          message: error.message || 'Internal error',
        });
        console.error(`❌ Function ${function_id} failed:`, error);
      }
    }
  }

  /**
   * Send JSON-RPC 2.0 request
   */
  private sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      this.pendingRequests.set(id, { resolve, reject });

      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      this.ws.send(JSON.stringify(request));

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout for method: ${method}`));
        }
      }, 30000);
    });
  }

  /**
   * Send JSON-RPC 2.0 response
   */
  private sendResponse(id: number, result: any, error?: any): void {
    const response = {
      jsonrpc: '2.0',
      id,
      result,
      error,
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(response));
    }
  }
}

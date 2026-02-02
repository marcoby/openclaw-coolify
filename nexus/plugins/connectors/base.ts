/**
 * Connector Base Class
 *
 * All Nexus connectors extend this base class.
 * Connectors provide access to external services (M365, Google, Notion, etc.)
 */

import type { CompanyProfile } from "../../types/context";

// ============================================================================
// Connector Types
// ============================================================================

export type ConnectorStatus = "disconnected" | "connecting" | "connected" | "error";

export interface ConnectorCredentials {
  type: "oauth" | "api_key" | "token";
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  expiresAt?: string;
}

export interface ConnectorConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  authType: "oauth" | "api_key" | "token";
  scopes?: string[];
  requiredEnv?: string[];
}

export interface ConnectorCapability {
  id: string;
  name: string;
  description: string;
  permission: string;
}

// ============================================================================
// Base Connector Class
// ============================================================================

export abstract class BaseConnector {
  abstract readonly config: ConnectorConfig;
  abstract readonly capabilities: ConnectorCapability[];

  protected status: ConnectorStatus = "disconnected";
  protected credentials: ConnectorCredentials | null = null;
  protected companyId: string | null = null;

  /**
   * Get current connection status
   */
  getStatus(): ConnectorStatus {
    return this.status;
  }

  /**
   * Check if connector is connected
   */
  isConnected(): boolean {
    return this.status === "connected";
  }

  /**
   * Initialize connector with company context
   */
  async initialize(companyId: string, credentials?: ConnectorCredentials): Promise<void> {
    this.companyId = companyId;
    if (credentials) {
      this.credentials = credentials;
      await this.connect();
    }
  }

  /**
   * Connect to the external service
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from the external service
   */
  abstract disconnect(): Promise<void>;

  /**
   * Refresh credentials if needed (for OAuth)
   */
  abstract refreshCredentials(): Promise<ConnectorCredentials | null>;

  /**
   * Get OAuth authorization URL (for OAuth connectors)
   */
  getAuthUrl?(redirectUri: string, state: string): string;

  /**
   * Exchange OAuth code for tokens (for OAuth connectors)
   */
  exchangeCode?(code: string, redirectUri: string): Promise<ConnectorCredentials>;

  /**
   * Test connection
   */
  abstract testConnection(): Promise<{ success: boolean; error?: string }>;

  /**
   * Get available data sources
   */
  abstract getDataSources(): Promise<string[]>;
}

// ============================================================================
// Connector Registry
// ============================================================================

const connectorRegistry = new Map<string, BaseConnector>();

export function registerConnector(connector: BaseConnector): void {
  connectorRegistry.set(connector.config.id, connector);
}

export function getConnector(id: string): BaseConnector | undefined {
  return connectorRegistry.get(id);
}

export function listConnectors(): BaseConnector[] {
  return Array.from(connectorRegistry.values());
}

export function listConnectorConfigs(): ConnectorConfig[] {
  return listConnectors().map(c => c.config);
}

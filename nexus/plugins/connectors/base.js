/**
 * Connector Base Class
 *
 * All Nexus connectors extend this base class.
 * Connectors provide access to external services (M365, Google, Notion, etc.)
 */
// ============================================================================
// Base Connector Class
// ============================================================================
export class BaseConnector {
    status = "disconnected";
    credentials = null;
    companyId = null;
    /**
     * Get current connection status
     */
    getStatus() {
        return this.status;
    }
    /**
     * Check if connector is connected
     */
    isConnected() {
        return this.status === "connected";
    }
    /**
     * Initialize connector with company context
     */
    async initialize(companyId, credentials) {
        this.companyId = companyId;
        if (credentials) {
            this.credentials = credentials;
            await this.connect();
        }
    }
}
// ============================================================================
// Connector Registry
// ============================================================================
const connectorRegistry = new Map();
export function registerConnector(connector) {
    connectorRegistry.set(connector.config.id, connector);
}
export function getConnector(id) {
    return connectorRegistry.get(id);
}
export function listConnectors() {
    return Array.from(connectorRegistry.values());
}
export function listConnectorConfigs() {
    return listConnectors().map(c => c.config);
}

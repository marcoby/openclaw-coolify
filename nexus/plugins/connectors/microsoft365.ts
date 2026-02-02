/**
 * Microsoft 365 Connector
 *
 * Provides access to Microsoft 365 services:
 * - Calendar (read/write events)
 * - Mail (read/send emails)
 * - OneDrive (read/write files)
 * - To Do (read/write tasks)
 *
 * Authentication: OAuth 2.0 with MSAL
 */

import {
  BaseConnector,
  type ConnectorConfig,
  type ConnectorCapability,
  type ConnectorCredentials,
  type ConnectorStatus,
  registerConnector,
} from "./base";

// ============================================================================
// Configuration
// ============================================================================

const M365_CONFIG: ConnectorConfig = {
  id: "microsoft365",
  name: "Microsoft 365",
  description: "Connect to Outlook Calendar, Mail, OneDrive, and To Do",
  icon: "microsoft",
  authType: "oauth",
  scopes: [
    "User.Read",
    "Calendars.ReadWrite",
    "Mail.ReadWrite",
    "Files.ReadWrite",
    "Tasks.ReadWrite",
  ],
  requiredEnv: [
    "M365_CLIENT_ID",
    "M365_CLIENT_SECRET",
    "M365_TENANT_ID",
  ],
};

const M365_CAPABILITIES: ConnectorCapability[] = [
  {
    id: "calendar.read",
    name: "Read Calendar",
    description: "View calendar events and availability",
    permission: "Calendars.Read",
  },
  {
    id: "calendar.write",
    name: "Write Calendar",
    description: "Create, update, and delete calendar events",
    permission: "Calendars.ReadWrite",
  },
  {
    id: "mail.read",
    name: "Read Mail",
    description: "View emails and attachments",
    permission: "Mail.Read",
  },
  {
    id: "mail.send",
    name: "Send Mail",
    description: "Send emails on your behalf",
    permission: "Mail.Send",
  },
  {
    id: "files.read",
    name: "Read Files",
    description: "View files in OneDrive",
    permission: "Files.Read",
  },
  {
    id: "files.write",
    name: "Write Files",
    description: "Create, update, and delete files in OneDrive",
    permission: "Files.ReadWrite",
  },
  {
    id: "tasks.read",
    name: "Read Tasks",
    description: "View To Do tasks and lists",
    permission: "Tasks.Read",
  },
  {
    id: "tasks.write",
    name: "Write Tasks",
    description: "Create, update, and complete To Do tasks",
    permission: "Tasks.ReadWrite",
  },
];

// ============================================================================
// Microsoft Graph API Base URL
// ============================================================================

const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";
const AUTH_BASE = "https://login.microsoftonline.com";

// ============================================================================
// Microsoft 365 Connector Implementation
// ============================================================================

export class Microsoft365Connector extends BaseConnector {
  readonly config = M365_CONFIG;
  readonly capabilities = M365_CAPABILITIES;

  private clientId: string;
  private clientSecret: string;
  private tenantId: string;

  constructor() {
    super();
    this.clientId = process.env.M365_CLIENT_ID || "";
    this.clientSecret = process.env.M365_CLIENT_SECRET || "";
    this.tenantId = process.env.M365_TENANT_ID || "common";
  }

  // --------------------------------------------------------------------------
  // Authentication
  // --------------------------------------------------------------------------

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      response_mode: "query",
      scope: this.config.scopes!.join(" "),
      state,
    });

    return `${AUTH_BASE}/${this.tenantId}/oauth2/v2.0/authorize?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<ConnectorCredentials> {
    const response = await fetch(`${AUTH_BASE}/${this.tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: this.config.scopes!.join(" "),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const data = await response.json();

    return {
      type: "oauth",
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    };
  }

  async refreshCredentials(): Promise<ConnectorCredentials | null> {
    if (!this.credentials?.refreshToken) {
      return null;
    }

    const response = await fetch(`${AUTH_BASE}/${this.tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.credentials.refreshToken,
        grant_type: "refresh_token",
        scope: this.config.scopes!.join(" "),
      }),
    });

    if (!response.ok) {
      this.status = "error";
      return null;
    }

    const data = await response.json();

    this.credentials = {
      type: "oauth",
      accessToken: data.access_token,
      refreshToken: data.refresh_token || this.credentials.refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    };

    return this.credentials;
  }

  async connect(): Promise<void> {
    if (!this.credentials?.accessToken) {
      this.status = "disconnected";
      return;
    }

    // Check if token is expired
    if (this.credentials.expiresAt) {
      const expiresAt = new Date(this.credentials.expiresAt);
      if (expiresAt < new Date()) {
        await this.refreshCredentials();
      }
    }

    this.status = "connecting";
    const test = await this.testConnection();
    this.status = test.success ? "connected" : "error";
  }

  async disconnect(): Promise<void> {
    this.credentials = null;
    this.status = "disconnected";
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.graphRequest("/me");
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // --------------------------------------------------------------------------
  // Graph API Helper
  // --------------------------------------------------------------------------

  private async graphRequest(
    path: string,
    options: { method?: string; body?: unknown } = {}
  ): Promise<unknown> {
    if (!this.credentials?.accessToken) {
      throw new Error("Not connected to Microsoft 365");
    }

    const response = await fetch(`${GRAPH_API_BASE}${path}`, {
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${this.credentials.accessToken}`,
        "Content-Type": "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Graph API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  // --------------------------------------------------------------------------
  // Data Sources
  // --------------------------------------------------------------------------

  async getDataSources(): Promise<string[]> {
    return ["calendar", "mail", "onedrive", "todo"];
  }

  // --------------------------------------------------------------------------
  // Calendar Operations
  // --------------------------------------------------------------------------

  async getCalendarEvents(
    startDate: string,
    endDate: string
  ): Promise<CalendarEvent[]> {
    const response = await this.graphRequest(
      `/me/calendarview?startDateTime=${startDate}&endDateTime=${endDate}&$orderby=start/dateTime`
    ) as { value: unknown[] };

    return response.value.map(mapCalendarEvent);
  }

  async createCalendarEvent(event: CreateCalendarEventInput): Promise<CalendarEvent> {
    const response = await this.graphRequest("/me/events", {
      method: "POST",
      body: {
        subject: event.subject,
        body: { contentType: "text", content: event.description || "" },
        start: { dateTime: event.startTime, timeZone: event.timeZone || "UTC" },
        end: { dateTime: event.endTime, timeZone: event.timeZone || "UTC" },
        attendees: event.attendees?.map(email => ({
          emailAddress: { address: email },
          type: "required",
        })),
      },
    });

    return mapCalendarEvent(response);
  }

  // --------------------------------------------------------------------------
  // Mail Operations
  // --------------------------------------------------------------------------

  async getRecentMails(count: number = 10): Promise<MailMessage[]> {
    const response = await this.graphRequest(
      `/me/messages?$top=${count}&$orderby=receivedDateTime desc`
    ) as { value: unknown[] };

    return response.value.map(mapMailMessage);
  }

  async sendMail(mail: SendMailInput): Promise<void> {
    await this.graphRequest("/me/sendMail", {
      method: "POST",
      body: {
        message: {
          subject: mail.subject,
          body: { contentType: mail.bodyType || "text", content: mail.body },
          toRecipients: mail.to.map(email => ({
            emailAddress: { address: email },
          })),
          ccRecipients: mail.cc?.map(email => ({
            emailAddress: { address: email },
          })),
        },
      },
    });
  }

  // --------------------------------------------------------------------------
  // To Do Operations
  // --------------------------------------------------------------------------

  async getTasks(): Promise<TodoTask[]> {
    // Get all task lists
    const listsResponse = await this.graphRequest("/me/todo/lists") as { value: unknown[] };
    const tasks: TodoTask[] = [];

    for (const list of listsResponse.value as any[]) {
      const tasksResponse = await this.graphRequest(
        `/me/todo/lists/${list.id}/tasks`
      ) as { value: unknown[] };

      for (const task of tasksResponse.value) {
        tasks.push(mapTodoTask(task, list.displayName));
      }
    }

    return tasks;
  }

  async createTask(task: CreateTaskInput): Promise<TodoTask> {
    // Get default task list (or first one)
    const listsResponse = await this.graphRequest("/me/todo/lists") as { value: any[] };
    const listId = listsResponse.value[0]?.id;

    if (!listId) {
      throw new Error("No task list found");
    }

    const response = await this.graphRequest(`/me/todo/lists/${listId}/tasks`, {
      method: "POST",
      body: {
        title: task.title,
        body: task.description ? { content: task.description, contentType: "text" } : undefined,
        dueDateTime: task.dueDate ? { dateTime: task.dueDate, timeZone: "UTC" } : undefined,
      },
    });

    return mapTodoTask(response, "Tasks");
  }
}

// ============================================================================
// Type Definitions
// ============================================================================

export interface CalendarEvent {
  id: string;
  subject: string;
  description: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  attendees: string[];
  location: string;
}

export interface CreateCalendarEventInput {
  subject: string;
  description?: string;
  startTime: string;
  endTime: string;
  timeZone?: string;
  attendees?: string[];
}

export interface MailMessage {
  id: string;
  subject: string;
  from: string;
  to: string[];
  receivedAt: string;
  preview: string;
  isRead: boolean;
}

export interface SendMailInput {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  bodyType?: "text" | "html";
}

export interface TodoTask {
  id: string;
  title: string;
  description: string;
  listName: string;
  isCompleted: boolean;
  dueDate?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  dueDate?: string;
}

// ============================================================================
// Mappers
// ============================================================================

function mapCalendarEvent(raw: any): CalendarEvent {
  return {
    id: raw.id,
    subject: raw.subject || "",
    description: raw.body?.content || "",
    startTime: raw.start?.dateTime || "",
    endTime: raw.end?.dateTime || "",
    isAllDay: raw.isAllDay || false,
    attendees: raw.attendees?.map((a: any) => a.emailAddress?.address) || [],
    location: raw.location?.displayName || "",
  };
}

function mapMailMessage(raw: any): MailMessage {
  return {
    id: raw.id,
    subject: raw.subject || "",
    from: raw.from?.emailAddress?.address || "",
    to: raw.toRecipients?.map((r: any) => r.emailAddress?.address) || [],
    receivedAt: raw.receivedDateTime || "",
    preview: raw.bodyPreview || "",
    isRead: raw.isRead || false,
  };
}

function mapTodoTask(raw: any, listName: string): TodoTask {
  return {
    id: raw.id,
    title: raw.title || "",
    description: raw.body?.content || "",
    listName,
    isCompleted: raw.status === "completed",
    dueDate: raw.dueDateTime?.dateTime,
  };
}

// ============================================================================
// Register Connector
// ============================================================================

const microsoft365Connector = new Microsoft365Connector();
registerConnector(microsoft365Connector);

export { microsoft365Connector };

import { env } from "../config/env";

const SLACK_API_BASE = "https://slack.com/api";

export interface SlackOAuthResponse {
  ok: boolean;
  app_id?: string;
  authed_user?: {
    id: string;
  };
  team?: {
    id: string;
    name: string;
  };
  access_token?: string;
  error?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_private: boolean;
}

export async function getOAuthUrl(state: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: env.slack.clientId || "",
    redirect_uri: env.slack.redirectUri || "",
    state,
    scope: "channels:read,chat:write",
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export async function exchangeOAuthCode(code: string): Promise<SlackOAuthResponse> {
  const params = new URLSearchParams({
    client_id: env.slack.clientId || "",
    client_secret: env.slack.clientSecret || "",
    code,
    redirect_uri: env.slack.redirectUri || "",
  });

  const response = await fetch(`${SLACK_API_BASE}/oauth.v2.access`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await response.json() as SlackOAuthResponse;
  if (!data.ok) {
    throw new Error(data.error || "Failed to exchange Slack OAuth code");
  }

  return data;
}

export async function listChannels(token: string): Promise<SlackChannel[]> {
  const response = await fetch(`${SLACK_API_BASE}/conversations.list?exclude_archived=true&types=public_channel`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json() as any;
  if (!data.ok) {
    throw new Error(data.error || "Failed to list Slack channels");
  }

  return data.channels || [];
}

export async function sendMessage(token: string, channelId: string, text: string): Promise<void> {
  const response = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: channelId,
      text,
    }),
  });

  const data = await response.json() as any;
  if (!data.ok) {
    throw new Error(data.error || "Failed to send Slack message");
  }
}

// Function to check if a channel exists and the bot can access it
export async function validateChannel(token: string, channelId: string): Promise<boolean> {
  try {
    const response = await fetch(`${SLACK_API_BASE}/conversations.info?channel=${channelId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    const data = await response.json() as any;
    if (data.ok && data.channel) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { fetch as expoFetch } from "expo/fetch";

import { useAuthStore, type OpenAICodexCredentials } from "@/stores";

const AUTH_BASE_URL = "https://auth.openai.com";
const AUTHORIZE_URL = `${AUTH_BASE_URL}/oauth/authorize`;
const TOKEN_URL = `${AUTH_BASE_URL}/oauth/token`;
const DEVICE_USER_CODE_URL = `${AUTH_BASE_URL}/api/accounts/deviceauth/usercode`;
const DEVICE_TOKEN_URL = `${AUTH_BASE_URL}/api/accounts/deviceauth/token`;
const DEVICE_VERIFICATION_URL = `${AUTH_BASE_URL}/codex/device`;
const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const ORIGINATOR = "seabreeze";
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;
const DEVICE_CODE_TIMEOUT_MS = 15 * 60 * 1000;

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number | string;
  email?: string;
}

interface CodexJwtPayload {
  exp?: number | string;
  "https://api.openai.com/auth.chatgpt_account_id"?: string;
  "https://api.openai.com/auth.chatgpt_plan_type"?: string;
  "https://api.openai.com/profile.email"?: string;
  "https://api.openai.com/auth"?: {
    chatgpt_account_id?: string;
    chatgpt_plan_type?: string;
  };
  "https://api.openai.com/profile"?: {
    email?: string;
  };
}

const getCodexAccountId = (
  idPayload: CodexJwtPayload | null,
  accessPayload: CodexJwtPayload | null,
  fallback?: OpenAICodexCredentials,
): string | null => {
  return (
    idPayload?.["https://api.openai.com/auth.chatgpt_account_id"] ??
    accessPayload?.["https://api.openai.com/auth.chatgpt_account_id"] ??
    idPayload?.["https://api.openai.com/auth"]?.chatgpt_account_id ??
    accessPayload?.["https://api.openai.com/auth"]?.chatgpt_account_id ??
    fallback?.accountId ??
    null
  );
};

const getCodexPlanType = (
  idPayload: CodexJwtPayload | null,
  accessPayload: CodexJwtPayload | null,
  fallback?: OpenAICodexCredentials,
): string | null => {
  return (
    idPayload?.["https://api.openai.com/auth.chatgpt_plan_type"] ??
    accessPayload?.["https://api.openai.com/auth.chatgpt_plan_type"] ??
    idPayload?.["https://api.openai.com/auth"]?.chatgpt_plan_type ??
    accessPayload?.["https://api.openai.com/auth"]?.chatgpt_plan_type ??
    fallback?.planType ??
    null
  );
};

const getCodexEmail = (
  idPayload: CodexJwtPayload | null,
  accessPayload: CodexJwtPayload | null,
  tokens: TokenResponse,
  fallback?: OpenAICodexCredentials,
): string | null => {
  return (
    idPayload?.["https://api.openai.com/profile.email"] ??
    accessPayload?.["https://api.openai.com/profile.email"] ??
    idPayload?.["https://api.openai.com/profile"]?.email ??
    accessPayload?.["https://api.openai.com/profile"]?.email ??
    tokens.email ??
    fallback?.email ??
    null
  );
};

export interface OpenAICodexDeviceCodePrompt {
  verificationUrl: string;
  userCode: string;
  expiresInMs: number;
}

const randomBase64Url = (byteLength: number): string => {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
};

const base64UrlEncode = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return globalThis
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const createCodeChallenge = async (verifier: string): Promise<string> => {
  if (!globalThis.crypto?.subtle) {
    throw new Error("PKCE is not available on this device. Use device-code sign-in instead.");
  }
  const data = new TextEncoder().encode(verifier);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
};

const decodeJwtPayload = (token?: string): CodexJwtPayload | null => {
  if (!token) return null;
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    return JSON.parse(globalThis.atob(padded)) as CodexJwtPayload;
  } catch {
    return null;
  }
};

const normalizeExpiresAt = (tokens: TokenResponse): number => {
  const expiresIn = typeof tokens.expires_in === "string" ? Number(tokens.expires_in) : tokens.expires_in;
  if (typeof expiresIn === "number" && Number.isFinite(expiresIn) && expiresIn > 0) {
    return Date.now() + expiresIn * 1000;
  }

  const payload = decodeJwtPayload(tokens.access_token);
  const exp = typeof payload?.exp === "string" ? Number(payload.exp) : payload?.exp;
  return typeof exp === "number" && Number.isFinite(exp) ? exp * 1000 : Date.now() + 60 * 60 * 1000;
};

const credentialsFromTokenResponse = (
  tokens: TokenResponse,
  fallback?: OpenAICodexCredentials,
): OpenAICodexCredentials => {
  const accessToken = tokens.access_token;
  const refreshToken = tokens.refresh_token ?? fallback?.refreshToken;
  if (!accessToken || !refreshToken) {
    throw new Error("OpenAI Codex token response did not include usable credentials.");
  }

  const idPayload = decodeJwtPayload(tokens.id_token);
  const accessPayload = decodeJwtPayload(accessToken);
  return {
    accessToken,
    refreshToken,
    expiresAt: normalizeExpiresAt(tokens),
    accountId: getCodexAccountId(idPayload, accessPayload, fallback),
    email: getCodexEmail(idPayload, accessPayload, tokens, fallback),
    planType: getCodexPlanType(idPayload, accessPayload, fallback),
  };
};

const postToken = async (body: URLSearchParams): Promise<TokenResponse> => {
  const response = await expoFetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      originator: ORIGINATOR,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI Codex token request failed: ${response.status} ${text}`);
  }

  return (await response.json()) as TokenResponse;
};

export const getStoredOpenAICodexCredentials = (): OpenAICodexCredentials | null => {
  const state = useAuthStore.getState();
  if (!state.openaiCodexAccessToken || !state.openaiCodexRefreshToken || !state.openaiCodexExpiresAt) {
    return null;
  }

  return {
    accessToken: state.openaiCodexAccessToken,
    refreshToken: state.openaiCodexRefreshToken,
    expiresAt: state.openaiCodexExpiresAt,
    accountId: state.openaiCodexAccountId,
    email: state.openaiCodexEmail,
    planType: state.openaiCodexPlanType,
  };
};

export const saveOpenAICodexCredentials = (credentials: OpenAICodexCredentials | null): void => {
  useAuthStore.getState().setOpenAICodexCredentials(credentials);
};

export const refreshOpenAICodexCredentials = async (
  credentials: OpenAICodexCredentials,
): Promise<OpenAICodexCredentials> => {
  const tokens = await postToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      refresh_token: credentials.refreshToken,
    }),
  );
  const nextCredentials = credentialsFromTokenResponse(tokens, credentials);
  saveOpenAICodexCredentials(nextCredentials);
  return nextCredentials;
};

export const getValidOpenAICodexCredentials = async (): Promise<OpenAICodexCredentials | null> => {
  const credentials = getStoredOpenAICodexCredentials();
  if (!credentials) return null;
  if (credentials.expiresAt - TOKEN_EXPIRY_BUFFER_MS > Date.now()) {
    return credentials;
  }
  return refreshOpenAICodexCredentials(credentials);
};

export const signInOpenAICodexWithBrowser = async (): Promise<OpenAICodexCredentials> => {
  const redirectUri = Linking.createURL("auth/callback");
  const codeVerifier = randomBase64Url(32);
  const codeChallenge = await createCodeChallenge(codeVerifier);
  const state = randomBase64Url(16);
  const authUrl = `${AUTHORIZE_URL}?${new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "openid profile email offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    id_token_add_organizations: "true",
    codex_cli_simplified_flow: "true",
    originator: ORIGINATOR,
    state,
  }).toString()}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
  if (result.type !== "success") {
    throw new Error("OpenAI Codex browser sign-in was cancelled or did not complete.");
  }

  const parsed = Linking.parse(result.url);
  const query = parsed.queryParams ?? {};
  const returnedState = typeof query.state === "string" ? query.state : undefined;
  const code = typeof query.code === "string" ? query.code : undefined;
  const error = typeof query.error === "string" ? query.error : undefined;

  if (error) throw new Error(`OpenAI Codex sign-in failed: ${error}`);
  if (!code || returnedState !== state) {
    throw new Error("OpenAI Codex sign-in callback was invalid.");
  }

  const tokens = await postToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: CLIENT_ID,
      code_verifier: codeVerifier,
    }),
  );
  const credentials = credentialsFromTokenResponse(tokens);
  saveOpenAICodexCredentials(credentials);
  return credentials;
};

export const signInOpenAICodexWithDeviceCode = async (
  onVerification: (prompt: OpenAICodexDeviceCodePrompt) => Promise<void> | void,
): Promise<OpenAICodexCredentials> => {
  const userCodeResponse = await expoFetch(DEVICE_USER_CODE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", originator: ORIGINATOR },
    body: JSON.stringify({ client_id: CLIENT_ID }),
  });

  if (!userCodeResponse.ok) {
    throw new Error(`OpenAI Codex device-code request failed: ${userCodeResponse.status}`);
  }

  const userCodeBody = (await userCodeResponse.json()) as {
    device_auth_id?: string;
    user_code?: string;
    usercode?: string;
    interval?: string | number;
  };
  const deviceAuthId = userCodeBody.device_auth_id;
  const userCode = userCodeBody.user_code ?? userCodeBody.usercode;
  if (!deviceAuthId || !userCode) {
    throw new Error("OpenAI Codex device-code response was incomplete.");
  }

  await onVerification({
    verificationUrl: DEVICE_VERIFICATION_URL,
    userCode,
    expiresInMs: DEVICE_CODE_TIMEOUT_MS,
  });

  const intervalMs = Math.max(Number(userCodeBody.interval || 5) * 1000, 1000);
  const deadline = Date.now() + DEVICE_CODE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const tokenResponse = await expoFetch(DEVICE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", originator: ORIGINATOR },
      body: JSON.stringify({ device_auth_id: deviceAuthId, user_code: userCode }),
    });

    if (tokenResponse.ok) {
      const body = (await tokenResponse.json()) as {
        authorization_code?: string;
        code_verifier?: string;
      };
      if (!body.authorization_code || !body.code_verifier) {
        throw new Error("OpenAI Codex device authorization response was incomplete.");
      }
      const tokens = await postToken(
        new URLSearchParams({
          grant_type: "authorization_code",
          code: body.authorization_code,
          redirect_uri: `${AUTH_BASE_URL}/deviceauth/callback`,
          client_id: CLIENT_ID,
          code_verifier: body.code_verifier,
        }),
      );
      const credentials = credentialsFromTokenResponse(tokens);
      saveOpenAICodexCredentials(credentials);
      return credentials;
    }

    if (tokenResponse.status !== 403 && tokenResponse.status !== 404) {
      throw new Error(`OpenAI Codex device authorization failed: ${tokenResponse.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(intervalMs, deadline - Date.now())));
  }

  throw new Error("OpenAI Codex device authorization timed out.");
};

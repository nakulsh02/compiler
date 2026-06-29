const BASE = "/api";

function getToken() {
  return localStorage.getItem("codesync_token");
}

export function setToken(token: string) {
  localStorage.setItem("codesync_token", token);
}

export function clearToken() {
  localStorage.removeItem("codesync_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

export const api = {
  auth: {
    signup: (email: string, password: string, display_name?: string) =>
      request<{ token: string; user: import("../types").User }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, display_name }),
      }),
    signin: (email: string, password: string) =>
      request<{ token: string; user: import("../types").User }>("/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<{ user: import("../types").User }>("/auth/me"),
    updateProfile: (updates: { display_name?: string; avatar_url?: string }) =>
      request<{ user: import("../types").User }>("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(updates),
      }),
  },

  projects: {
    list: () => request<import("../types").Project[]>("/projects"),
    create: (data: { name: string; language: string; description?: string }) =>
      request<import("../types").Project>("/projects", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<import("../types").Project>) =>
      request<import("../types").Project>(`/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/projects/${id}`, { method: "DELETE" }),
  },

  files: {
    list: (projectId: string) =>
      request<import("../types").ProjectFile[]>(`/projects/${projectId}/files`),
    create: (projectId: string, data: Partial<import("../types").ProjectFile>) =>
      request<import("../types").ProjectFile>(`/projects/${projectId}/files`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    bulkCreate: (projectId: string, files: Partial<import("../types").ProjectFile>[]) =>
      request<import("../types").ProjectFile[]>(`/projects/${projectId}/files/bulk`, {
        method: "POST",
        body: JSON.stringify({ files }),
      }),
    update: (id: string, data: Partial<import("../types").ProjectFile>) =>
      request<import("../types").ProjectFile>(`/files/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/files/${id}`, { method: "DELETE" }),
  },

  messages: {
    list: (projectId: string) =>
      request<import("../types").ChatMessage[]>(`/projects/${projectId}/messages`),
    create: (projectId: string, content: string) =>
      request<import("../types").ChatMessage>(`/projects/${projectId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
  },

  versions: {
    list: (projectId: string) =>
      request<import("../types").Version[]>(`/projects/${projectId}/versions`),
    create: (projectId: string, data: { file_id?: string; content?: string; message: string }) =>
      request<import("../types").Version>(`/projects/${projectId}/versions`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
};

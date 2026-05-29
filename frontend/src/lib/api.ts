/**
 * API client for FastAPI backend.
 * Handles auth tokens, error responses, and typed requests.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ApiResponse<T = any> {
  ok?: boolean;
  data?: T;
  detail?: string;
  msg?: string;
  [key: string]: any;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("access_token");
  }

  private async request<T = any>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_id");
        window.location.href = "/login";
      }
      throw new Error("Unauthorized");
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || data.msg || `HTTP ${res.status}`);
    }

    return data as T;
  }

  async get<T = any>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  async post<T = any>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T = any>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T = any>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }

  // ── Auth ──────────────────────────────────────────────────────────
  async login(username: string, password: string) {
    return this.post<{
      access_token: string;
      token_type: string;
      user_id: string;
    }>("/user/login", { username, password });
  }

  async getUserInfo() {
    return this.get<Record<string, any>>("/user/info");
  }

  // ── Entities ──────────────────────────────────────────────────────
  async getEntities() {
    return this.get<Record<string, any>[]>("/commons/entities");
  }

  async getFields(entity: string) {
    return this.get<Record<string, any>[]>(`/commons/fields?entity=${entity}`);
  }

  // ── Records ───────────────────────────────────────────────────────
  async getDataList(
    entity: string,
    page = 1,
    pageSize = 20,
    sort?: string,
    filter?: Record<string, any>
  ) {
    return this.post<Record<string, any>>(`/app/${entity}/data-list`, {
      page_no: page,
      page_size: pageSize,
      sort,
      filter,
    });
  }

  async getRecord(entity: string, recordId: string) {
    return this.get<Record<string, any>>(
      `/app/${entity}/view-model?record=${recordId}`
    );
  }

  async saveRecord(entity: string, data: Record<string, any>) {
    return this.post<Record<string, any>>(
      `/app/${entity}/record-save`,
      data
    );
  }

  async deleteRecord(entity: string, recordId: string) {
    return this.post<Record<string, any>>(
      `/app/${entity}/record-delete`,
      { record_id: recordId }
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────
  async getDashboards() {
    return this.get<Record<string, any>[]>("/dashboard/dash-gets");
  }

  async getChartData(chartId: string) {
    return this.get<Record<string, any>>(`/dashboard/chart-data?id=${chartId}`);
  }

  // ── Admin: Metadata ───────────────────────────────────────────────
  async listEntities() {
    return this.get<Record<string, any>[]>("/admin/metadata/entities");
  }

  async createEntity(data: Record<string, any>) {
    return this.post("/admin/metadata/entity/new", data);
  }

  async updateEntity(entity: string, data: Record<string, any>) {
    return this.post(`/admin/metadata/entity/${entity}/update`, data);
  }

  // ── Admin: Users ──────────────────────────────────────────────────
  async listUsers(page = 1, pageSize = 20) {
    return this.get<Record<string, any>>(
      `/admin/bizuser/users?page=${page}&pageSize=${pageSize}`
    );
  }

  async listDepartments() {
    return this.get<Record<string, any>[]>("/admin/bizuser/departments");
  }

  // ── Admin: System ─────────────────────────────────────────────────
  async getSystemConfig() {
    return this.get<Record<string, any>>("/admin/integration/systems");
  }

  async getStorageConfig() {
    return this.get<Record<string, any>>("/admin/integration/storage-data");
  }

  // ── Feeds ─────────────────────────────────────────────────────────
  async listFeeds(pageNo = 1, type?: string) {
    return this.post<Record<string, any>>("/feeds/feeds-list", {
      page_no: pageNo,
      type,
    });
  }

  async publishFeed(data: Record<string, any>) {
    return this.post("/feeds/publish", data);
  }

  // ── Projects ──────────────────────────────────────────────────────
  async listProjects() {
    return this.get<Record<string, any>>("/project/plan-list");
  }

  async listTriggers() {
    return this.get<Record<string, any>>("/admin/robot/trigger/list");
  }

  // ── Notifications ─────────────────────────────────────────────────
  async listNotifications(page = 1) {
    return this.get<Record<string, any>>(
      `/notification/list?page=${page}`
    );
  }
}

export const api = new ApiClient(API_BASE);
export default api;

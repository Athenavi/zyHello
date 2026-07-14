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

  async request<T = any>(
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

  async get<T = any>(path: string): Promise<any> {
    return this.request<T>(path, { method: "GET" });
  }

  async post<T = any>(path: string, body?: any): Promise<any> {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T = any>(path: string, body?: any): Promise<any> {
    return this.request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T = any>(path: string): Promise<any> {
    return this.request<T>(path, { method: "DELETE" });
  }

  // ── Auth ──────────────────────────────────────────────────────────
  async login(username: string, password: string, captcha?: string) {
    return this.post<{
      access_token: string;
      token_type: string;
      user_id: string;
    }>("/user/user-login", { username, password, captcha });
  }

  getCaptchaUrl(): string {
    return `${this.baseUrl}/user/captcha?t=${Date.now()}`;
  }

  async getSsoProviders() {
    return this.get<Record<string, any>>("/user/sso-providers");
  }

  async getLoginAnnouncement() {
    return this.get<{ msg?: string }>("/user/login-announcement");
  }

  async getUserInfo() {
    return this.get<Record<string, any>>("/user/info");
  }

  // ── Signup ─────────────────────────────────────────────────────────
  async sendSignupEmailVcode(email: string) {
    return this.post("/user/signup-email-vcode", { email });
  }

  async checkoutName(name: string) {
    return this.post<{ data?: string }>("/user/checkout-name", { name });
  }

  async signupConfirm(data: { login_name: string; full_name: string; email: string; vcode: string }) {
    return this.post("/user/signup-confirm", data);
  }

  // ── Password Reset ────────────────────────────────────────────────
  async forgotPassword(email: string) {
    return this.post("/user/user-forgot-passwd", { email });
  }

  async confirmPassword(data: { email: string; vcode: string; newpwd: string }) {
    return this.post("/user/user-confirm-passwd", data);
  }

  // ── User Settings ─────────────────────────────────────────────────
  async updateUserProfile(data: Record<string, any>) {
    return this.post("/user/profile-save", data);
  }

  async updateEmail(email: string, vcode: string) {
    return this.post("/user/save-email", { email, vcode });
  }

  async updatePassword(oldpwd: string, newpwd: string) {
    return this.post("/user/save-passwd", { oldPasswd: oldpwd, newPasswd: newpwd });
  }

  async getLoginLogs(page = 1) {
    return this.get<Record<string, any>>(`/user/login-logs?page=${page}`);
  }

  // ── Entities ──────────────────────────────────────────────────────
  async getEntities() {
    return this.get<Record<string, any>[]>("/commons/entities");
  }

  async getEntityFields(entityName: string) {
    return this.get<Record<string, any>[]>(`/commons/fields?entity=${entityName}`);
  }

  async getFields(entity: string) {
    return this.get<Record<string, any>[]>(`/commons/fields?entity=${entity}`);
  }

  async getEntityMeta(entityName: string) {
    return this.get<Record<string, any>>(`/commons/meta-info?entity=${entityName}`);
  }

  async getEntityList() {
    return this.get<Record<string, any>[]>("/commons/entities");
  }

  async getFilters(entityName: string) {
    return this.get<Record<string, any>[]>(`/app/${entityName}/advfilter/list`);
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
      pageNo: page,
      pageSize: pageSize,
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
    const recordId = data.id || undefined;
    const { id, ...fields } = data;
    return this.post<Record<string, any>>(
      `/app/${entity}/record-save`,
      { id: recordId, data: fields }
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

  async listCharts() {
    return this.get<Record<string, any>>("/dashboard/chart-list");
  }

  // ── Admin: Metadata ───────────────────────────────────────────────
  async listEntities() {
    return this.get<Record<string, any>[]>("/admin/metadata/entity-list");
  }

  async createEntity(data: Record<string, any>) {
    return this.post("/admin/metadata/entity-create", data);
  }

  async updateEntity(entity: string, data: Record<string, any>) {
    return this.post("/admin/metadata/entity-update", { entityName: entity, ...data });
  }

  // ── Admin: Users ──────────────────────────────────────────────────
  async listUsers(page = 1, pageSize = 20, deptId?: string, filter?: number, q?: string) {
    let url = `/admin/bizuser/user-list?pageNo=${page}&pageSize=${pageSize}`;
    if (deptId) url += `&dept=${deptId}`;
    if (filter !== undefined) url += `&filter=${filter}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    return this.get<Record<string, any>>(url);
  }

  async listDepartments() {
    return this.get<Record<string, any>[]>("/admin/bizuser/dept-list");
  }

  async getDepartmentTree() {
    return this.get<Record<string, any>[]>("/admin/bizuser/dept-tree");
  }

  async saveUser(data: Record<string, any>) {
    return this.post("/admin/bizuser/user-save", data);
  }

  async deleteUser(userId: string) {
    return this.post("/admin/bizuser/user-delete", { id: userId });
  }

  async enableUser(userId: string, enabled: boolean) {
    return this.post("/admin/bizuser/user/disable", { id: userId, enabled });
  }

  async saveDepartment(data: Record<string, any>) {
    return this.post("/admin/bizuser/dept-save", data);
  }

  async deleteDepartment(deptId: string) {
    return this.post("/admin/bizuser/dept-delete", { id: deptId });
  }

  // ── Admin: Roles ──────────────────────────────────────────────────
  async listRoles() {
    return this.get<Record<string, any>[]>("/admin/bizuser/role-list");
  }

  async getRolePrivileges(roleId: string) {
    return this.get<Record<string, any>>(`/admin/bizuser/role-privileges?role=${roleId}`);
  }

  async saveRolePrivileges(roleId: string, privileges: Record<string, any>) {
    return this.post("/admin/bizuser/role-privileges-save", { roleId, ...privileges });
  }

  // ── Admin: Audit ──────────────────────────────────────────────────
  async listLoginLogs(page = 1, pageSize = 20, query?: string) {
    let url = `/admin/audit/login-logs?pageNo=${page}&pageSize=${pageSize}`;
    if (query) url += `&q=${encodeURIComponent(query)}`;
    return this.get<Record<string, any>>(url);
  }

  async listOnlineUsers() {
    return this.get<Record<string, any>>("/admin/audit/online-users");
  }

  async listRecycleBin(page = 1, pageSize = 20, entity?: string, query?: string) {
    let url = `/admin/audit/recycle-bin?pageNo=${page}&pageSize=${pageSize}`;
    if (entity) url += `&entity=${entity}`;
    if (query) url += `&q=${encodeURIComponent(query)}`;
    return this.get<Record<string, any>>(url);
  }

  async restoreRecord(recordId: string) {
    return this.post("/admin/audit/recycle-restore", { record_id: recordId });
  }

  // ── Admin: System Config ──────────────────────────────────────────
  async getSystemSettings() {
    return this.get<Record<string, any>>("/admin/system/settings");
  }

  async saveSystemSettings(data: Record<string, any>) {
    return this.post("/admin/system/settings-save", data);
  }

  // ── Admin: CLI ────────────────────────────────────────────────────
  async execCliCommand(command: string) {
    return this.post<{ data?: string; error_msg?: string }>("/admin/admin-cli/exec", command);
  }

  // ── Admin: API Keys ───────────────────────────────────────────────
  async listApiKeys() {
    return this.get<Record<string, any>>("/admin/integration/apis-manager/app-list");
  }

  async createApiKey(data: Record<string, any>) {
    return this.post("/admin/integration/apis-create", data);
  }

  async deleteApiKey(appId: string) {
    return this.post("/admin/integration/apis-delete", { appId });
  }

  // ── Admin: Projects ───────────────────────────────────────────────
  async listAdminProjects() {
    return this.get<Record<string, any>>("/admin/project/projects");
  }

  async saveAdminProject(projectId: string, data: Record<string, any> = {}) {
    return this.post("/admin/project/project-save", { projectId, ...data });
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
      pageNo,
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

  async getProjectTasks(projectId: string, planId: string, sort?: string, search?: string, pageNo = 1, pageSize = 100) {
    const params = new URLSearchParams({ project_id: projectId, plan_key: planId, page_no: String(pageNo), page_size: String(pageSize) });
    if (sort) params.set("sort", sort);
    if (search) params.set("search", search);
    return this.get<Record<string, any>>(`/project/tasks/list?${params.toString()}`);
  }

  async getProjectTaskDetail(taskId: string) {
    return this.get<Record<string, any>>(`/project/tasks/details?task_id=${taskId}`);
  }

  async getProjectTask(taskId: string) {
    return this.get<Record<string, any>>(`/project/tasks/get?task_id=${taskId}`);
  }

  async saveProjectTask(data: Record<string, any>) {
    return this.post("/project/tasks/save", data);
  }

  async deleteProjectTask(taskId: string) {
    return this.post("/project/tasks/delete", { task_id: taskId });
  }

  async addProjectTaskComment(taskId: string, content: string) {
    return this.post("/project/task/comment/save", { task_id: taskId, content });
  }

  async listTriggers(entity?: string) {
    const params = new URLSearchParams();
    if (entity) params.set("entity", entity);
    return this.get<Record<string, any>>(`/admin/robot/trigger/list?${params}`);
  }

  async getTrigger(triggerId: string) {
    return this.get<Record<string, any>>(`/admin/robot/trigger/${triggerId}`);
  }

  async saveTrigger(data: Record<string, any>) {
    return this.post<Record<string, any>>("/admin/robot/trigger/save", data);
  }

  async deleteTrigger(triggerId: string) {
    return this.post("/admin/robot/trigger/delete", { configId: triggerId });
  }

  // ── Notifications ─────────────────────────────────────────────────
  async listNotifications(page = 1) {
    return this.get<Record<string, any>>(
      `/notification/list?page=${page}`
    );
  }

  async markAllRead() {
    return this.post("/notification/make-read", {});
  }

  async makeRead(messageIds: string[]) {
    return this.post("/notification/make-read", { messageIds });
  }

  // ── Setup / Install ───────────────────────────────────────────────
  async getInstallStatus() {
    return this.get<{ installed: boolean }>("/admin/setup/install-status");
  }

  async testDatabaseConnection(data: Record<string, any>) {
    return this.post<{ success: boolean; message?: string; error?: string }>(
      "/admin/setup/test-connection",
      data
    );
  }

  async testCacheConnection(data: Record<string, any>) {
    return this.post<{ success: boolean; message?: string; error?: string }>(
      "/admin/setup/test-cache",
      data
    );
  }

  async installRebuild(data: Record<string, any> = {}) {
    return this.post<{ success: boolean; error?: string }>(
      "/admin/setup/install-rebuild",
      data
    );
  }

  // ── Audit ──────────────────────────────────────────────────────────
  async listRevisionHistory(page = 1, pageSize = 20, entity?: string, query?: string) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (entity) params.set("entity", entity);
    if (query) params.set("q", query);
    return this.get<Record<string, any>>(`/admin/audit/revision-history?${params}`);
  }

  async listSmsLogs(page = 1, pageSize = 20, query?: string) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (query) params.set("q", query);
    return this.get<Record<string, any>>(`/admin/audit/smsend-logs?${params}`);
  }

  // ── Teams ──────────────────────────────────────────────────────────
  async listTeams(page = 1, pageSize = 20, query?: string) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (query) params.set("q", query);
    return this.get<Record<string, any>>(`/admin/bizuser/teams?${params}`);
  }

  async getTeam(teamId: string) {
    return this.get<Record<string, any>>(`/admin/bizuser/team/${teamId}`);
  }

  async saveTeam(data: Record<string, any>) {
    return this.post<Record<string, any>>("/admin/bizuser/team-save", data);
  }

  async deleteTeam(teamId: string) {
    return this.post("/admin/bizuser/team-delete", { id: teamId });
  }

  // ── Departments ────────────────────────────────────────────────────
  async getDepartment(_deptId: string) {
    return this.get<Record<string, any>>(`/admin/bizuser/dept-list`);
  }

  // ── Roles (paths corrected to match backend) ──────────────────────
  async getRole(roleId: string) {
    return this.get<Record<string, any>>(`/admin/bizuser/Role/view/${roleId}`);
  }

  async saveRole(data: Record<string, any>) {
    return this.post<Record<string, any>>("/admin/bizuser/role-save", data);
  }

  async deleteRole(roleId: string) {
    return this.post("/admin/bizuser/role-delete", { id: roleId });
  }

  // ── User Admin Actions ─────────────────────────────────────────────
  async disableUser(userId: string) {
    return this.post("/admin/bizuser/user/disable", { id: userId });
  }

  async resetUserPassword(userId: string) {
    return this.post("/admin/bizuser/user/reset-password", { id: userId });
  }

  async changeUserDept(userId: string, deptId: string) {
    return this.post("/admin/bizuser/user/change-dept", { id: userId, deptId });
  }

  async changeUserRole(userId: string, roleId: string) {
    return this.post("/admin/bizuser/user/change-role", { id: userId, roleId });
  }

  // ── Integration Config ─────────────────────────────────────────────
  async getIntegrationConfig(type: string) {
    return this.get<Record<string, any>>(`/admin/integration/${type}`);
  }

  async saveIntegrationConfig(type: string, data: Record<string, any>) {
    return this.post<Record<string, any>>(`/admin/integration/${type}/save`, data);
  }

  // ── Classifications ────────────────────────────────────────────────
  async listClassifications() {
    return this.get<Record<string, any>>("/admin/metadata/classifications");
  }

  async getClassification(classId: string) {
    return this.get<Record<string, any>>(`/admin/metadata/classification/${classId}`);
  }

  async saveClassification(data: Record<string, any>) {
    return this.post<Record<string, any>>("/admin/metadata/classification/save", data);
  }

  async deleteClassification(classId: string) {
    return this.post("/admin/metadata/classification/delete", { id: classId });
  }

  // ── Metadata ───────────────────────────────────────────────────────
  async listEntityFields(entityName: string) {
    return this.get<Record<string, any>>(`/admin/metadata/entity/${entityName}/fields`);
  }

  async getEntityOverview(entityName: string) {
    return this.get<Record<string, any>>(`/admin/metadata/entity/${entityName}/overview`);
  }

  async saveEntity(entityName: string, data: Record<string, any>) {
    return this.post("/admin/metadata/entity-update", { entityName, ...data });
  }

  async getEntityDetail(entityName: string) {
    return this.get<Record<string, any>>(`/admin/metadata/entity/${entityName}/base`);
  }

  async getEntityAdvanced(entityName: string) {
    return this.get<Record<string, any>>(`/admin/metadata/entity/${entityName}/advanced`);
  }

  async saveEntityAdvanced(entityName: string, data: Record<string, any>) {
    return this.post<Record<string, any>>(`/admin/metadata/${entityName}/advanced`, data);
  }

  async deleteEntity(entityName: string) {
    return this.post("/admin/metadata/entity-delete", { entityName });
  }

  async getFormDesign(entityName: string) {
    return this.get<Record<string, any>>(`/admin/metadata/entity/${entityName}/form-design`);
  }

  async saveFormDesign(entityName: string, data: Record<string, any>) {
    return this.post("/admin/metadata/form-layout", { entity: entityName, config: data });
  }

  async getEntityI18n(entityName: string) {
    return this.get<Record<string, any>>(`/admin/metadata/entity/${entityName}/i18n`);
  }

  async saveEntityI18n(entityName: string, data: Record<string, any>) {
    return this.post<Record<string, any>>(`/admin/metadata/${entityName}/i18n`, data);
  }

  async getFieldDetail(entityName: string, fieldName: string) {
    return this.get<Record<string, any>>(`/admin/metadata/entity/${entityName}/field/${fieldName}`);
  }

  async saveField(entityName: string, data: Record<string, any>) {
    if (data.fieldName) {
      return this.post("/admin/metadata/field-update", { entityName, ...data });
    }
    return this.post("/admin/metadata/field-create", { entityName, ...data });
  }

  async listAutoFillins(entityName: string, fieldName: string) {
    return this.get<Record<string, any>>(`/admin/metadata/${entityName}/field/${fieldName}/auto-fillin`);
  }

  async saveAutoFillin(entityName: string, fieldName: string, data: Record<string, any>) {
    return this.post<Record<string, any>>(`/admin/metadata/${entityName}/field/${fieldName}/auto-fillin`, data);
  }

  async deleteAutoFillin(entityName: string, fieldName: string, fillinId: string) {
    return this.post(`/admin/metadata/${entityName}/field/${fieldName}/auto-fillin/delete`, { id: fillinId });
  }

  async getViewAddons(entityName: string, type: string) {
    return this.get<Record<string, any>>(`/admin/metadata/${entityName}/view-addons?type=${type}`);
  }

  async saveViewAddons(entityName: string, type: string, data: Record<string, any>) {
    return this.post<Record<string, any>>(`/admin/metadata/${entityName}/view-addons?type=${type}`, data);
  }

  async getListFilterpane(entityName: string) {
    return this.get<Record<string, any>>(`/admin/metadata/${entityName}/list-filterpane`);
  }

  async saveListFilterpane(entityName: string, data: Record<string, any>) {
    return this.post<Record<string, any>>(`/admin/metadata/${entityName}/list-filterpane`, data);
  }

  async getListStats(entityName: string) {
    return this.get<Record<string, any>>(`/admin/metadata/${entityName}/list-stats`);
  }

  async saveListStats(entityName: string, data: Record<string, any>) {
    return this.post<Record<string, any>>(`/admin/metadata/${entityName}/list-stats`, data);
  }

  async addProjectPlan(data: Record<string, any>) {
    return this.post<Record<string, any>>("/admin/project/plan-add", data);
  }

  async deleteProjectPlan(planId: string) {
    return this.post("/admin/project/plan-delete", { id: planId });
  }

  // ── Report Templates ───────────────────────────────────────────────
  async listReportTemplates(entity?: string, query?: string) {
    const params = new URLSearchParams();
    if (entity) params.set("entity", entity);
    if (query) params.set("q", query);
    return this.get<Record<string, any>>(`/admin/data/report-templates/list?${params}`);
  }

  async deleteReportTemplate(templateId: string) {
    return this.post("/admin/data/report-templates/delete", { configId: templateId });
  }

  // ── Data Imports ───────────────────────────────────────────────────
  async listDataImports(page = 1, pageSize = 20) {
    return this.get<Record<string, any>>(`/admin/data/imports?page=${page}&pageSize=${pageSize}`);
  }

  async getDataImport(importId: string) {
    return this.get<Record<string, any>>(`/admin/data/import/${importId}`);
  }

  // ── Approvals ──────────────────────────────────────────────────────
  async listApprovals(entity?: string) {
    const params = new URLSearchParams();
    if (entity) params.set("entity", entity);
    return this.get<Record<string, any>>(`/admin/robot/approval/list?${params}`);
  }

  async getApproval(approvalId: string) {
    return this.get<Record<string, any>>(`/admin/robot/approval/${approvalId}/data`);
  }

  async saveApproval(data: Record<string, any>) {
    return this.post<Record<string, any>>("/admin/robot/approval/save", data);
  }

  async deleteApproval(approvalId: string) {
    return this.post("/admin/robot/approval/delete", { id: approvalId });
  }

  async deleteApproval(approvalId: string) {
    return this.post("/admin/robot/approval/delete", { id: approvalId });
  }

  // ── Transforms ─────────────────────────────────────────────────────
  async listTransforms(sourceEntity?: string) {
    const params = new URLSearchParams();
    if (sourceEntity) params.set("sourceEntity", sourceEntity);
    return this.get<Record<string, any>>(`/admin/robot/transforms?${params}`);
  }

  async getTransform(transformId: string) {
    return this.get<Record<string, any>>(`/admin/robot/transform/${transformId}`);
  }

  async saveTransform(data: Record<string, any>) {
    return this.post<Record<string, any>>("/admin/robot/transform/save", data);
  }

  async deleteTransform(transformId: string) {
    return this.post("/admin/robot/transform/delete", { id: transformId });
  }

  // ── Projects Admin ─────────────────────────────────────────────────
  async getAdminProject(projectId: string) {
    return this.get<Record<string, any>>(`/admin/project/project/${projectId}`);
  }

  async deleteAdminProject(projectId: string) {
    return this.post("/admin/project/delete", { id: projectId });
  }

  // ── Admin Verify ─────────────────────────────────────────────────
  async adminVerify(password: string) {
    return this.post<{ success: boolean }>("/admin/admin-verify", password);
  }

  // ── RB System Templates ──────────────────────────────────────────
  async loadRbSystems() {
    return this.get<Record<string, any>[]>("/setup/load-index?type=rbsystems");
  }

  async installRbsystem(file: string) {
    return this.post<{ success: boolean; error?: string }>(
      `/setup/install-rbsystem?file=${encodeURIComponent(file)}`
    );
  }
}

export const api = new ApiClient(API_BASE);
export default api;

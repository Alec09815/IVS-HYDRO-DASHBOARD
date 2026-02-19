export type UserRole = "admin" | "executive" | "pm" | "estimator" | "lead_operator" | "shop_staff";

export interface RoleConfig {
  label: string;
  description: string;
  level: number; // Higher = more access
}

export const ROLES: Record<UserRole, RoleConfig> = {
  admin: { label: "Administrator", description: "Full system access", level: 100 },
  executive: { label: "Executive", description: "View all data and reports", level: 90 },
  pm: { label: "Project Manager", description: "Manage projects and operations", level: 80 },
  estimator: { label: "Estimator", description: "Manage bids and estimates", level: 70 },
  lead_operator: { label: "Lead Operator", description: "Field app and shop access", level: 50 },
  shop_staff: { label: "Shop Staff", description: "Shop module access only", level: 30 },
};

export type AppModule =
  | "dashboard"
  | "bids"
  | "jobs"
  | "timesheets"
  | "field_app"
  | "production"
  | "invoicing"
  | "equipment"
  | "reports"
  | "admin";

export const MODULE_ACCESS: Record<AppModule, UserRole[]> = {
  dashboard: ["admin", "executive", "pm", "estimator", "lead_operator", "shop_staff"],
  bids: ["admin", "executive", "pm", "estimator"],
  jobs: ["admin", "executive", "pm", "estimator", "lead_operator"],
  timesheets: ["admin", "executive", "pm", "estimator", "lead_operator", "shop_staff"],
  field_app: ["admin", "executive", "pm", "estimator", "lead_operator"],
  production: ["admin", "executive", "pm", "estimator", "lead_operator"],
  invoicing: ["admin", "executive", "pm", "estimator"],
  equipment: ["admin", "executive", "pm", "estimator", "lead_operator", "shop_staff"],
  reports: ["admin", "executive", "pm", "estimator"],
  admin: ["admin"],
};

export function hasModuleAccess(role: UserRole | null, module: AppModule): boolean {
  if (!role) return false;
  return MODULE_ACCESS[module].includes(role);
}

export function isOfficeRole(role: UserRole | null): boolean {
  if (!role) return false;
  return ["admin", "executive", "pm", "estimator"].includes(role);
}

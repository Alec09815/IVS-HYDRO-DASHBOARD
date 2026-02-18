// ============================================================
// Database types matching Supabase schema
// ============================================================

export type BidStatus = "draft" | "submitted" | "won" | "lost" | "cancelled";
export type JobStatus = "pending" | "mobilizing" | "active" | "on_hold" | "complete" | "closed";
export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected";
export type ChangeOrderStatus = "draft" | "submitted" | "approved" | "rejected" | "invoiced";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";
export type EquipmentStatus = "available" | "deployed" | "maintenance" | "retired";

// Kanban column mapping for bids
export const BID_KANBAN_COLUMNS = {
  draft: { label: "Estimating", color: "#F59E0B" },
  submitted: { label: "Submitted", color: "#3B82F6" },
  won: { label: "Awarded", color: "#10B981" },
  lost: { label: "Lost", color: "#EF4444" },
  cancelled: { label: "No Bid", color: "#6B7280" },
} as const;

export type KanbanColumnId = keyof typeof BID_KANBAN_COLUMNS;

export interface Employee {
  id: string;
  auth_user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string;
  title: string | null;
  hourly_rate: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Bid {
  id: string;
  bid_number: string;
  project_name: string;
  client_name: string;
  client_contact: string | null;
  client_email: string | null;
  client_phone: string | null;
  location: string | null;
  description: string | null;
  status: BidStatus;
  estimated_value: number | null;
  estimated_duration_days: number | null;
  submitted_date: string | null;
  decision_date: string | null;
  awarded_value: number | null;
  estimator_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CostCode {
  id: string;
  code: string;
  description: string;
  category: string;
  unit: string | null;
  unit_rate: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnsiteContact {
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface CrewAssignment {
  employee_id: string;
  role: string;
  name?: string;
}

export interface RentalEquipment {
  description: string;
  vendor: string;
  daily_rate: number | null;
  start_date: string | null;
  end_date: string | null;
}

export interface JobCard {
  id: string;
  job_number: string;
  bid_id: string | null;
  project_name: string;
  client_name: string;
  location: string | null;
  description: string | null;
  status: JobStatus;
  contract_value: number | null;
  start_date: string | null;
  estimated_end_date: string | null;
  actual_end_date: string | null;
  project_manager_id: string | null;
  lead_operator_id: string | null;
  notes: string | null;
  // Extended fields (migration 00002)
  pump_config: string | null;
  surface_type: string | null;
  cut_type: string | null;
  equipment_assigned: string[] | null;
  onsite_contacts: OnsiteContact[] | null;
  location_address: string | null;
  location_city: string | null;
  location_state: string | null;
  location_zip: string | null;
  crew_assigned: CrewAssignment[] | null;
  rental_equipment: RentalEquipment[] | null;
  cost_codes_assigned: string[] | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  project_manager?: Employee;
  lead_operator?: Employee;
  bid?: Bid;
}

export interface Equipment {
  id: string;
  asset_number: string;
  name: string;
  category: string;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  year: number | null;
  status: EquipmentStatus;
  current_job_id: string | null;
  last_service_date: string | null;
  next_service_date: string | null;
  hour_meter_reading: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChangeOrder {
  id: string;
  job_card_id: string;
  co_number: string;
  description: string;
  reason: string | null;
  status: ChangeOrderStatus;
  amount: number;
  submitted_date: string | null;
  approved_date: string | null;
  approved_by: string | null;
  requested_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

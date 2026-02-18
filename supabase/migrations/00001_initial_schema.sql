-- ============================================================
-- IVS Hydrodemolition Operations Dashboard - Initial Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'admin', 'executive', 'pm', 'estimator', 'lead_operator', 'shop_staff'
);

CREATE TYPE bid_status AS ENUM (
  'draft', 'submitted', 'won', 'lost', 'cancelled'
);

CREATE TYPE job_status AS ENUM (
  'pending', 'mobilizing', 'active', 'on_hold', 'complete', 'closed'
);

CREATE TYPE timesheet_status AS ENUM (
  'draft', 'submitted', 'approved', 'rejected'
);

CREATE TYPE change_order_status AS ENUM (
  'draft', 'submitted', 'approved', 'rejected', 'invoiced'
);

CREATE TYPE invoice_status AS ENUM (
  'draft', 'sent', 'paid', 'overdue', 'void'
);

CREATE TYPE equipment_status AS ENUM (
  'available', 'deployed', 'maintenance', 'retired'
);

-- ============================================================
-- EMPLOYEES
-- ============================================================

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'shop_staff',
  title TEXT,
  hourly_rate DECIMAL(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employees_role ON employees(role);
CREATE INDEX idx_employees_auth_user ON employees(auth_user_id);

-- ============================================================
-- COST CODES
-- ============================================================

CREATE TABLE cost_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT,
  unit_rate DECIMAL(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cost_codes_category ON cost_codes(category);

-- ============================================================
-- BIDS
-- ============================================================

CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bid_number TEXT UNIQUE NOT NULL,
  project_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_contact TEXT,
  client_email TEXT,
  client_phone TEXT,
  location TEXT,
  description TEXT,
  status bid_status NOT NULL DEFAULT 'draft',
  estimated_value DECIMAL(12,2),
  estimated_duration_days INTEGER,
  submitted_date DATE,
  decision_date DATE,
  awarded_value DECIMAL(12,2),
  estimator_id UUID REFERENCES employees(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bids_status ON bids(status);
CREATE INDEX idx_bids_estimator ON bids(estimator_id);

-- ============================================================
-- JOB CARDS
-- ============================================================

CREATE TABLE job_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_number TEXT UNIQUE NOT NULL,
  bid_id UUID REFERENCES bids(id),
  project_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  status job_status NOT NULL DEFAULT 'pending',
  contract_value DECIMAL(12,2),
  start_date DATE,
  estimated_end_date DATE,
  actual_end_date DATE,
  project_manager_id UUID REFERENCES employees(id),
  lead_operator_id UUID REFERENCES employees(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_cards_status ON job_cards(status);
CREATE INDEX idx_job_cards_pm ON job_cards(project_manager_id);
CREATE INDEX idx_job_cards_lead ON job_cards(lead_operator_id);

-- ============================================================
-- TIMESHEETS
-- ============================================================

CREATE TABLE timesheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  week_ending DATE NOT NULL,
  status timesheet_status NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES employees(id),
  total_regular_hours DECIMAL(6,2) DEFAULT 0,
  total_overtime_hours DECIMAL(6,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, week_ending)
);

CREATE INDEX idx_timesheets_employee ON timesheets(employee_id);
CREATE INDEX idx_timesheets_status ON timesheets(status);
CREATE INDEX idx_timesheets_week ON timesheets(week_ending);

-- ============================================================
-- TIME ENTRIES
-- ============================================================

CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timesheet_id UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  job_card_id UUID REFERENCES job_cards(id),
  cost_code_id UUID REFERENCES cost_codes(id),
  work_date DATE NOT NULL,
  regular_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  overtime_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_time_entries_timesheet ON time_entries(timesheet_id);
CREATE INDEX idx_time_entries_job ON time_entries(job_card_id);
CREATE INDEX idx_time_entries_date ON time_entries(work_date);

-- ============================================================
-- EQUIPMENT (before calibration_forms due to FK dependency)
-- ============================================================

CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  make TEXT,
  model TEXT,
  serial_number TEXT,
  year INTEGER,
  status equipment_status NOT NULL DEFAULT 'available',
  current_job_id UUID REFERENCES job_cards(id),
  last_service_date DATE,
  next_service_date DATE,
  hour_meter_reading DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_category ON equipment(category);
CREATE INDEX idx_equipment_job ON equipment(current_job_id);

-- ============================================================
-- CALIBRATION FORMS
-- ============================================================

CREATE TABLE calibration_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_card_id UUID NOT NULL REFERENCES job_cards(id),
  form_date DATE NOT NULL,
  operator_id UUID NOT NULL REFERENCES employees(id),
  equipment_id UUID REFERENCES equipment(id),
  pump_pressure_psi INTEGER,
  water_flow_gpm DECIMAL(8,2),
  nozzle_size TEXT,
  nozzle_count INTEGER,
  stand_off_distance TEXT,
  traverse_speed TEXT,
  pass_count INTEGER,
  removal_depth TEXT,
  surface_profile TEXT,
  notes TEXT,
  submitted BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calibration_job ON calibration_forms(job_card_id);
CREATE INDEX idx_calibration_operator ON calibration_forms(operator_id);
CREATE INDEX idx_calibration_date ON calibration_forms(form_date);

-- ============================================================
-- PRODUCTION FORMS
-- ============================================================

CREATE TABLE production_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_card_id UUID NOT NULL REFERENCES job_cards(id),
  form_date DATE NOT NULL,
  operator_id UUID NOT NULL REFERENCES employees(id),
  cost_code_id UUID REFERENCES cost_codes(id),
  area_location TEXT,
  quantity_completed DECIMAL(10,2),
  unit TEXT,
  pump_hours DECIMAL(5,2),
  downtime_hours DECIMAL(5,2),
  downtime_reason TEXT,
  water_usage_gallons DECIMAL(10,2),
  concrete_removed_cuft DECIMAL(10,2),
  notes TEXT,
  photos TEXT[], -- Array of storage URLs
  submitted BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_production_job ON production_forms(job_card_id);
CREATE INDEX idx_production_operator ON production_forms(operator_id);
CREATE INDEX idx_production_date ON production_forms(form_date);

-- ============================================================
-- CHANGE ORDERS
-- ============================================================

CREATE TABLE change_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_card_id UUID NOT NULL REFERENCES job_cards(id),
  co_number TEXT NOT NULL,
  description TEXT NOT NULL,
  reason TEXT,
  status change_order_status NOT NULL DEFAULT 'draft',
  amount DECIMAL(12,2) NOT NULL,
  submitted_date DATE,
  approved_date DATE,
  approved_by TEXT,
  requested_by UUID REFERENCES employees(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_card_id, co_number)
);

CREATE INDEX idx_change_orders_job ON change_orders(job_card_id);
CREATE INDEX idx_change_orders_status ON change_orders(status);

-- ============================================================
-- INVOICES
-- ============================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_card_id UUID NOT NULL REFERENCES job_cards(id),
  invoice_number TEXT UNIQUE NOT NULL,
  description TEXT,
  status invoice_status NOT NULL DEFAULT 'draft',
  amount DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  issued_date DATE,
  due_date DATE,
  paid_date DATE,
  payment_reference TEXT,
  created_by UUID REFERENCES employees(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_job ON invoices(job_card_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- ============================================================
-- WEEKLY REPORTS
-- ============================================================

CREATE TABLE weekly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_card_id UUID NOT NULL REFERENCES job_cards(id),
  week_ending DATE NOT NULL,
  prepared_by UUID NOT NULL REFERENCES employees(id),
  summary TEXT,
  work_completed TEXT,
  planned_next_week TEXT,
  safety_incidents INTEGER DEFAULT 0,
  safety_notes TEXT,
  weather_delays_hours DECIMAL(5,2) DEFAULT 0,
  total_production_qty DECIMAL(10,2),
  production_unit TEXT,
  crew_count INTEGER,
  issues TEXT,
  photos TEXT[], -- Array of storage URLs
  submitted BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_card_id, week_ending)
);

CREATE INDEX idx_weekly_reports_job ON weekly_reports(job_card_id);
CREATE INDEX idx_weekly_reports_week ON weekly_reports(week_ending);

-- ============================================================
-- MAN-UP REPORTS (Daily Crew / Equipment Reports)
-- ============================================================

CREATE TABLE man_up_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_card_id UUID NOT NULL REFERENCES job_cards(id),
  report_date DATE NOT NULL,
  prepared_by UUID NOT NULL REFERENCES employees(id),
  crew_members JSONB NOT NULL DEFAULT '[]',
  equipment_on_site JSONB NOT NULL DEFAULT '[]',
  weather_conditions TEXT,
  temperature_f INTEGER,
  start_time TIME,
  end_time TIME,
  safety_topic TEXT,
  visitor_log JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_card_id, report_date)
);

CREATE INDEX idx_man_up_job ON man_up_reports(job_card_id);
CREATE INDEX idx_man_up_date ON man_up_reports(report_date);

-- ============================================================
-- AUTO-UPDATE TIMESTAMPS TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'employees', 'cost_codes', 'bids', 'job_cards', 'timesheets',
      'time_entries', 'calibration_forms', 'equipment', 'production_forms',
      'change_orders', 'invoices', 'weekly_reports', 'man_up_reports'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE man_up_reports ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM employees WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user has office-level access
CREATE OR REPLACE FUNCTION is_office_role()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('admin', 'executive', 'pm', 'estimator');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS POLICIES: employees
-- ============================================================

CREATE POLICY "employees_select" ON employees FOR SELECT
  USING (true); -- All authenticated users can see employee directory

CREATE POLICY "employees_insert" ON employees FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "employees_update" ON employees FOR UPDATE
  USING (get_user_role() = 'admin' OR auth_user_id = auth.uid());

CREATE POLICY "employees_delete" ON employees FOR DELETE
  USING (get_user_role() = 'admin');

-- ============================================================
-- RLS POLICIES: cost_codes
-- ============================================================

CREATE POLICY "cost_codes_select" ON cost_codes FOR SELECT
  USING (true); -- All authenticated users can view cost codes

CREATE POLICY "cost_codes_modify" ON cost_codes FOR ALL
  USING (get_user_role() IN ('admin', 'pm'));

-- ============================================================
-- RLS POLICIES: bids
-- ============================================================

CREATE POLICY "bids_select" ON bids FOR SELECT
  USING (is_office_role());

CREATE POLICY "bids_insert" ON bids FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'pm', 'estimator'));

CREATE POLICY "bids_update" ON bids FOR UPDATE
  USING (get_user_role() IN ('admin', 'pm', 'estimator'));

CREATE POLICY "bids_delete" ON bids FOR DELETE
  USING (get_user_role() = 'admin');

-- ============================================================
-- RLS POLICIES: job_cards
-- ============================================================

CREATE POLICY "job_cards_select" ON job_cards FOR SELECT
  USING (
    is_office_role()
    OR lead_operator_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "job_cards_insert" ON job_cards FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'pm'));

CREATE POLICY "job_cards_update" ON job_cards FOR UPDATE
  USING (get_user_role() IN ('admin', 'pm'));

CREATE POLICY "job_cards_delete" ON job_cards FOR DELETE
  USING (get_user_role() = 'admin');

-- ============================================================
-- RLS POLICIES: timesheets
-- ============================================================

CREATE POLICY "timesheets_select" ON timesheets FOR SELECT
  USING (
    is_office_role()
    OR employee_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "timesheets_insert" ON timesheets FOR INSERT
  WITH CHECK (
    employee_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid())
    OR get_user_role() IN ('admin', 'pm')
  );

CREATE POLICY "timesheets_update" ON timesheets FOR UPDATE
  USING (
    employee_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid())
    OR get_user_role() IN ('admin', 'pm')
  );

-- ============================================================
-- RLS POLICIES: time_entries
-- ============================================================

CREATE POLICY "time_entries_select" ON time_entries FOR SELECT
  USING (
    is_office_role()
    OR timesheet_id IN (
      SELECT t.id FROM timesheets t
      JOIN employees e ON e.id = t.employee_id
      WHERE e.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "time_entries_modify" ON time_entries FOR ALL
  USING (
    timesheet_id IN (
      SELECT t.id FROM timesheets t
      JOIN employees e ON e.id = t.employee_id
      WHERE e.auth_user_id = auth.uid()
    )
    OR get_user_role() IN ('admin', 'pm')
  );

-- ============================================================
-- RLS POLICIES: calibration_forms
-- ============================================================

CREATE POLICY "calibration_select" ON calibration_forms FOR SELECT
  USING (
    is_office_role()
    OR operator_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "calibration_insert" ON calibration_forms FOR INSERT
  WITH CHECK (
    get_user_role() IN ('admin', 'pm', 'lead_operator')
  );

CREATE POLICY "calibration_update" ON calibration_forms FOR UPDATE
  USING (
    get_user_role() IN ('admin', 'pm')
    OR (operator_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid()) AND NOT submitted)
  );

-- ============================================================
-- RLS POLICIES: equipment
-- ============================================================

CREATE POLICY "equipment_select" ON equipment FOR SELECT
  USING (true); -- All authenticated users can view equipment

CREATE POLICY "equipment_modify" ON equipment FOR ALL
  USING (get_user_role() IN ('admin', 'pm', 'shop_staff'));

-- ============================================================
-- RLS POLICIES: production_forms
-- ============================================================

CREATE POLICY "production_select" ON production_forms FOR SELECT
  USING (
    is_office_role()
    OR operator_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "production_insert" ON production_forms FOR INSERT
  WITH CHECK (
    get_user_role() IN ('admin', 'pm', 'lead_operator')
  );

CREATE POLICY "production_update" ON production_forms FOR UPDATE
  USING (
    get_user_role() IN ('admin', 'pm')
    OR (operator_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid()) AND NOT submitted)
  );

-- ============================================================
-- RLS POLICIES: change_orders
-- ============================================================

CREATE POLICY "change_orders_select" ON change_orders FOR SELECT
  USING (is_office_role());

CREATE POLICY "change_orders_modify" ON change_orders FOR ALL
  USING (get_user_role() IN ('admin', 'pm'));

-- ============================================================
-- RLS POLICIES: invoices
-- ============================================================

CREATE POLICY "invoices_select" ON invoices FOR SELECT
  USING (is_office_role());

CREATE POLICY "invoices_modify" ON invoices FOR ALL
  USING (get_user_role() IN ('admin', 'pm'));

-- ============================================================
-- RLS POLICIES: weekly_reports
-- ============================================================

CREATE POLICY "weekly_reports_select" ON weekly_reports FOR SELECT
  USING (
    is_office_role()
    OR prepared_by = (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "weekly_reports_insert" ON weekly_reports FOR INSERT
  WITH CHECK (
    get_user_role() IN ('admin', 'pm', 'lead_operator')
  );

CREATE POLICY "weekly_reports_update" ON weekly_reports FOR UPDATE
  USING (
    get_user_role() IN ('admin', 'pm')
    OR (prepared_by = (SELECT id FROM employees WHERE auth_user_id = auth.uid()) AND NOT submitted)
  );

-- ============================================================
-- RLS POLICIES: man_up_reports
-- ============================================================

CREATE POLICY "man_up_reports_select" ON man_up_reports FOR SELECT
  USING (
    is_office_role()
    OR prepared_by = (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "man_up_reports_insert" ON man_up_reports FOR INSERT
  WITH CHECK (
    get_user_role() IN ('admin', 'pm', 'lead_operator')
  );

CREATE POLICY "man_up_reports_update" ON man_up_reports FOR UPDATE
  USING (
    get_user_role() IN ('admin', 'pm')
    OR prepared_by = (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  );

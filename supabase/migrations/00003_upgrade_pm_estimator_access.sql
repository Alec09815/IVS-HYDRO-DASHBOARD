-- ============================================================
-- Migration: Upgrade pm & estimator to full access
-- pm and estimator now have the same data access as admin/executive
-- (except admin-only operations like employee management)
-- ============================================================

-- ============================================================
-- cost_codes: add estimator to modify
-- ============================================================
DROP POLICY "cost_codes_modify" ON cost_codes;
CREATE POLICY "cost_codes_modify" ON cost_codes FOR ALL
  USING (get_user_role() IN ('admin', 'pm', 'estimator'));

-- ============================================================
-- job_cards: add estimator to insert/update
-- ============================================================
DROP POLICY "job_cards_insert" ON job_cards;
CREATE POLICY "job_cards_insert" ON job_cards FOR INSERT
  WITH CHECK (get_user_role() IN ('admin', 'pm', 'estimator'));

DROP POLICY "job_cards_update" ON job_cards;
CREATE POLICY "job_cards_update" ON job_cards FOR UPDATE
  USING (get_user_role() IN ('admin', 'pm', 'estimator'));

-- ============================================================
-- timesheets: add estimator to insert/update
-- ============================================================
DROP POLICY "timesheets_insert" ON timesheets;
CREATE POLICY "timesheets_insert" ON timesheets FOR INSERT
  WITH CHECK (
    employee_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid())
    OR get_user_role() IN ('admin', 'pm', 'estimator')
  );

DROP POLICY "timesheets_update" ON timesheets;
CREATE POLICY "timesheets_update" ON timesheets FOR UPDATE
  USING (
    employee_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid())
    OR get_user_role() IN ('admin', 'pm', 'estimator')
  );

-- ============================================================
-- time_entries: add estimator to modify
-- ============================================================
DROP POLICY "time_entries_modify" ON time_entries;
CREATE POLICY "time_entries_modify" ON time_entries FOR ALL
  USING (
    timesheet_id IN (
      SELECT t.id FROM timesheets t
      JOIN employees e ON e.id = t.employee_id
      WHERE e.auth_user_id = auth.uid()
    )
    OR get_user_role() IN ('admin', 'pm', 'estimator')
  );

-- ============================================================
-- calibration_forms: add estimator to insert/update
-- ============================================================
DROP POLICY "calibration_insert" ON calibration_forms;
CREATE POLICY "calibration_insert" ON calibration_forms FOR INSERT
  WITH CHECK (
    get_user_role() IN ('admin', 'pm', 'estimator', 'lead_operator')
  );

DROP POLICY "calibration_update" ON calibration_forms;
CREATE POLICY "calibration_update" ON calibration_forms FOR UPDATE
  USING (
    get_user_role() IN ('admin', 'pm', 'estimator')
    OR (operator_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid()) AND NOT submitted)
  );

-- ============================================================
-- equipment: add estimator to modify
-- ============================================================
DROP POLICY "equipment_modify" ON equipment;
CREATE POLICY "equipment_modify" ON equipment FOR ALL
  USING (get_user_role() IN ('admin', 'pm', 'estimator', 'shop_staff'));

-- ============================================================
-- production_forms: add estimator to insert/update
-- ============================================================
DROP POLICY "production_insert" ON production_forms;
CREATE POLICY "production_insert" ON production_forms FOR INSERT
  WITH CHECK (
    get_user_role() IN ('admin', 'pm', 'estimator', 'lead_operator')
  );

DROP POLICY "production_update" ON production_forms;
CREATE POLICY "production_update" ON production_forms FOR UPDATE
  USING (
    get_user_role() IN ('admin', 'pm', 'estimator')
    OR (operator_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid()) AND NOT submitted)
  );

-- ============================================================
-- change_orders: add estimator to modify
-- ============================================================
DROP POLICY "change_orders_modify" ON change_orders;
CREATE POLICY "change_orders_modify" ON change_orders FOR ALL
  USING (get_user_role() IN ('admin', 'pm', 'estimator'));

-- ============================================================
-- invoices: add estimator to modify
-- ============================================================
DROP POLICY "invoices_modify" ON invoices;
CREATE POLICY "invoices_modify" ON invoices FOR ALL
  USING (get_user_role() IN ('admin', 'pm', 'estimator'));

-- ============================================================
-- weekly_reports: add estimator to insert/update
-- ============================================================
DROP POLICY "weekly_reports_insert" ON weekly_reports;
CREATE POLICY "weekly_reports_insert" ON weekly_reports FOR INSERT
  WITH CHECK (
    get_user_role() IN ('admin', 'pm', 'estimator', 'lead_operator')
  );

DROP POLICY "weekly_reports_update" ON weekly_reports;
CREATE POLICY "weekly_reports_update" ON weekly_reports FOR UPDATE
  USING (
    get_user_role() IN ('admin', 'pm', 'estimator')
    OR (prepared_by = (SELECT id FROM employees WHERE auth_user_id = auth.uid()) AND NOT submitted)
  );

-- ============================================================
-- man_up_reports: add estimator to insert/update
-- ============================================================
DROP POLICY "man_up_reports_insert" ON man_up_reports;
CREATE POLICY "man_up_reports_insert" ON man_up_reports FOR INSERT
  WITH CHECK (
    get_user_role() IN ('admin', 'pm', 'estimator', 'lead_operator')
  );

DROP POLICY "man_up_reports_update" ON man_up_reports;
CREATE POLICY "man_up_reports_update" ON man_up_reports FOR UPDATE
  USING (
    get_user_role() IN ('admin', 'pm', 'estimator')
    OR prepared_by = (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  );

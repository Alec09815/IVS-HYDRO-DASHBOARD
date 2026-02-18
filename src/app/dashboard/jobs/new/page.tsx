"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { JobCardForm, type JobFormData } from "../components/job-card-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewJobPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (data: JobFormData) => {
    setLoading(true);
    const { error } = await supabase.from("job_cards").insert({
      job_number: data.job_number,
      project_name: data.project_name,
      client_name: data.client_name,
      description: data.description,
      contract_value: data.contract_value,
      start_date: data.start_date || null,
      estimated_end_date: data.estimated_end_date || null,
      project_manager_id: data.project_manager_id || null,
      lead_operator_id: data.lead_operator_id || null,
      pump_config: data.pump_config,
      surface_type: data.surface_type || null,
      cut_type: data.cut_type || null,
      equipment_assigned: data.equipment_assigned,
      cost_codes_assigned: data.cost_codes_assigned,
      onsite_contacts: data.onsite_contacts,
      location: [data.location_city, data.location_state].filter(Boolean).join(", "),
      location_address: data.location_address || null,
      location_city: data.location_city || null,
      location_state: data.location_state || null,
      location_zip: data.location_zip || null,
      crew_assigned: data.crew_assigned,
      rental_equipment: data.rental_equipment,
      notes: data.notes || null,
      status: "pending",
    });

    setLoading(false);
    if (!error) {
      router.push("/dashboard/jobs");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/jobs"
          className="p-2 text-ivs-text-muted hover:text-ivs-text hover:bg-ivs-bg-card rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-ivs-text">New Job Card</h1>
          <p className="text-sm text-ivs-text-muted">Configure and create a new job</p>
        </div>
      </div>

      <JobCardForm onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}

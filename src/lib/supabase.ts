import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Department ──────────────────────────────────────────────
export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  image_url: string;
  is_active: boolean;
  created_at: string;
}

// ─── Profile (linked to auth.users) ─────────────────────────
export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'admin' | 'coordinator' | 'participant';
  created_at: string;
  updated_at: string;
}

// ─── Event ───────────────────────────────────────────────────
export interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string;
  category: string;
  image_url: string;
  max_attendees: number | null;
  current_attendees: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  allow_single: boolean;
  allow_double: boolean;
  allow_triple: boolean;
  allow_quad: boolean;
  allow_group: boolean;
  max_team_size: number;
  department_id: string | null;
  registration_fee: number;
  qr_code_url: string;
  upi_id: string;
  payment_instructions: string;
  created_at: string;
  updated_at: string;
  // Joined
  departments?: Department;
}

// ─── Registration ────────────────────────────────────────────
export interface Registration {
  id: string;
  event_id: string;
  registration_id: string;
  name: string;
  email: string;
  phone: string;
  college_id: string;
  payment_id: string;
  email_verified: boolean;
  phone_verified: boolean;
  registration_type: 'solo' | 'duo' | 'trio' | 'quad' | 'group';
  team_members: string[];
  team_name: string;
  payment_screenshot_url: string;
  transaction_reference: string;
  rejection_reason: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  registered_at: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'attended' | 'rejected';
  // Joined
  events?: Event;
  registration_members?: RegistrationMember[];
}

// ─── Registration Member ─────────────────────────────────────
export interface RegistrationMember {
  id: string;
  registration_id: string;
  member_name: string;
  email: string;
  phone: string;
  college_id: string;
  member_order: number;
  created_at: string;
}

// ─── Coordinator Assignment ──────────────────────────────────
export interface CoordinatorAssignment {
  id: string;
  coordinator_id: string;
  event_id: string;
  created_at: string;
  profiles?: Profile;
  events?: Event;
}

// ─── IST Member ──────────────────────────────────────────────
export interface ISTMember {
  id: string;
  enrollment_number: string;
  student_name: string;
  added_at: string;
}

// ─── Audit Log ───────────────────────────────────────────────
export interface AuditLog {
  id: string;
  registration_id: string | null;
  action: string;
  performed_by: string | null;
  reason: string;
  metadata: Record<string, unknown>;
  created_at: string;
  profiles?: Profile;
}

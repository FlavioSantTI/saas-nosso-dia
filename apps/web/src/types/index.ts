export type MemberRole = 'ADMIN' | 'MEMBER' | 'CHILD';
export type EventStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface Family {
  id: string;
  name: string;
  timezone: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id?: string | null;
  name: string;
  nickname?: string | null;
  role: MemberRole;
  color: string;
  birth_date?: string | null;
}

export interface Location {
  id: string;
  family_id: string;
  name: string;
  address?: string | null;
}

export interface Routine {
  id: string;
  family_id: string;
  title: string;
  days_of_week: number[];
  start_time: string;
  duration_minutes: number;
  location_id?: string | null;
  default_responsible_id?: string | null;
  is_active: boolean;
  end_date?: string | null;
}

export interface EventItem {
  id: string;
  family_id: string;
  routine_id?: string | null;
  title: string;
  start_time: string; // ISO UTC
  end_time: string; // ISO UTC
  is_all_day: boolean;
  location_id?: string | null;
  responsible_id?: string | null;
  status: EventStatus;
  notes?: string | null;
  reminder_minutes?: number | null; // 0, 5, 10, 15, 30 ou null
  
  // Relations
  participants?: FamilyMember[];
  location?: Location | null;
  responsible?: FamilyMember | null;
}

export interface WeekDayColumn {
  date: Date;
  label: string; // 'Segunda', 'Terça'...
  formattedDate: string; // '07/10'
  events: EventItem[];
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  billing_interval: 'MONTHLY' | 'YEARLY';
  max_members: number;
  has_ai_access: boolean;
  features: string[];
  is_active: boolean;
}

export interface Subscription {
  id: string;
  family_id: string;
  plan_id: string;
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  current_period_end: string;
  asaas_customer_id?: string | null;
  asaas_subscription_id?: string | null;
  plan?: Plan;
}

export interface TenantBillingInfo {
  family_id: string;
  family_name: string;
  owner_email: string;
  plan_name: string;
  status: string;
  created_at: string;
  current_period_end: string;
}

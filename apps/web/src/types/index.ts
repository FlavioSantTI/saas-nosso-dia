export type MemberRole = 'ADMIN' | 'MEMBER' | 'CHILD';
export type EventStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';

export interface Family {
  id: string;
  name: string;
  timezone: string;
  plan_name?: string;
  plan_badge?: string;
  plan_status?: SubscriptionStatus;
  plan_expires_at?: string;
  plan_days_remaining?: number;
  ai_credits_limit?: number;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id?: string | null;
  name: string;
  nickname?: string | null;
  avatar?: string | null;
  email?: string | null;
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
  monthly_ai_credits?: number;
  allowed_ai_modalities?: string[];
}

export interface Subscription {
  id: string;
  family_id: string;
  plan_id: string;
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  current_period_end: string;
  asaas_customer_id?: string | null;
  asaas_subscription_id?: string | null;
  ai_credits_used?: number;
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
  ai_credits_used?: number;
}

export interface PlatformSettings {
  id: string;
  ai_cost_text: number;
  ai_cost_audio: number;
  ai_cost_image: number;
  ai_cost_pdf: number;
  ai_enabled: boolean;
  updated_at: string;
}

export interface AdminUserListItem {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_active: boolean;
  is_super_admin: boolean;
  family_name: string;
}

export interface DailyBriefingParticipant {
  id: string;
  name: string;
  color: string;
  avatar?: string | null;
  role?: MemberRole;
}

export interface DailyBriefingItem {
  event_id: string;
  title: string;
  start_time: string;
  end_time: string;
  start_time_local: string;
  end_time_local: string;
  is_all_day: boolean;
  status: EventStatus;
  location_name: string | null;
  location_address: string | null;
  responsible_id: string | null;
  responsible_name: string | null;
  responsible_color: string | null;
  responsible_avatar?: string | null;
  participants: DailyBriefingParticipant[];
  has_conflict: boolean;
}

export type BoardItemType = 'EXAM' | 'ASSIGNMENT' | 'SUPPLY' | 'PERMISSION' | 'NOTE';
export type BoardItemStatus = 'OPEN' | 'DONE' | 'ARCHIVED';

export interface BoardChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface BoardItemDetails {
  subject?: string;
  grade_composition?: string;
  study_tips?: string;
  delivery_format?: string;
  estimated_cost?: string;
  store_or_link?: string;
  event_location?: string;
}

export interface FamilyBoardItem {
  id: string;
  family_id: string;
  type: BoardItemType;
  title: string;
  notes?: string | null;
  due_date?: string | null; // YYYY-MM-DD
  related_member_id?: string | null;
  assigned_to_id?: string | null;
  details: BoardItemDetails;
  checklist: BoardChecklistItem[];
  status: BoardItemStatus;
  is_pinned: boolean;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  attachment_extracted_text?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
  completed_at?: string | null;

  // Virtual relations populated in client
  related_member?: FamilyMember | null;
  assigned_to?: FamilyMember | null;
}


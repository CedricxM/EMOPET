export type FeatureStatus = 'planned' | 'building' | 'beta' | 'shipped';
export type FeatureStepState = 'done' | 'todo' | 'blocked';
export type FeatureCtaType =
  | 'open'
  | 'learn_more'
  | 'join_waitlist'
  | 'consent'
  | 'view_progress'
  | 'accept_rules';

export type ConsentPurpose =
  | 'community_opt_in'
  | 'community_rules'
  | 'location_nearby_temp'
  | 'directory_contact'
  | 'vet_report_share';

export type ConsentStatus = 'accepted' | 'declined' | 'revoked';

export interface FeatureProgressStep {
  key: string;
  label: string;
  state: FeatureStepState;
}

export interface FeatureProgressCta {
  type: FeatureCtaType;
  label: string;
  route?: string;
  purpose?: ConsentPurpose;
  context?: string;
}

export interface FeatureProgressCard {
  serviceId: string;
  title: string;
  summary: string;
  status: FeatureStatus;
  locked: boolean;
  lockedReason?: string;
  whyLocked?: string;
  progress: {
    pct: number;
    steps: FeatureProgressStep[];
  };
  cta: FeatureProgressCta[];
  tags?: string[];
}

export interface FeatureProgressResponse {
  userId: string;
  generatedAt: string;
  services: FeatureProgressCard[];
}

export interface ConsentRecord {
  userId: string;
  purpose: ConsentPurpose;
  status: ConsentStatus;
  timestamp: string;
  context?: string;
}

export interface ConsentCreateInput {
  purpose: ConsentPurpose;
  status?: ConsentStatus;
  context?: string;
}

export interface WaitlistJoinInput {
  serviceId: string;
  channel?: 'in_app' | 'email';
}

export type UgcReportReason =
  | 'spam'
  | 'harassment'
  | 'illegal'
  | 'unsafe'
  | 'other';

export interface UgcReportCreateInput {
  contentId: string;
  reason: UgcReportReason;
  details?: string;
}

export interface UserBlockCreateInput {
  targetUserId: string;
  reason?: string;
}

export interface CommunityRulesAcceptInput {
  accepted: boolean;
}

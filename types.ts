export type AdminRole = 'Super Admin' | 'Company Admin' | 'Editor' | 'Moderator';
export type PublicationStatus = 'draft' | 'published' | 'scheduled' | 'archived';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type RecordStatus = 'active' | 'inactive' | 'expired';

export interface UserRecord {
  id: string;
  companyId?: string;
  name: string;
  email: string;
  role: AdminRole;
  status: 'active' | 'inactive' | 'invited' | 'locked';
  mfaEnabled?: boolean;
  lastLoginAt?: string;
}

export interface CompanyRecord {
  id: string;
  name: string;
  category: string;
  description?: string;
  logo?: string;
  cover?: string;
  contact: string;
  phone?: string;
  social?: string;
  status: VerificationStatus;
}

export interface MediaRecord {
  id: string;
  companyId?: string;
  title: string;
  type: 'photo' | 'video' | 'document';
  folder: string;
  status: 'active' | 'inactive';
  url: string;
  metadata: string;
}

export interface ContentRecord {
  id: string;
  title: string;
  slug?: string;
  status: PublicationStatus;
  category?: string;
  tags?: string;
  seoTitle?: string;
  seoDescription?: string;
  publishAt?: string;
  content: string;
}

export interface AdvertisementRecord {
  id: string;
  title: string;
  status: 'active' | 'inactive';
  banner: string;
  startDate: string;
  endDate: string;
  analytics: string;
}

export interface JobRecord {
  id: string;
  title: string;
  status: 'active' | 'expired' | 'draft';
  expiryDate: string;
  department: string;
  applications: number;
  description: string;
}

export interface ActivityLogRecord {
  id: string;
  action: string;
  actor: string;
  type: string;
  createdAt: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export interface AdminDatabase {
  users: UserRecord[];
  companies: CompanyRecord[];
  media: MediaRecord[];
  news: ContentRecord[];
  blogs: ContentRecord[];
  ads: AdvertisementRecord[];
  jobs: JobRecord[];
  activity: ActivityLogRecord[];
}

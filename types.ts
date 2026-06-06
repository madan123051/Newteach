export type AdminRole = 'Super Admin' | 'Company Admin' | 'Editor';
export type PublicationStatus = 'draft' | 'published' | 'scheduled' | 'archived';
export type CompanyStatus = 'pending' | 'verified' | 'rejected';
export type MediaType = 'image' | 'video' | 'file';
export type JobStatus = 'draft' | 'active' | 'closed' | 'expired';
export type AdStatus = 'draft' | 'active' | 'paused' | 'expired';

export interface AuditFields {
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  companyId?: string | null;
}

export interface UserRecord extends AuditFields {
  id: string;
  uid?: string;
  name: string;
  email: string;
  role: AdminRole;
  status: 'active' | 'inactive' | 'invited' | 'locked';
}

export interface CompanyRecord extends AuditFields {
  id: string;
  name: string;
  category?: string;
  tagline?: string;
  description?: string;
  logoUrl?: string;
  coverUrl?: string;
  galleryUrls?: string[];
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  status: CompanyStatus;
}

export interface MediaRecord extends AuditFields {
  id: string;
  title: string;
  altText?: string;
  type: MediaType;
  status: 'active' | 'inactive';
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  thumbnailPath?: string;
  url: string;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown> | string;
}

export interface NewsRecord extends AuditFields {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  status: PublicationStatus;
  publishAt?: string;
  imageUrl?: string;
  videoUrl?: string;
}

export interface BlogRecord extends NewsRecord {
  category?: string;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
}

export interface JobRecord extends AuditFields {
  id: string;
  title: string;
  department?: string;
  location?: string;
  description: string;
  status: JobStatus;
  expiryDate?: string;
  applicationCount?: number;
  applications?: string;
}

export interface AdvertisementRecord extends AuditFields {
  id: string;
  title: string;
  destinationUrl?: string;
  bannerUrl?: string;
  videoUrl?: string;
  status: AdStatus;
  startAt?: string;
  endAt?: string;
  placement?: string;
}

export interface ActivityLogRecord {
  id: string;
  action: 'Create' | 'Edit' | 'Delete' | 'Login' | 'Logout' | 'Media Upload' | string;
  entityType: 'users' | 'companies' | 'media' | 'news' | 'blogs' | 'jobs' | 'ads' | 'auth' | string;
  entityId?: string;
  actorUserId?: string;
  actorName?: string;
  actorRole?: AdminRole | string;
  companyId?: string | null;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface AdminDatabase {
  users: UserRecord[];
  companies: CompanyRecord[];
  media: MediaRecord[];
  news: NewsRecord[];
  blogs: BlogRecord[];
  jobs: JobRecord[];
  ads: AdvertisementRecord[];
  activityLogs: ActivityLogRecord[];
}

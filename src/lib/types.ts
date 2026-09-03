export interface Property {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  price: number;
  discount_price: number | null;
  currency: string;
  listing_type: string;
  property_type: string;
  structure: string;
  listing_purpose: string;
  status: string;
  county: string | null;
  town: string | null;
  neighborhood: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number;
  bathrooms: number;
  garage: number;
  area_sqft: number | null;
  plot_size: string | null;
  developer: string | null;
  construction_status: string | null;
  completion_date: string | null;
  payment_plan: string | null;
  amenities: string[];
  nearby_schools: string[];
  nearby_hospitals: string[];
  nearby_shopping: string[];
  images: string[];
  featured_image: string | null;
  youtube_url: string | null;
  virtual_tour_url: string | null;
  brochure_url: string | null;
  floor_plan_url: string | null;
  is_featured: boolean;
  is_published: boolean;
  is_archived: boolean;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface PublicUnit {
  id: string;
  property_id: string;
  label: string;
  unit_type: string | null;
  block: string | null;
  floor: string | null;
  bedrooms: number;
  bathrooms: number;
  toilets: number;
  size_sqm: number | null;
  monthly_rent: number;
  sale_price: number | null;
  deposit: number;
  service_charge: number;
  furnished: boolean;
  parking_spaces: number;
  amenities: string[];
  description: string | null;
  status: string;
  is_featured: boolean;
  sort_order: number;
  cover_image: string | null;
  images: string[];
}

export interface UnitSummary {
  unit_count: number;
  available_units: number;
  min_rent: number | null;
  min_sale_price: number | null;
  min_bedrooms: number | null;
  max_bedrooms: number | null;
}

export type PropertyListing = Property & { unit_summary: UnitSummary | null };

export interface Agent {
  id: string;
  name: string;
  title: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  photo_url: string | null;
  bio: string | null;
  is_published: boolean;
  sort_order: number;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string | null;
  message: string;
  rating: number;
  photo_url: string | null;
  is_approved: boolean;
  created_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image: string | null;
  category: string | null;
  author: string | null;
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  published_at: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: string;
  property_id: string | null;
  status: string;
  created_at: string;
}

export interface HomeContent {
  heroHeading: string;
  heroSubheading: string;
  heroImage: string;
  primaryCta: string;
  secondaryCta: string;
  stats: { label: string; value: string }[];
  whyChooseUs: { title: string; body: string }[];
  partners: string[];
}

export interface CompanyContent {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  hours: string;
  mapEmbed: string;
}

export interface AboutContent {
  mission: string;
  vision: string;
  story: string;
  values: { title: string; body: string }[];
  timeline: { year: string; event: string }[];
  awards: string[];
}

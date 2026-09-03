
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','editor');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PROPERTIES
CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_description text,
  description text,
  price numeric NOT NULL DEFAULT 0,
  discount_price numeric,
  currency text NOT NULL DEFAULT 'KES',
  listing_type text NOT NULL DEFAULT 'sale',
  property_type text NOT NULL DEFAULT 'Apartment',
  status text NOT NULL DEFAULT 'available',
  county text,
  town text,
  neighborhood text,
  address text,
  latitude numeric,
  longitude numeric,
  bedrooms int NOT NULL DEFAULT 0,
  bathrooms int NOT NULL DEFAULT 0,
  garage int NOT NULL DEFAULT 0,
  area_sqft int,
  plot_size text,
  developer text,
  construction_status text,
  completion_date text,
  payment_plan text,
  amenities text[] NOT NULL DEFAULT '{}',
  nearby_schools text[] NOT NULL DEFAULT '{}',
  nearby_hospitals text[] NOT NULL DEFAULT '{}',
  nearby_shopping text[] NOT NULL DEFAULT '{}',
  images text[] NOT NULL DEFAULT '{}',
  featured_image text,
  youtube_url text,
  virtual_tour_url text,
  brochure_url text,
  floor_plan_url text,
  is_featured boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  is_archived boolean NOT NULL DEFAULT false,
  views int NOT NULL DEFAULT 0,
  agent_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.properties TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published properties" ON public.properties FOR SELECT TO anon, authenticated USING (is_published = true AND is_archived = false);
CREATE POLICY "staff read all properties" ON public.properties FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff manage properties" ON public.properties FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER properties_updated BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AGENTS
CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text,
  phone text,
  whatsapp text,
  email text,
  photo_url text,
  bio text,
  is_published boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agents TO authenticated;
GRANT ALL ON public.agents TO service_role;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read agents" ON public.agents FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "staff manage agents" ON public.agents FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER agents_updated BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TESTIMONIALS
CREATE TABLE public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text,
  message text NOT NULL,
  rating int NOT NULL DEFAULT 5,
  photo_url text,
  is_approved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.testimonials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read testimonials" ON public.testimonials FOR SELECT TO anon, authenticated USING (is_approved = true);
CREATE POLICY "staff manage testimonials" ON public.testimonials FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- BLOG
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text,
  cover_image text,
  category text,
  author text,
  meta_title text,
  meta_description text,
  is_published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read posts" ON public.blog_posts FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "staff read all posts" ON public.blog_posts FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff manage posts" ON public.blog_posts FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER posts_updated BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- LEADS
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  message text,
  source text NOT NULL DEFAULT 'contact',
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can submit lead" ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "staff read leads" ON public.leads FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff update leads" ON public.leads FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff delete leads" ON public.leads FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.newsletter_subscribers TO anon;
GRANT SELECT, INSERT, DELETE ON public.newsletter_subscribers TO authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone subscribe" ON public.newsletter_subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "staff read subs" ON public.newsletter_subscribers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff delete subs" ON public.newsletter_subscribers FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- SITE CONTENT
CREATE TABLE public.site_content (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read content" ON public.site_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff manage content" ON public.site_content FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER content_updated BEFORE UPDATE ON public.site_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SEED
INSERT INTO public.agents (name, title, phone, whatsapp, email, photo_url, bio, sort_order) VALUES
('Amina Wanjiru','Head of Sales','+254712345678','254712345678','amina@ultrahomes.co.ke','/images/agent-1.jpg','Twelve years guiding families and investors through Nairobi''s prime residential market.',1),
('David Otieno','Senior Property Consultant','+254712345679','254712345679','david@ultrahomes.co.ke','/images/agent-2.jpg','Specialist in gated communities, off-plan developments and land banking across Kiambu and Machakos.',2),
('Grace Njeri','Lettings Manager','+254712345680','254712345680','grace@ultrahomes.co.ke','/images/agent-3.jpg','Manages a portfolio of over 300 executive rentals in Westlands, Kilimani and Lavington.',3);

INSERT INTO public.properties (title, slug, short_description, description, price, listing_type, property_type, status, county, town, neighborhood, address, latitude, longitude, bedrooms, bathrooms, garage, area_sqft, plot_size, developer, construction_status, completion_date, payment_plan, amenities, nearby_schools, nearby_hospitals, nearby_shopping, images, featured_image, youtube_url, is_featured) VALUES
('The Arbor Residences, Riverside','arbor-residences-riverside','Four bedroom sky villas overlooking the Nairobi River valley.','A landmark address on Riverside Drive. The Arbor Residences pairs full-floor layouts with double-volume living rooms, chef kitchens and private lift lobbies. Residents enjoy a heated rooftop pool, spa and 24 hour concierge.',48500000,'sale','Apartment','available','Nairobi','Nairobi','Riverside','Riverside Drive, Nairobi',-1.2705,36.8035,4,4,2,3200,'0.9 acres','Ultra Homes Developments','Completed','2025','30% deposit, 24 month balance','{"Swimming Pool","Gym","Parking","Lift","Generator","Borehole","CCTV","Electric Fence","Balcony","Garden"}','{"Braeburn Riverside","Kilimani Junior Academy"}','{"Nairobi West Hospital","MP Shah Hospital"}','{"Westgate Mall","Sarit Centre"}','{"/images/property-1.jpg","/images/property-2.jpg","/images/property-3.jpg"}','/images/property-1.jpg',NULL,true),
('Karen Grove Villas','karen-grove-villas','Five bedroom garden villas on half acre plots in Karen.','Set behind mature indigenous trees, Karen Grove offers only twelve villas. Each home has a double height entrance hall, family lounge, staff quarters and a landscaped garden with a private borehole.',95000000,'sale','Villa','available','Nairobi','Karen','Karen','Bogani East Road, Karen',-1.3390,36.7100,5,6,3,5400,'0.5 acres','Ultra Homes Developments','Completed','2024','Cash or mortgage','{"Swimming Pool","Parking","Generator","Borehole","CCTV","Electric Fence","Garden","Kids Play Area"}','{"Brookhouse School","Hillcrest International"}','{"Karen Hospital","Nairobi Womens Hospital"}','{"The Hub Karen","Galleria Mall"}','{"/images/property-2.jpg","/images/property-4.jpg","/images/property-1.jpg"}','/images/property-2.jpg',NULL,true),
('Lavington Court Penthouse','lavington-court-penthouse','Three bedroom penthouse with a wraparound terrace.','A rare duplex penthouse with 180 degree views over Lavington. Floor to ceiling glazing, imported Italian joinery, a private plunge pool and two secure parking bays.',36000000,'sale','Penthouse','reserved','Nairobi','Nairobi','Lavington','James Gichuru Road, Lavington',-1.2810,36.7690,3,3,2,2450,'0.4 acres','Ultra Homes Developments','Completed','2025','20% deposit, bank financing available','{"Swimming Pool","Gym","Parking","Lift","Generator","CCTV","Balcony"}','{"Rusinga School","Consolata School"}','{"AAR Hospital","MP Shah Hospital"}','{"Lavington Mall","Yaya Centre"}','{"/images/property-3.jpg","/images/property-5.jpg"}','/images/property-3.jpg',NULL,true),
('Runda Ridge Family Home','runda-ridge-family-home','Four bedroom all-ensuite home in a quiet Runda cul-de-sac.','A calm, well proportioned family home with a sunlit living wing, open plan kitchen, study and a self contained guest cottage. Fully walled with an electric fence and a backup generator.',72000000,'sale','House','available','Nairobi','Runda','Runda','Ruaka Road, Runda',-1.2150,36.8080,4,5,2,4100,'0.55 acres','Private Seller','Completed','2022','Cash or mortgage','{"Parking","Generator","Borehole","CCTV","Electric Fence","Garden","Kids Play Area"}','{"Rosslyn Academy","German School Nairobi"}','{"Aga Khan University Hospital"}','{"Village Market","Two Rivers Mall"}','{"/images/property-4.jpg","/images/property-6.jpg"}','/images/property-4.jpg',NULL,true),
('Kilimani Skyline Apartments','kilimani-skyline-apartments','Two bedroom off-plan apartments launching in Kilimani.','Ultra Homes'' newest off-plan release. Efficient two bedroom layouts with fitted kitchens, a rooftop gym, co-working lounge and secure basement parking. Flexible payment plan over 30 months.',12900000,'sale','Apartment','new','Nairobi','Nairobi','Kilimani','Argwings Kodhek Road, Kilimani',-1.2930,36.7870,2,2,1,1150,'1.2 acres','Ultra Homes Developments','Under Construction','Q4 2027','15% deposit, 30 month payment plan','{"Swimming Pool","Gym","Parking","Lift","Generator","Borehole","CCTV","Balcony"}','{"Kilimani Primary","Nairobi Academy"}','{"Nairobi Hospital"}','{"Yaya Centre","Prestige Plaza"}','{"/images/property-5.jpg","/images/property-1.jpg"}','/images/property-5.jpg',NULL,true),
('Nyali Beach Townhouses, Mombasa','nyali-beach-townhouses','Three bedroom coastal townhouses two minutes from the beach.','Whitewashed coastal architecture with makuti detailing, deep verandas and a shared lagoon pool. Ideal as a holiday home or a serviced rental investment.',22500000,'sale','Townhouse','available','Mombasa','Mombasa','Nyali','Links Road, Nyali',-4.0300,39.7000,3,3,1,1900,'0.75 acres','Coast Living Ltd','Completed','2023','40% deposit, 12 month balance','{"Swimming Pool","Parking","Generator","Borehole","CCTV","Garden","Kids Play Area"}','{"Aga Khan Academy Mombasa"}','{"Aga Khan Hospital Mombasa"}','{"Nyali Centre","City Mall"}','{"/images/property-6.jpg","/images/property-2.jpg"}','/images/property-6.jpg',NULL,false),
('Westlands Executive Rental','westlands-executive-rental','Furnished two bedroom apartment available for long let.','A fully furnished executive apartment moments from Westlands'' business district. Rent includes service charge, gym access, backup power and secure parking.',180000,'rent','Apartment','available','Nairobi','Nairobi','Westlands','Rhapta Road, Westlands',-1.2650,36.8020,2,2,1,1250,NULL,'Private Landlord','Completed','2021','Two months deposit','{"Gym","Parking","Lift","Generator","CCTV","Balcony"}','{"Westlands Primary"}','{"MP Shah Hospital"}','{"Sarit Centre","Westgate Mall"}','{"/images/property-1.jpg","/images/property-3.jpg"}','/images/property-1.jpg',NULL,false),
('Syokimau Garden Maisonettes','syokimau-garden-maisonettes','Four bedroom maisonettes in a 40 unit gated court.','Practical family maisonettes with private gardens, solar water heating and a shared clubhouse. Ten minutes from the SGR terminus and the Mombasa Road expressway.',16500000,'sale','Maisonette','sold','Machakos','Syokimau','Katani','Katani Road, Syokimau',-1.3620,36.9500,4,3,1,2100,'2 acres','Ultra Homes Developments','Completed','2024','Sold out','{"Parking","Generator","Borehole","CCTV","Electric Fence","Garden","Kids Play Area"}','{"Syokimau Academy"}','{"Shalom Hospital"}','{"Gateway Mall"}','{"/images/property-6.jpg","/images/property-4.jpg"}','/images/property-6.jpg',NULL,false);

INSERT INTO public.testimonials (name, role, message, rating) VALUES
('Peter Kamau','Homeowner, Karen','Ultra Homes handled everything from the first viewing to the title transfer. I have never seen a Kenyan agency this organised.',5),
('Sarah Muthoni','Investor, Nairobi','I bought two off-plan units through Ultra Homes. The reporting during construction was honest and the handover was on time.',5),
('James Ochieng','Diaspora Buyer, London','Buying from abroad is terrifying. Their video walkthroughs and legal follow-up made it feel simple.',5),
('Faith Chebet','Tenant, Westlands','They found me a furnished apartment in four days and the lease was clean and fair.',4),
('Michael Ndegwa','Developer Partner','We have sold three developments with Ultra Homes. Their sales team consistently beats projections.',5);

INSERT INTO public.blog_posts (title, slug, excerpt, content, cover_image, category, author) VALUES
('A Buyer''s Guide to Off-Plan Property in Kenya','off-plan-buyers-guide-kenya','What to check before you pay a deposit on a development that has not been built yet.','Off-plan buying can be the cheapest route into a prime address, but it carries real risk. Start with the developer''s track record: ask for completed projects you can physically visit. Confirm the land title is clean and that the development has approved architectural drawings from the county. Insist that your payments follow construction milestones rather than a fixed calendar, and that the sale agreement names a completion date with a penalty clause. Finally, budget for stamp duty, legal fees and the service charge from day one so the true cost is never a surprise.','/images/blog-1.jpg','Buying Guide','Amina Wanjiru'),
('Nairobi Neighbourhood Report: Where Values Are Moving','nairobi-neighbourhood-report','Riverside, Kilimani and Runda compared on price per square foot and rental yield.','Riverside continues to command the highest price per square foot in the city, driven by limited new supply and strong diplomatic demand. Kilimani is the volume market: heavy apartment completion has softened sale prices while keeping rental yields near seven percent. Runda and Karen remain low-density, low-turnover markets where value is preserved by plot size rather than finishes. For investors chasing yield, well-managed two bedroom units in Kilimani and Westlands still outperform. For capital preservation, land in Karen and Runda remains the safer store of value.','/images/blog-2.jpg','Market Report','David Otieno'),
('Mortgages in Kenya: What Banks Actually Look At','kenya-mortgage-requirements','Deposit sizes, income multiples and the paperwork that slows applications down.','Most Kenyan lenders will finance up to ninety percent of the value of a completed home, though eighty percent is more typical for off-plan. Banks size the loan against your net monthly income, usually capping repayments at a third of it. Prepare six months of bank statements, payslips, KRA PIN, and a valuation from a bank-approved valuer. Self-employed buyers should expect to provide two years of audited accounts. The single biggest cause of delay is an unresolved title, so instruct your advocate to run a search before you apply.','/images/blog-3.jpg','Finance','Grace Njeri');

INSERT INTO public.site_content (key, value) VALUES
('home', '{"heroHeading":"Find Your Dream Home","heroSubheading":"Kenya''s most trusted address for prime residential property, luxury developments and long-term investment.","heroImage":"/images/hero.jpg","primaryCta":"Explore Properties","secondaryCta":"Featured Projects","stats":[{"label":"Properties Sold","value":"1,240"},{"label":"Happy Clients","value":"980"},{"label":"Years Experience","value":"18"},{"label":"Projects Delivered","value":"36"}],"whyChooseUs":[{"title":"Verified Titles Only","body":"Every listing passes a full legal search before it reaches our website."},{"title":"Diaspora Ready","body":"Video walkthroughs, virtual signings and escrow-backed payments."},{"title":"Developer Partnerships","body":"Direct access to off-plan pricing before public launch."},{"title":"After-Sale Management","body":"Letting, maintenance and resale handled by one team."}],"partners":["Stanbic Bank","KCB Group","Absa Kenya","Cytonn","HassConsult","Knight Frank"]}'::jsonb),
('company', '{"name":"Ultra Homes Limited","phone":"+254 712 345 678","whatsapp":"254712345678","email":"sales@ultrahomes.co.ke","address":"Arbor House, Riverside Drive, Nairobi, Kenya","hours":"Mon - Fri 8:30am - 6:00pm | Sat 9:00am - 2:00pm","mapEmbed":"https://www.google.com/maps?q=Riverside%20Drive%20Nairobi&output=embed"}'::jsonb),
('about', '{"mission":"To make owning quality property in Kenya transparent, secure and genuinely enjoyable.","vision":"To be East Africa''s most trusted residential property brand.","story":"Ultra Homes Limited was founded in 2008 with a single office on Riverside Drive and a simple conviction: that buyers deserve verified titles, honest pricing and an agent who answers the phone. Eighteen years later we have handled over twelve hundred transactions across Nairobi, Kiambu, Machakos and the coast, and we still work the same way.","values":[{"title":"Integrity","body":"We walk away from listings we cannot verify."},{"title":"Craft","body":"We market every home as though it were our own."},{"title":"Partnership","body":"We stay involved long after the keys change hands."}],"timeline":[{"year":"2008","event":"Founded on Riverside Drive with three staff."},{"year":"2013","event":"First in-house development delivered in Kilimani."},{"year":"2018","event":"Opened the Mombasa coastal office."},{"year":"2022","event":"Crossed 1,000 completed transactions."},{"year":"2026","event":"Launched Ultra Homes Property Management."}],"awards":["Kenya Property Awards - Agency of the Year 2023","Real Estate Excellence Award 2021","Top 10 Nairobi Developers 2024"]}'::jsonb);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

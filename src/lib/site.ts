export const SITE = {
  name: "Universal Golden Homes",
  shortName: "Universal Golden Homes",
  tagline: "Prime residential property in Kenya",
  url: "https://universalgoldenhomes.co.ke",
  phone: "+254 712 345 678",
  whatsapp: "254712345678",
  email: "sales@universalgoldenhomes.co.ke",
  address: "Arbor House, Riverside Drive, Nairobi, Kenya",
  hours: "Mon – Fri 8:30am – 6:00pm · Sat 9:00am – 2:00pm",
};

export const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/properties", label: "Properties" },
  { to: "/about", label: "About" },
  { to: "/agents", label: "Agents" },
  { to: "/blog", label: "Insights" },
  { to: "/faqs", label: "FAQs" },
  { to: "/contact", label: "Contact" },
] as const;

export const PROPERTY_TYPES = [
  "Apartment",
  "House",
  "Villa",
  "Townhouse",
  "Maisonette",
  "Penthouse",
  "Land",
  "Commercial",
];

export const PROPERTY_STATUSES = ["available", "reserved", "sold", "new", "let"];

export const AMENITIES = [
  "Swimming Pool",
  "Gym",
  "Parking",
  "Lift",
  "Generator",
  "Borehole",
  "CCTV",
  "Electric Fence",
  "Balcony",
  "Kids Play Area",
  "Garden",
];

export function whatsappLink(message: string, number = SITE.whatsapp) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

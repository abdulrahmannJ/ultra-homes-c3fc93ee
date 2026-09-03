export function formatPrice(value: number, currency = "KES", listingType = "sale") {
  const code = typeof currency === "string" && /^[A-Za-z]{3}$/.test(currency.trim())
    ? currency.trim().toUpperCase()
    : "KES";
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(value || 0);
  } catch {
    formatted = `KES ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(value || 0)}`;
  }
  return listingType === "rent" ? `${formatted}/mo` : formatted;
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 }).format(
    value || 0,
  );
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    available: "Available",
    reserved: "Reserved",
    sold: "Sold",
    new: "New Launch",
    let: "Let",
  };
  return map[status] ?? status;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

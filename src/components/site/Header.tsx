import { Link, useLocation } from "@tanstack/react-router";
import { Menu, Phone, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Logo } from "@/components/site/Logo";
import { NAV_LINKS, SITE, whatsappLink } from "@/lib/site";

import { cn } from "@/lib/utils";

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "border-b border-border bg-navy-deep/95 shadow-luxe backdrop-blur"
          : "bg-gradient-to-b from-navy-deep/80 to-transparent",
      )}
    >
      <div className="container-luxe flex h-18 items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-3">
          <Logo className="h-11 w-11" />
          <span className="leading-tight">
            <span className="block font-display text-lg font-semibold tracking-wide text-ivory lg:hidden">
              Universal Golden Homes
            </span>
            <span className="hidden font-display text-lg font-semibold tracking-wide text-ivory lg:block">
              U.H.G
            </span>
            <span className="block text-[0.6rem] uppercase tracking-[0.3em] text-gold lg:hidden">
              Kenya
            </span>
            <span className="hidden text-[0.6rem] uppercase tracking-[0.3em] text-gold lg:block">
              Kenya
            </span>
          </span>
        </Link>


        <nav className="hidden items-center gap-1 rounded-full border border-ivory/10 bg-ivory/5 px-2 py-1.5 backdrop-blur lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "rounded-full px-3.5 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-ivory/70 transition-colors hover:text-gold",
                location.pathname === link.to && "bg-ivory/10 text-gold",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={`tel:${SITE.phone.replace(/\s/g, "")}`}
            className="flex items-center gap-2 text-sm font-semibold text-ivory/85 transition-colors hover:text-gold"
          >
            <Phone className="h-4 w-4 text-gold" />
            {SITE.phone}
          </a>
          <Link
            to="/contact"
            search={{ subject: "List with Us" }}
            className="rounded-full bg-gradient-gold px-5 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-navy-deep transition-transform hover:scale-105"
          >
            List with Us
          </Link>
        </div>


        <button
          onClick={() => setOpen(!open)}
          className="text-ivory lg:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-ivory/10 bg-navy-deep/98 px-6 py-6 backdrop-blur lg:hidden">
          <div className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-semibold uppercase tracking-[0.14em] text-ivory/85 hover:text-gold"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/contact"
              search={{ subject: "List with Us" }}
              className="mt-2 rounded-sm bg-gradient-gold px-5 py-3 text-center text-xs font-bold uppercase tracking-[0.14em] text-navy-deep"
            >
              List with Us
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

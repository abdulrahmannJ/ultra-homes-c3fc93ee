import { Link } from "@tanstack/react-router";
import { Clock, Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Twitter } from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/site/Logo";
import { subscribeNewsletter } from "@/lib/mutations.functions";
import { NAV_LINKS, SITE } from "@/lib/site";

export function Footer() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await subscribeNewsletter({ data: { email } });
      setMsg("Thank you for subscribing.");
      setEmail("");
    } catch {
      setMsg("Could not subscribe right now. Please try again.");
    }
  }

  return (
    <footer className="bg-navy-deep text-ivory/75">
      <div className="container-luxe grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <Logo className="h-11 w-11" />
            <span className="font-display text-lg font-semibold text-ivory">Universal Golden Homes</span>
          </div>

          <p className="mt-4 text-sm leading-relaxed">
            {SITE.tagline}. We help families and investors find prime residential property across
            Nairobi and Kenya's fastest-growing towns.
          </p>
          <div className="mt-5 flex gap-3">
            {[Facebook, Instagram, Twitter, Linkedin].map((Icon, i) => (
              <a
                key={i}
                href="#"
                aria-label="Social link"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-ivory/15 transition-colors hover:border-gold hover:text-gold"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="eyebrow">Explore</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {NAV_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="transition-colors hover:text-gold">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="eyebrow">Contact</h4>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              {SITE.address}
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              {SITE.phone}
            </li>
            <li className="flex gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              {SITE.email}
            </li>
            <li className="flex gap-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              {SITE.hours}
            </li>
          </ul>
        </div>

        <div>
          <h4 className="eyebrow">Newsletter</h4>
          <p className="mt-4 text-sm">New listings and market insights, once a month.</p>
          <form onSubmit={subscribe} className="mt-4 flex">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full rounded-l-sm border border-ivory/15 bg-ivory/5 px-3 py-2.5 text-sm text-ivory placeholder:text-ivory/40 focus:border-gold focus:outline-none"
            />
            <button className="rounded-r-sm bg-gradient-gold px-4 text-xs font-bold uppercase tracking-wider text-navy-deep">
              Join
            </button>
          </form>
          {msg && <p className="mt-2 text-xs text-gold">{msg}</p>}
        </div>
      </div>

      <div className="border-t border-ivory/10">
        <div className="container-luxe flex flex-col items-center justify-between gap-3 py-5 text-xs sm:flex-row">
          <p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#" className="hover:text-gold">Privacy Policy</a>
            <a href="#" className="hover:text-gold">Terms of Service</a>
            <Link to="/auth" className="hover:text-gold">Staff Login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

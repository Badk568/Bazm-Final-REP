"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Mark from "@/components/Mark";
import { visibleSections } from "@/lib/admin-permissions";
import type { Role } from "@/lib/types";

export default function AdminShell({ staff, children }: { staff: { email: string; role: Role }; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const sections = visibleSections(staff.role);
  return <div className={`stage-admin${open ? " stage-admin--open" : ""}`}>
    <button className="stage-admin__scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />
    <aside className="stage-admin__sidebar" id="admin-sidebar" aria-label="Admin navigation">
      <a className="stage-admin__brand" href="/admin"><Mark size={40} light /><span>BAZM<small>Administration</small></span></a>
      <nav>{sections.map((section) => {
        const active = section.href === "/admin" ? pathname === "/admin" : pathname.startsWith(section.href);
        return <a href={section.href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)} key={section.slug}><span>{section.label.slice(0, 1)}</span>{section.label}</a>;
      })}</nav>
      <div className="stage-admin__sidebar-foot"><small>Signed in as</small><b>{staff.email}</b><span>{staff.role.replaceAll("_", " ")}</span></div>
    </aside>
    <div className="stage-admin__workspace">
      <header className="stage-admin__topbar">
        <button className="stage-admin__menu" type="button" aria-expanded={open} aria-controls="admin-sidebar" onClick={() => setOpen((value) => !value)}><i /><i /><span className="sr-only">Open admin navigation</span></button>
        <div><small>Bazm staff portal</small><strong>{staff.role.replaceAll("_", " ")}</strong></div>
        <a href="/" target="_blank" rel="noreferrer">View public site ↗</a>
        <form action="/api/admin/logout" method="post"><button type="submit">Log out</button></form>
      </header>
      <main className="stage-admin__content">{children}</main>
    </div>
  </div>;
}

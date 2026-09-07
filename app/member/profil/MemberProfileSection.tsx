"use client";

import { useState } from "react";

import { MembershipSignupForm } from "../../components/MembershipSignupForm";
import { memberProfileOptions } from "../../lib/member-profile-options";
import type { MemberProfileData } from "../../lib/member-profile";

export default function MemberProfileSection({ profile }: { profile: MemberProfileData | null }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ marginTop: 18 }}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        style={{ width: "100%", textAlign: "left", border: "1px solid #d5d9df", borderRadius: 12, padding: 18, color: "#0f172a", background: "#fff", cursor: "pointer" }}
      >
        <strong>Profil członkowski</strong>
        <span style={{ display: "block", marginTop: 6, color: "#475569" }}>
          {isOpen ? "Ukryj formularz profilu" : "Edytuj dane firmy i zakres działalności"}
        </span>
      </button>
      {isOpen ? (
        <div id="profil-czlonkowski" style={{ marginTop: 18 }}>
          <MembershipSignupForm {...memberProfileOptions} initialData={profile ?? undefined} saveEndpoint="/api/member/profile" />
        </div>
      ) : null}
    </div>
  );
}

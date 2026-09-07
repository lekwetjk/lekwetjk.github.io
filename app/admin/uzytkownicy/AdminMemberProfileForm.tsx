"use client";

import { useEffect, useState } from "react";
import { MembershipSignupForm } from "../../components/MembershipSignupForm";
import { memberProfileOptions } from "../../lib/member-profile-options";
import type { MemberProfileData } from "../../lib/member-profile";

export default function AdminMemberProfileForm({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<MemberProfileData | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void fetch(`/api/admin/users/${userId}/profile`)
      .then((response) => response.json())
      .then((data: { profile?: MemberProfileData | null }) => { setProfile(data.profile ?? undefined); setLoaded(true); });
  }, [userId]);

  if (!loaded) return <p>Ładowanie profilu członkowskiego...</p>;

  return <MembershipSignupForm {...memberProfileOptions} initialData={profile} saveEndpoint={`/api/admin/users/${userId}/profile`} />;
}
"use client";

import { useMemo, useState } from "react";
import type { MemberProfileData } from "../lib/member-profile";

type MembershipSignupFormProps = {
  voivodeships: string[];
  businessScopes: string[];
  poultrySpecies: string[];
  assortments: string[];
  certifications: string[];
  exportPermits: string[];
};

type FormState = {
  contactPerson: string;
  email: string;
  phone: string;
  companyName: string;
  streetAddress: string;
  postalCode: string;
  city: string;
  nip: string;
  website: string;
  voivodeship: string;
  notes: string;
  consent: boolean;
};

type MembershipFormInitialData = Partial<MemberProfileData>;

const INITIAL_FORM: FormState = {
  contactPerson: "",
  email: "",
  phone: "",
  companyName: "",
  streetAddress: "",
  postalCode: "",
  city: "",
  nip: "",
  website: "",
  voivodeship: "",
  notes: "",
  consent: false,
};

export function MembershipSignupForm({
  voivodeships,
  businessScopes,
  poultrySpecies,
  assortments,
  certifications,
  exportPermits,
  initialData,
  saveEndpoint,
}: MembershipSignupFormProps & { initialData?: MembershipFormInitialData; saveEndpoint?: string }) {
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM, ...initialData });
  const [selectedScopes, setSelectedScopes] = useState<string[]>(initialData?.selectedScopes ?? []);
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>(initialData?.selectedSpecies ?? []);
  const [selectedAssortments, setSelectedAssortments] = useState<string[]>(initialData?.selectedAssortments ?? []);
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>(initialData?.selectedCertifications ?? []);
  const [selectedExportPermits, setSelectedExportPermits] = useState<string[]>(initialData?.selectedExportPermits ?? []);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const submissionEmail = "krd-ig@krd-ig.com.pl";

  const toggleValue = (
    value: string,
    selected: string[],
    setSelected: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setSelected((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value],
    );
  };

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const summary = useMemo(
    () => ({
      ...form,
      selectedScopes,
      selectedSpecies,
      selectedAssortments,
      selectedCertifications,
      selectedExportPermits,
    }),
    [
      form,
      selectedScopes,
      selectedSpecies,
      selectedAssortments,
      selectedCertifications,
      selectedExportPermits,
    ],
  );

  const validate = () => {
    const currentErrors: string[] = [];

    if (!form.contactPerson.trim()) {
      currentErrors.push("Podaj osobę do kontaktu.");
    }
    if (!form.email.trim()) {
      currentErrors.push("Podaj adres e-mail.");
    }
    if (!form.companyName.trim()) {
      currentErrors.push("Podaj nazwę firmy.");
    }
    if (!form.voivodeship) {
      currentErrors.push("Wybierz województwo.");
    }
    if (selectedScopes.length === 0) {
      currentErrors.push("Wybierz minimum jeden zakres działalności.");
    }
    if (!saveEndpoint && !form.consent) {
      currentErrors.push("Zaznacz zgodę na kontakt w sprawie zgłoszenia.");
    }

    setErrors(currentErrors);
    return currentErrors.length === 0;
  };

  const buildMailtoHref = () => {
    const subject = `Zgloszenie czlonkowskie - ${form.companyName || "firma"}`;
    const bodyLines = [
      "Nowe zgloszenie czlonkowskie",
      "",
      `Osoba do kontaktu: ${form.contactPerson}`,
      `E-mail: ${form.email}`,
      `Telefon: ${form.phone || "-"}`,
      `Nazwa firmy: ${form.companyName}`,
      `Adres: ${form.streetAddress || "-"}`,
      `Kod pocztowy: ${form.postalCode || "-"}`,
      `Miasto: ${form.city || "-"}`,
      `NIP: ${form.nip || "-"}`,
      `Strona www: ${form.website || "-"}`,
      `Wojewodztwo: ${form.voivodeship}`,
      "",
      `Zakres dzialalnosci: ${selectedScopes.join(", ") || "-"}`,
      `Gatunek drobiu: ${selectedSpecies.join(", ") || "-"}`,
      `Asortyment: ${selectedAssortments.join(", ") || "-"}`,
      `Certyfikaty: ${selectedCertifications.join(", ") || "-"}`,
      `Uprawnienia eksportowe: ${selectedExportPermits.join(", ") || "-"}`,
      "",
      `Dodatkowe informacje: ${form.notes || "-"}`,
    ];

    return `mailto:${submissionEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
  };

  return (
    <form
      className="membership-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!validate()) {
          setIsSubmitted(false);
          return;
        }
        if (saveEndpoint) {
          void fetch(saveEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(summary),
          })
            .then(async (response) => {
              if (!response.ok) throw new Error("Nie udało się zapisać profilu.");
              setIsSubmitted(true);
            })
            .catch((error: unknown) => setErrors([error instanceof Error ? error.message : "Nie udało się zapisać profilu."]));
        } else {
          window.location.href = buildMailtoHref();
          setIsSubmitted(true);
        }
      }}
      noValidate
    >
      <div className="membership-form-grid">
        <label>
          Osoba do kontaktu *
          <input
            type="text"
            value={form.contactPerson}
            onChange={(event) => updateField("contactPerson", event.target.value)}
            placeholder="Imię i nazwisko"
            required
          />
        </label>
        <label>
          E-mail *
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="nazwa@firma.pl"
            required
          />
        </label>
        <label>
          Telefon
          <input
            type="tel"
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="+48 ..."
          />
        </label>
        <label>
          Nazwa firmy *
          <input
            type="text"
            value={form.companyName}
            onChange={(event) => updateField("companyName", event.target.value)}
            required
          />
        </label>
        <label>
          Adres firmy
          <input
            type="text"
            value={form.streetAddress}
            onChange={(event) => updateField("streetAddress", event.target.value)}
            placeholder="Ulica i numer"
          />
        </label>
        <label>
          Kod pocztowy
          <input
            type="text"
            value={form.postalCode}
            onChange={(event) => updateField("postalCode", event.target.value)}
            placeholder="00-000"
          />
        </label>
        <label>
          Miasto
          <input
            type="text"
            value={form.city}
            onChange={(event) => updateField("city", event.target.value)}
          />
        </label>
        <label>
          NIP
          <input
            type="text"
            value={form.nip}
            onChange={(event) => updateField("nip", event.target.value)}
          />
        </label>
        <label>
          Strona internetowa
          <input
            type="url"
            value={form.website}
            onChange={(event) => updateField("website", event.target.value)}
            placeholder="https://"
          />
        </label>
        <label>
          Województwo *
          <select
            value={form.voivodeship}
            onChange={(event) => updateField("voivodeship", event.target.value)}
            required
          >
            <option value="">Wybierz...</option>
            {voivodeships.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend>Zakres działalności *</legend>
        <div className="membership-chip-grid">
          {businessScopes.map((scope) => (
            <label key={scope} className="membership-chip-checkbox">
              <input
                type="checkbox"
                checked={selectedScopes.includes(scope)}
                onChange={() => toggleValue(scope, selectedScopes, setSelectedScopes)}
              />
              <span>{scope}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Gatunek drobiu</legend>
        <div className="membership-chip-grid">
          {poultrySpecies.map((species) => (
            <label key={species} className="membership-chip-checkbox">
              <input
                type="checkbox"
                checked={selectedSpecies.includes(species)}
                onChange={() => toggleValue(species, selectedSpecies, setSelectedSpecies)}
              />
              <span>{species}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Asortyment</legend>
        <div className="membership-chip-grid">
          {assortments.map((item) => (
            <label key={item} className="membership-chip-checkbox">
              <input
                type="checkbox"
                checked={selectedAssortments.includes(item)}
                onChange={() => toggleValue(item, selectedAssortments, setSelectedAssortments)}
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Certyfikaty</legend>
        <div className="membership-chip-grid">
          {certifications.map((item) => (
            <label key={item} className="membership-chip-checkbox">
              <input
                type="checkbox"
                checked={selectedCertifications.includes(item)}
                onChange={() => toggleValue(item, selectedCertifications, setSelectedCertifications)}
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Uprawnienia eksportowe</legend>
        <div className="membership-chip-grid">
          {exportPermits.map((item) => (
            <label key={item} className="membership-chip-checkbox">
              <input
                type="checkbox"
                checked={selectedExportPermits.includes(item)}
                onChange={() => toggleValue(item, selectedExportPermits, setSelectedExportPermits)}
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="membership-textarea-label">
        Dodatkowe informacje
        <textarea
          rows={4}
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          placeholder="Wpisz dodatkowe informacje do zgłoszenia"
        />
      </label>

      {!saveEndpoint ? (
        <label className="membership-consent">
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(event) => updateField("consent", event.target.checked)}
            required
          />
          <span>Wyrażam zgodę na kontakt w sprawie zgłoszenia członkowskiego. *</span>
        </label>
      ) : null}

      {errors.length > 0 && (
        <div className="membership-errors" role="alert" aria-live="polite">
          <p>Uzupełnij wymagane pola:</p>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="membership-submit-title">{saveEndpoint ? "ZAPISZ PROFIL" : "WYŚLIJ ZGŁOSZENIE"}</h2>
      {!saveEndpoint ? <p className="membership-mail-hint">Po wysłaniu formularza otworzy się nowa wiadomość e-mail na adres {submissionEmail}.</p> : null}
      <button type="submit" className="button button-primary membership-submit-button">
        {saveEndpoint ? "Zapisz profil" : "Wyślij zgłoszenie"}
      </button>

      {isSubmitted && !saveEndpoint && (
        <div className="membership-success" aria-live="polite">
          <h3>Dziękujemy. Formularz został przekazany do KRD-IG</h3>
          <p>
            Skontaktujemy się pod adresem <strong>{summary.email}</strong> w sprawie dalszych
            kroków członkostwa.
          </p>
        </div>
      )}
    </form>
  );
}

type PasswordResetEmailInput = {
  to: string;
  name: string;
  username: string;
  temporaryPassword: string;
  loginUrl: string;
};

function getRuntimeEnv(name: string) {
  const processValue = process.env[name]?.trim();
  if (processValue) return processValue;

  const bindingValue = (globalThis as typeof globalThis & { env?: Record<string, unknown> }).env?.[name];
  return typeof bindingValue === "string" ? bindingValue.trim() : "";
}

export function isPasswordResetEmailConfigured() {
  return Boolean(getRuntimeEnv("RESEND_API_KEY"));
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput) {
  const apiKey = getRuntimeEnv("RESEND_API_KEY");

  if (!apiKey) {
    throw new Error("Password reset email is not configured.");
  }

  const from = getRuntimeEnv("PASSWORD_RESET_FROM_EMAIL") || "KRD-IG <krd-ig@krd-ig.com.pl>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: "Reset hasła do strefy członków KRD-IG",
      text: [
        `Dzień dobry${input.name ? `, ${input.name}` : ""},`,
        "",
        "Wygenerowaliśmy tymczasowe hasło do strefy członków KRD-IG.",
        "",
        `Login: ${input.username}`,
        `Hasło tymczasowe: ${input.temporaryPassword}`,
        "",
        `Zaloguj się tutaj: ${input.loginUrl}`,
        "Po pierwszym logowaniu system poprosi o ustawienie nowego hasła.",
        "",
        "Jeżeli to nie Ty prosiłeś/prosiłaś o reset hasła, skontaktuj się z KRD-IG.",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    throw new Error("Password reset email could not be sent.");
  }
}
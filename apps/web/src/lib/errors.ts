import { ApiRequestError } from "./api";

/*
 * What the user is told when a request fails. The API speaks English in its
 * `message`; the interface speaks Lithuanian, so it goes by the machine code
 * first and the status second.
 */

const BY_CODE: Record<string, string> = {
  INVALID_CREDENTIALS: "Neteisingas el. paštas arba slaptažodis.",
  ACCOUNT_BLOCKED: "Paskyra užblokuota. Kreipkitės į administratorių.",
  EMAIL_TAKEN: "Paskyra su šiuo el. paštu jau yra.",
  SESSION_REVOKED: "Prisijungimas baigėsi. Prisijunkite iš naujo.",
  TOKEN_EXPIRED: "Prisijungimas baigėsi. Prisijunkite iš naujo.",
  INVALID_PASSWORD: "Dabartinis slaptažodis neteisingas.",
  API_UNREACHABLE: "Serveris nepasiekiamas. Patikrinkite ryšį ir bandykite dar kartą.",
};

const BY_STATUS: Record<number, string> = {
  400: "Užklausa neteisinga.",
  401: "Reikia prisijungti.",
  403: "Neturite teisės atlikti šio veiksmo.",
  404: "Nerasta: įrašo nėra arba jo matyti negalite.",
  409: "Veiksmas prieštarauja esamai būsenai.",
  422: "Patikrinkite pažymėtus laukus.",
  502: BY_CODE.API_UNREACHABLE,
};

/** A sentence for the user, in Lithuanian. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 429) {
      const minutes = error.retryAfter ? Math.max(1, Math.ceil(error.retryAfter / 60)) : null;
      return minutes
        ? `Per daug bandymų. Bandykite po ${minutes} min.`
        : "Per daug bandymų. Bandykite vėliau.";
    }
    // 409 messages explain a specific rule ("already running", "already accepted").
    if (error.status === 409 && !BY_CODE[error.code]) return `${BY_STATUS[409]} ${error.message}`;
    return BY_CODE[error.code] ?? BY_STATUS[error.status] ?? "Kažkas nepavyko. Bandykite dar kartą.";
  }
  if (error instanceof TypeError) return BY_CODE.API_UNREACHABLE;
  return "Kažkas nepavyko. Bandykite dar kartą.";
}

/** The terminal line of an error toast: `> not_found [404]`. */
export function errorCommand(error: unknown): string {
  if (error instanceof ApiRequestError) return `> ${error.code.toLowerCase()} [${error.status}]`;
  return "> klaida";
}

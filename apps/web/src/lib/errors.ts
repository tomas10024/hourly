import { ApiRequestError, fieldErrors } from "./api";

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
  // Domain rules (409 / 422 / 403).
  PROPOSAL_ALREADY_SUBMITTED: "Šiam projektui pasiūlymą jau pateikėte.",
  PROPOSAL_NOT_PENDING: "Pasiūlymas jau išspręstas – jo keisti nebegalima.",
  PROPOSAL_ACCEPTED: "Priimto pasiūlymo šalinti negalima.",
  PROJECT_NOT_PUBLISHED: "Projektas nepaskelbtas – pasiūlymų jis nepriima.",
  PROJECT_NOT_IN_PROGRESS: "Projektas nevykdomas – darbo registruoti negalima.",
  PROJECT_CLOSED: "Projektas užbaigtas arba atšauktas – jo keisti nebegalima.",
  NO_PROPOSAL_STAGE: "Tiesiogiai sutartas projektas pasiūlymų neturi.",
  INVALID_STATUS_TRANSITION: "Į šią būseną iš dabartinės pereiti negalima.",
  INVALID_BUDGET_RANGE: "Biudžeto apatinė riba didesnė už viršutinę.",
  INVALID_TIME_RANGE: "Pabaiga turi būti vėlesnė už pradžią.",
  TIMESTAMP_IN_FUTURE: "Laikas negali būti ateityje.",
  SESSION_ALREADY_RUNNING: "Jau turite vykdomą sesiją. Pirmiausia sustabdykite ją.",
  APPROVAL_NOT_APPLICABLE: "Šios užduoties tvirtinti nereikia.",
  USER_HAS_WORK_HISTORY: "Naudotojas turi projektų arba darbo istoriją – jį galima tik užblokuoti.",
  CANNOT_MODIFY_SELF: "Savo paskyros taip keisti negalima.",
  VALUE_OUT_OF_RANGE: "Reikšmė per didelė.",
  VALUE_TOO_LONG: "Tekstas per ilgas.",
  INVALID_REFERENCE: "Susijęs įrašas nebeegzistuoja.",
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

/**
 * A failed form submission, split for display: messages next to the fields
 * the API named (422), or one message for the whole form. The API's own
 * field texts are English, so a field gets a Lithuanian sentence instead
 * (from `labels`, else a generic one).
 */
export function formErrors(
  error: unknown,
  labels: Record<string, string> = {},
): { fields: Record<string, string>; form?: string } {
  const named = fieldErrors(error);
  const keys = Object.keys(named);
  if (keys.length === 0) return { fields: {}, form: errorMessage(error) };
  const fields: Record<string, string> = {};
  for (const key of keys) {
    const field = key.split(".")[0];
    fields[field] ??= labels[field] ?? "Netinkama reikšmė.";
  }
  return { fields };
}

import type { RegistrationStatus } from "./data/types";

export const STATUS_LABEL: Record<RegistrationStatus, string> = {
  active: "Upisan/a",
  waitlist: "Lista čekanja",
  cancelled_parent: "Otkazao roditelj",
  cancelled_admin: "Otkazala administracija",
};

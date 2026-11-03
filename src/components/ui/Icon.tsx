import type { SVGProps } from "react";

export type IconName =
  | "phone" | "mail" | "instagram" | "facebook" | "pin" | "clock" | "check" | "arrow-right" | "arrow-left"
  | "menu" | "close" | "calendar" | "users" | "shield" | "star" | "map" | "chevron-down" | "info" | "heart" | "sparkle" | "child";

const paths: Record<IconName, React.ReactNode> = {
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  mail: (<><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></>),
  instagram: (<><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></>),
  facebook: <path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H7v3.5h2V21h3.5v-8.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15z" />,
  pin: (<><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  "arrow-right": <path d="M5 12h14m-6-6 6 6-6 6" />,
  "arrow-left": <path d="M19 12H5m6-6-6 6 6 6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  calendar: (<><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4m8-4v4" /></>),
  users: (<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.2a5 5 0 0 1 5.5 4.8" /></>),
  shield: (<><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>),
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  map: (<><path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5V4l-6 2.5z" /><path d="M9 4v13m6-10.5v13" /></>),
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8.5v.5" /></>),
  heart: <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />,
  sparkle: <path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z" />,
  child: (<><circle cx="12" cy="5.5" r="2.5" /><path d="M12 8.5v6m0 0-3 5.5m3-5.5 3 5.5M7 11l5-1 5 1" /></>),
};

export function Icon({ name, className = "h-5 w-5", ...rest }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}

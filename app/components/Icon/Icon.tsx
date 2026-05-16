import { log } from "console";
import { send } from "process";
import type { ComponentPropsWithoutRef, CSSProperties } from "react";

export const commonIcons = {
  save: "save",
  delete: "delete",
  edit: "edit",
  close: "close",
  chevronRight: "chevron_right",
  chevronLeft: "chevron_left",
  chevronDown: "keyboard_arrow_down",
  filter: "filter_alt",
  download: "download",
  history: "history",
  externalLink: "open_in_new",
  calendar: "calendar_month",
  search: "search",
  eye: "visibility",
  eyeOff: "visibility_off",
  email: "email",
  password: "password",
  phone: "phone",
  sms: "sms",
  send: "send",
  logout: "logout",
} as const;

export type CommonIconName = keyof typeof commonIcons;
export type MaterialIconName = (typeof commonIcons)[CommonIconName] | string;

export type IconProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  icon: MaterialIconName | CommonIconName;
  size?: number | string;
  filled?: boolean;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
  grade?: -25 | 0 | 200;
  opticalSize?: 20 | 24 | 40 | 48;
  title?: string;
};

function resolveIcon(icon: IconProps["icon"]) {
  if (icon in commonIcons) {
    return commonIcons[icon as CommonIconName];
  }

  return icon;
}

export default function Icon({
  icon,
  size = 20,
  filled = false,
  weight = 400,
  grade = 0,
  opticalSize = 24,
  title,
  className,
  style,
  ...props
}: IconProps) {
  const hasAccessibleLabel = Boolean(title ?? props["aria-label"]);
  const resolvedIcon = resolveIcon(icon);
  const mergedStyle: CSSProperties = {
    fontSize: size,
    lineHeight: 1,
    fontVariationSettings: `"FILL" ${filled ? 1 : 0}, "wght" ${weight}, "GRAD" ${grade}, "opsz" ${opticalSize}`,
    ...style,
  };

  return (
    <span
      className={["material-symbols-outlined", className].filter(Boolean).join(" ")}
      style={mergedStyle}
      aria-hidden={hasAccessibleLabel ? undefined : true}
      role={hasAccessibleLabel ? "img" : undefined}
      title={title}
      {...props}
    >
      {resolvedIcon}
    </span>
  );
}

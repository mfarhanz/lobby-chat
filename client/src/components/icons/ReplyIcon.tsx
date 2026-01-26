import type { IconProps } from "../../types/icon";

export function ReplyIcon({ className = "size-6" }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6l6-6"
      />
    </svg>
  );
}

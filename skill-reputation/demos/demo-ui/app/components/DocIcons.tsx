type IconProps = {
  size?: number;
  className?: string;
};

/** Claude docs–style open book (thick stroke, rounded pages) */
export function IconOpenBook({ size = 52, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M10 12C10 9.5 12 7.5 16 7.5H24V40H16C12 40 10 38 10 35.5V12Z"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <path
        d="M42 12C42 9.5 40 7.5 36 7.5H28V40H36C40 40 42 38 42 35.5V12Z"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <path d="M24 7.5H28" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <path
        d="M24 40L26 44.5L28 40"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Claude docs–style sparkles for Ask Docs */
export function IconSparkles({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M8 0.5L9.2 4.8L13.5 6L9.2 7.2L8 11.5L6.8 7.2L2.5 6L6.8 4.8L8 0.5Z" />
      <path d="M13.5 1L14 2.5L15.5 3L14 3.5L13.5 5L13 3.5L11.5 3L13 2.5L13.5 1Z" opacity="0.65" />
    </svg>
  );
}

/** Claude docs–style search magnifier */
export function IconSearch({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Claude docs–style send / paper plane */
export function IconSend({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M16 2L8 10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 2L11 16L8 10L2 7L16 2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

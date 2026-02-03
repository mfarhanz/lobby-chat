type IconButtonProps = {
  icon: React.ReactNode;
  title?: string;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
};

export function IconButton({
  icon,
  title,
  disabled = false,
  className = "",
  onClick,
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-btn ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      title={title}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

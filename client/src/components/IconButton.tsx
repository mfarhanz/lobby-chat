interface IconButtonProps {
    id?: string;
    icon: React.ReactNode;
    title?: string;
    disabled?: boolean;
    className?: string;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: React.ReactNode;
}

export function IconButton({
    id = "",
    icon,
    title,
    disabled = false,
    className = "",
    onClick,
    ...props
}: IconButtonProps) {
    return (
        <button
            id={id}
            type="button"
            className={`icon-btn ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
            title={title}
            disabled={disabled}
            onClick={onClick}
            {...props}
        >
            {icon}
        </button>
    );
}

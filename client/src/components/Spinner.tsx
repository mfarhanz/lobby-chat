interface SpinnerProps {
    size?: number;
    colorClass?: string;
    zIndex?: string;
    className?: string;
};

export function Spinner({
    size = 5,
    colorClass = "border-zinc-300/50",
    zIndex = "z-20",
    className = "",
}: SpinnerProps) {
    return (
        <div className={`absolute inset-0 flex justify-center items-center ${zIndex} ${className}`}>
            <div
                className={`w-${size} h-${size} border-2 border-t-transparent ${colorClass} rounded-full animate-spin`}
            />
        </div>
    );
}

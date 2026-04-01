import { useState, type SyntheticEvent } from "react";

interface SkeletonImageProps {
    src?: string | undefined;
    alt?: string | undefined;
    loading?: "lazy" | undefined;
    animated?: boolean;
    progress?: number | undefined;
    onClick?: () => void;
    onLoad?: () => void | undefined;
    onError?: (ev: SyntheticEvent<HTMLImageElement, Event>) => void;
    className?: string;
};

export function SkeletonImage({
    src,
    alt,
    loading,
    animated = true,
    progress,
    onClick,
    onLoad,
    onError,
    className = "",
}: SkeletonImageProps) {
    const [loaded, setLoaded] = useState(false);

    return (
        <div className="relative w-full">
            <img
                src={src}
                alt={alt ?? "uploaded"}
                className={`${className}`}
                loading={loading}       // redundant with react-virtual?
                decoding="async"
                onClick={onClick}
                onError={onError}
                onLoad={() => {
                    setLoaded(true);
                    onLoad?.();
                }}
            />

            {!loaded && (
                <div
                    title="loading..."
                    className={`absolute inset-0 aspect-square rounded-md bg-zinc-700 ${animated ? "animate-pulse" : ""} ${className}`}
                >
                    {progress !== undefined && (
                        <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2">
                            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                                <circle
                                    cx="18"
                                    cy="18"
                                    r="15.5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    className="text-zinc-600"
                                />
                                <circle
                                    cx="18"
                                    cy="18"
                                    r="15.5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeDasharray="97.4"
                                    strokeDashoffset={97.4 - (progress / 100) * 97.4}
                                    className="text-zinc-400 transition-[stroke-dashoffset] duration-300 ease-out"
                                />
                            </svg>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

import { useState, type SyntheticEvent } from "react";

interface SkeletonImageProps {
    src: string;
    onClick?: () => void;
    onLoad?: () => void | undefined;
    onError?: (ev: SyntheticEvent<HTMLImageElement, Event>) => void;
    className?: string;
};

export function SkeletonImage({
    src,
    onClick,
    onLoad,
    onError,
    className = "",
}: SkeletonImageProps) {
    const [loaded, setLoaded] = useState(false);

    return (
        <div className="relative w-full">
            {!loaded && (
                <div 
                    title="loading..."
                    className={`aspect-square rounded-md bg-zinc-700 animate-pulse ${className}`} />
            )}
            <img
                src={src}
                alt="uploaded"
                className={`${loaded ? "block" : "hidden"} ${className}`}
                // loading="lazy"       // redundant with react-virtual?
                onClick={onClick}
                onError={onError}
                onLoad={() => {
                    setLoaded(true);
                    onLoad?.();
                }}
            />
        </div>
    );
}

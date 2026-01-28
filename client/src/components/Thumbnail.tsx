import { TrashIcon } from "./icons/TrashIcon";

type ThumbnailProps = {
  src: string;
  onRemove: () => void;
};

export function Thumbnail({ src, onRemove }: ThumbnailProps) {
  return (
    <div className="relative bottom-full left-3 -mb-px
                    flex items-center gap-2
                    bg-zinc-800 border border-zinc-700 border-b-0
                    px-3 py-1
                    rounded-t-md rounded-b-none
                    text-xs text-zinc-300
                    shadow-sm">
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className="w-25 h-25 max-h-25 max-w-25 object-cover rounded-sm bg-zinc-900"
      />
      <button
        onClick={onRemove}
        className="ml-1 text-red-500/60 hover:text-red-400 transition-colors cursor-pointer"
        title="Remove media"
      >
        <TrashIcon className="w-5 h-5" />
      </button>
    </div>
  );
}

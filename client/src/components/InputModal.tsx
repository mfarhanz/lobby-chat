type Props = {
    value: string | null;
    action: string;
    placeholder: string;
    error?: string | null;
    onChange: (val: string) => void;
    onCancel: () => void;
    onSubmit: () => void;
    isOpen: boolean;
};

export function InputModal({
    value,
    action,
    placeholder,
    error,
    onChange,
    onCancel,
    onSubmit,
    isOpen 
}: Props) {

    if (!isOpen) return null;

    return (
        <div
            className="absolute bottom-full mb-2 p-3 right-0 w-full max-w-md bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg"
            onKeyDown={(e) => {
                if (e.key === "Escape") onCancel();
            }}
        >
            <div className="space-y-2">
                <input
                    type="text"
                    placeholder={placeholder}
                    className="w-full rounded-md bg-zinc-700 px-3 py-1.5 text-sm outline-none"
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                />

                {error && <div className="text-xs text-red-400">{error}</div>}

                <div className="flex justify-end gap-2 pt-1">
                    <button
                        className="text-sm text-zinc-400 hover:text-zinc-200 cursor-pointer"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        className="text-sm px-3 py-1 rounded-md bg-indigo-600 text-white cursor-pointer"
                        onClick={onSubmit}
                    >
                        {action}
                    </button>
                </div>
            </div>
        </div>
    );
}

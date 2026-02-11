import type { DrawerAction } from "../types/chat";

interface DrawerProps {
    open: boolean;
    actions: DrawerAction[];
    onClose: () => void;
};

export function Drawer({ open, actions, onClose }: DrawerProps) {
    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/40 md:hidden"
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-zinc-900 
                            p-4 md:hidden animate-slide-up"
            >
                <div className="flex flex-col divide-y divide-zinc-700">
                    {actions.map(action => (
                        <button
                            key={action.key}
                            onClick={() => {
                                action.onPress();
                                onClose();
                            }}
                            className={`flex items-center gap-3 px-4 py-3 text-left transition-colors
                                        ${action.destructive ? "text-red-400 hover:bg-red-500/10" : 
                                                                "text-zinc-100 hover:bg-zinc-800"}`}
                        >
                            {action.icon && (
                                <span className="text-lg">{action.icon}</span>
                            )}
                            <span className="text-base">{action.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}

import { memo, useRef } from "react";
import { motion, useMotionValue } from "framer-motion";
import type { DrawerAction } from "../types/chat";

interface DrawerProps {
    actions: DrawerAction[];
    onClose: () => void;
}

export const Drawer = memo(function Drawer({ actions, onClose }: DrawerProps) {
    const y = useMotionValue(0);
    const drawerRef = useRef<HTMLDivElement>(null);

    const normal = actions.filter(a => !a.destructive);
    const destructive = actions.filter(a => a.destructive);

    return (
        <>
            {/* Backdrop */}
            <motion.div
                className="fixed inset-0 z-40 bg-black/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                onClick={onClose}
            />

            {/* Drawer */}
            <motion.div
                ref={drawerRef}
                drag="y"
                dragConstraints={{ top: 100 }}
                dragElastic={0.08}
                style={{ y }}
                onDragEnd={(_, info) => {
                    if (info.offset.y > 120 || info.velocity.y > 500) {
                        onClose();
                    }
                }}
                initial={{ y: "60%" }}
                animate={{ y: "40%" }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 420, damping: 35 }}
                className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-30
                            rounded-t-3xl bg-zinc-800 shadow-xl
                            md:left-1/2 md:-translate-x-1/2 md:right-auto md:max-w-xl md:w-full"
            >
                {/* Drawer handle */}
                <div className="flex justify-center pb-3">
                    <div className="h-1.5 w-12 rounded-full bg-zinc-500/60" />
                </div>

                <div className="flex flex-col gap-3">
                    {/* Normal actions in their own container */}
                    {normal.length > 0 && (
                        <div className="rounded-xl bg-zinc-700/60 overflow-hidden">
                            {normal.map(action => (
                                <button
                                    key={action.key}
                                    onClick={() => {
                                        action.onPress();
                                        onClose();
                                    }}
                                    className="flex items-center gap-3 
                                               w-full px-4 py-3
                                               text-zinc-100 
                                               hover:bg-zinc-600/40
                                               transition-colors"
                                >
                                    {action.icon && (
                                        <span className="text-lg">{action.icon}</span>
                                    )}
                                    <span className="text-base">{action.label}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Destructive actions in their separate container */}
                    {destructive.length > 0 && (
                        <div className="rounded-xl bg-zinc-700/60 overflow-hidden">
                            {destructive.map(action => (
                                <button
                                    key={action.key}
                                    onClick={() => {
                                        action.onPress();
                                        onClose();
                                    }}
                                    className="flex items-center gap-3 
                                               w-full px-4 py-3
                                               text-red-400
                                               hover:bg-red-500/10
                                               transition-colors"
                                >
                                    {action.icon && (
                                        <span className="text-lg">{action.icon}</span>
                                    )}
                                    <span className="text-base">{action.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </>
    );
});
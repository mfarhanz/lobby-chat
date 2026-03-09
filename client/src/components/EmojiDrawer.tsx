import { memo, Suspense } from "react";
import { motion } from "framer-motion";
import { Spinner } from "./Spinner";
import EmojiPicker from "./EmojiPicker";

interface EmojiDrawerProps {
    onClose: () => void;
    onSelect: (emoji: string) => void;
}

export const EmojiDrawer = memo(function EmojiDrawer({
    onClose,
    onSelect,
}: EmojiDrawerProps) {
    return (
        <Suspense fallback={<Spinner />}>
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
                    drag="y"
                    dragConstraints={{ top: 200 }}
                    dragElastic={0.08}
                    onDragEnd={(_, info) => {
                        if (info.offset.y > 120 || info.velocity.y > 500) {
                            onClose();
                        }
                    }}
                    initial={{ y: "80%" }}
                    animate={{ y: "58.7%" }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", stiffness: 420, damping: 35 }}
                    className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-30 
                                rounded-t-3xl bg-zinc-800 shadow-xl 
                                md:left-1/2 md:-translate-x-1/2 md:right-auto md:max-w-xl md:w-full"
                >
                    {/* drawer handle */}
                    <div className="flex justify-center pb-3">
                        <div className="h-1.5 w-12 rounded-full bg-zinc-500/60" />
                    </div>

                    <div className="flex justify-center">
                        <EmojiPicker onSelect={onSelect} onClose={onClose} navPosition="none" />
                    </div>
                </motion.div>
            </>
        </Suspense>
    );
});
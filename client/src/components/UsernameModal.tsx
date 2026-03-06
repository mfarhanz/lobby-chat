import { useState } from "react";
import { generateUsernameSet } from "../utils/username";
import { ChevronIcon } from "./icons/ChevronIcon";

export function UsernameModal({ onSubmit }: { onSubmit: (name: string) => void }) {
    const [names, setNames] = useState(() => generateUsernameSet());
    const [username, setUsername] = useState<string>("");

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-zinc-800 text-zinc-100 rounded-2xl p-6 w-[80%] sm:max-w-1/2 shadow-lg flex flex-col">
                {/* Title */}
                <h2 className="text-2xl font-semibold mb-4 text-center">Pick a username</h2>

                {/* Username Tiles */}
                <div className="flex flex-wrap gap-2 mb-4 justify-center font-sans">
                    {names.map(n => (
                        <div
                            key={n}
                            className={`cursor-pointer px-3 py-2 rounded-md text-center transition
                                        ${username === n 
                                            ? "bg-zinc-600 font-semibold" 
                                            : "bg-zinc-700 hover:bg-zinc-600"}`}
                            onClick={() => setUsername(n)}
                        >
                            {n}
                        </div>
                    ))}
                </div>

                {/* Editable Username Display */}
                <div className="flex items-center justify-center mb-6 text-zinc-400 font-mono text-lg">
                    <span className="mr-1 mt-2 select-none">
                        <ChevronIcon className="size-5" />
                    </span>
                    <div className="relative h-6 w-75 ">
                        <input
                            value={username ?? ""}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Type or choose a name..."
                            maxLength={30}
                            className="block w-full p-1 text-zinc-100 font-semibold whitespace-nowrap outline-none rounded border border-zinc-600"
                        />
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 mt-auto">
                    <button
                        className="px-4 py-2 rounded-md bg-zinc-700 hover:bg-zinc-600 text-zinc-100 transition cursor-pointer"
                        onClick={() => setNames(generateUsernameSet())}
                    >
                        Reroll
                    </button>
                    <button
                        className={`px-4 py-2 rounded-md text-zinc-100 transition
                                    ${username.trim().length >= 3 
                                        ? "bg-blue-600 hover:bg-blue-500 cursor-pointer" 
                                        : "bg-zinc-600 cursor-not-allowed"}`}
                        disabled={username.trim().length < 3}
                        onClick={() => username && onSubmit(username)}
                    >
                        Join Chat
                    </button>
                </div>
            </div>
        </div>
    );
}
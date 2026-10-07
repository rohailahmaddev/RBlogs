import { useContext } from "react";
import { Data } from "../../context/context";

export function Cover({ post, className = "" }) {
    const { COVER_TONES } = useContext(Data)
    if (post.cover) {
        return (
            <img
                src={post.cover}
                alt="Cover image"
                loading="lazy"
                className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${className}`}
            />
        );
    }
    const tone = COVER_TONES[post.id % COVER_TONES.length];
    return (
        <div
            className={`relative flex h-full w-full flex-col justify-between p-5 transition-transform duration-500 group-hover:scale-105 ${tone} ${className}`}
            aria-hidden="true"
        >
            <div className="space-y-2">
                <div className="h-2 w-24 rounded-full bg-white/40" />
                <div className="h-2 w-16 rounded-full bg-white/25" />
                <div className="h-2 w-10 rounded-full bg-white/15" />
            </div>
            <span className="font-['Newsreader',serif] text-xl font-semibold text-white/90">
                {post.category}
            </span>
        </div>
    );
}

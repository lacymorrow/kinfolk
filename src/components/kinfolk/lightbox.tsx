"use client";

import { useCallback, useEffect } from "react";

interface LightboxPhoto {
	url: string;
	thumbnailUrl?: string | null;
	caption?: string | null;
}

interface LightboxProps {
	photos: LightboxPhoto[];
	index: number;
	onClose: () => void;
	onChange: (index: number) => void;
}

export const Lightbox = ({ photos, index, onClose, onChange }: LightboxProps) => {
	const photo = photos[index];
	if (!photo) return null;

	const hasPrev = index > 0;
	const hasNext = index < photos.length - 1;

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
			if (e.key === "ArrowRight" && hasNext) onChange(index + 1);
			if (e.key === "ArrowLeft" && hasPrev) onChange(index - 1);
		},
		[index, hasPrev, hasNext, onClose, onChange],
	);

	useEffect(() => {
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
			onClick={onClose}
			role="dialog"
			aria-label="Photo lightbox"
		>
			<button
				className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white hover:bg-white/40 disabled:opacity-30"
				disabled={!hasPrev}
				onClick={(e) => {
					e.stopPropagation();
					onChange(index - 1);
				}}
				aria-label="Previous photo"
			>
				&#8592;
			</button>
			<div className="max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
				<img
					src={photo.url}
					alt={photo.caption ?? "Photo"}
					className="max-h-[85vh] max-w-full rounded-lg object-contain"
				/>
				{photo.caption && (
					<p className="mt-2 text-center text-sm text-white">{photo.caption}</p>
				)}
			</div>
			<button
				className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white hover:bg-white/40 disabled:opacity-30"
				disabled={!hasNext}
				onClick={(e) => {
					e.stopPropagation();
					onChange(index + 1);
				}}
				aria-label="Next photo"
			>
				&#8594;
			</button>
			<button
				className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/40"
				onClick={onClose}
				aria-label="Close lightbox"
			>
				&#10005;
			</button>
		</div>
	);
};

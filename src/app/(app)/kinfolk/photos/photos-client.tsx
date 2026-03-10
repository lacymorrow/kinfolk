"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { createPhoto } from "@/server/actions/kinfolk/photos";
import type { Photo, Person } from "@/server/db/schema";

interface PhotosClientProps {
	photos: Photo[];
	familyId: string;
	people: Person[];
}

export const PhotosClient = ({ photos, familyId, people }: PhotosClientProps) => {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [lightbox, setLightbox] = useState<number | null>(null);

	const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSaving(true);
		const fd = new FormData(e.currentTarget);
		try {
			await createPhoto({
				familyId,
				url: fd.get("url") as string,
				caption: (fd.get("caption") as string) || null,
				takenAt: (fd.get("takenAt") as string) || null,
			});
			setOpen(false);
			router.refresh();
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold tracking-tight">Photos</h1>
				<Dialog open={open} onOpenChange={setOpen}>
					<DialogTrigger asChild>
						<Button>Add Photo</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Add Photo</DialogTitle>
						</DialogHeader>
						<form onSubmit={handleUpload} className="space-y-4">
							<div>
								<Label htmlFor="ph-url">Image URL</Label>
								<Input id="ph-url" name="url" type="url" placeholder="https://..." required />
							</div>
							<div>
								<Label htmlFor="ph-caption">Caption</Label>
								<Input id="ph-caption" name="caption" />
							</div>
							<div>
								<Label htmlFor="ph-taken">Date Taken</Label>
								<Input id="ph-taken" name="takenAt" type="date" />
							</div>
							<Button type="submit" disabled={saving} className="w-full">
								{saving ? "Adding..." : "Add Photo"}
							</Button>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			{photos.length === 0 ? (
				<div className="flex min-h-[30vh] items-center justify-center">
					<p className="text-muted-foreground">No photos yet. Add one to get started.</p>
				</div>
			) : (
				<div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
					{photos.map((photo, i) => (
						<button
							key={photo.id}
							type="button"
							className="mb-4 block w-full overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
							onClick={() => setLightbox(i)}
						>
							<img
								src={photo.thumbnailUrl ?? photo.url}
								alt={photo.caption ?? "Family photo"}
								className="w-full rounded-lg object-cover transition-transform hover:scale-105"
								loading="lazy"
							/>
							{photo.caption && (
								<p className="mt-1 text-left text-xs text-muted-foreground truncate">
									{photo.caption}
								</p>
							)}
						</button>
					))}
				</div>
			)}

			{/* Lightbox */}
			{lightbox !== null && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
					onClick={() => setLightbox(null)}
					onKeyDown={(e) => {
						if (e.key === "Escape") setLightbox(null);
						if (e.key === "ArrowRight" && lightbox < photos.length - 1) setLightbox(lightbox + 1);
						if (e.key === "ArrowLeft" && lightbox > 0) setLightbox(lightbox - 1);
					}}
					tabIndex={0}
					role="dialog"
				>
					<button
						className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white hover:bg-white/40 disabled:opacity-30"
						disabled={lightbox === 0}
						onClick={(e) => {
							e.stopPropagation();
							setLightbox(lightbox - 1);
						}}
					>
						&#8592;
					</button>
					<div className="max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
						{(() => {
							const photo = photos[lightbox];
							if (!photo) return null;
							return (
								<>
									<img
										src={photo.url}
										alt={photo.caption ?? "Photo"}
										className="max-h-[85vh] max-w-full rounded-lg object-contain"
									/>
									{photo.caption && (
										<p className="mt-2 text-center text-sm text-white">
											{photo.caption}
										</p>
									)}
								</>
							);
						})()}
					</div>
					<button
						className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white hover:bg-white/40 disabled:opacity-30"
						disabled={lightbox === photos.length - 1}
						onClick={(e) => {
							e.stopPropagation();
							setLightbox(lightbox + 1);
						}}
					>
						&#8594;
					</button>
					<button
						className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/40"
						onClick={() => setLightbox(null)}
					>
						&#10005;
					</button>
				</div>
			)}
		</div>
	);
};

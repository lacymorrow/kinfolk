"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createPost, deletePost, togglePinPost } from "@/server/actions/kinfolk/posts";
import { useRealtimeSubscription, KINFOLK_TABLES } from "@/hooks/use-realtime";
import type { KinfolkPost } from "@/server/db/schema";

interface PostRow {
	post: KinfolkPost;
	author: { id: string; name: string | null; image: string | null } | null;
}

interface FeedClientProps {
	posts: PostRow[];
	familyId: string;
}

export const FeedClient = ({ posts, familyId }: FeedClientProps) => {
	useRealtimeSubscription([KINFOLK_TABLES.kinfolkPost]);

	const router = useRouter();
	const [saving, setSaving] = useState(false);

	const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSaving(true);
		const fd = new FormData(e.currentTarget);
		try {
			await createPost({
				familyId,
				title: (fd.get("title") as string) || null,
				body: fd.get("body") as string,
			});
			e.currentTarget.reset();
			router.refresh();
		} finally {
			setSaving(false);
		}
	};

	const handlePin = async (id: string) => {
		await togglePinPost(id);
		router.refresh();
	};

	const handleDelete = async (id: string) => {
		await deletePost(id);
		router.refresh();
	};

	return (
		<div className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
			<h1 className="mb-6 text-2xl font-bold tracking-tight">Family Feed</h1>

			{/* Create post form */}
			<Card className="mb-8">
				<CardContent className="p-4">
					<form onSubmit={handleCreate} className="space-y-3">
						<Input name="title" placeholder="Title (optional)" />
						<Textarea name="body" placeholder="Share something with the family..." rows={3} required />
						<div className="flex justify-end">
							<Button type="submit" disabled={saving}>
								{saving ? "Posting..." : "Post"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			{/* Posts */}
			{posts.length === 0 ? (
				<div className="flex min-h-[20vh] items-center justify-center">
					<p className="text-muted-foreground">No posts yet. Share something!</p>
				</div>
			) : (
				<div className="space-y-4">
					{posts.map(({ post, author }) => (
						<Card key={post.id}>
							<CardContent className="p-4">
								<div className="mb-2 flex items-center justify-between">
									<div className="flex items-center gap-2">
										{author?.image ? (
											<img
												src={author.image}
												alt={author.name ?? ""}
												className="h-8 w-8 rounded-full object-cover"
											/>
										) : (
											<div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
												{author?.name?.[0] ?? "?"}
											</div>
										)}
										<div>
											<p className="text-sm font-medium">{author?.name ?? "Unknown"}</p>
											<p className="text-xs text-muted-foreground">
												{new Date(post.createdAt).toLocaleDateString()}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-1">
										{post.pinned && <Badge variant="secondary">Pinned</Badge>}
										<Button variant="ghost" size="sm" onClick={() => handlePin(post.id)}>
											{post.pinned ? "Unpin" : "Pin"}
										</Button>
										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button variant="ghost" size="sm" className="text-destructive">
													Delete
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>Delete post?</AlertDialogTitle>
													<AlertDialogDescription>
														This action cannot be undone. This will permanently delete this post.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Cancel</AlertDialogCancel>
													<AlertDialogAction onClick={() => handleDelete(post.id)}>Delete</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</div>
								</div>
								{post.title && (
									<h3 className="mb-1 font-semibold">{post.title}</h3>
								)}
								<p className="whitespace-pre-wrap text-sm">{post.body}</p>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
};

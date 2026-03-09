"use server";

import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import {
	kinfolkPosts,
	users,
	type NewKinfolkPost,
} from "@/server/db/schema";

export async function getPosts(familyId: string) {
	if (!db) return [];
	return db
		.select({
			post: kinfolkPosts,
			author: {
				id: users.id,
				name: users.name,
				image: users.image,
			},
		})
		.from(kinfolkPosts)
		.leftJoin(users, eq(kinfolkPosts.authorId, users.id))
		.where(eq(kinfolkPosts.familyId, familyId))
		.orderBy(desc(kinfolkPosts.pinned), desc(kinfolkPosts.createdAt));
}

export async function getPost(id: string) {
	if (!db) return null;
	const [row] = await db
		.select({
			post: kinfolkPosts,
			author: {
				id: users.id,
				name: users.name,
				image: users.image,
			},
		})
		.from(kinfolkPosts)
		.leftJoin(users, eq(kinfolkPosts.authorId, users.id))
		.where(eq(kinfolkPosts.id, id));
	return row ?? null;
}

export async function createPost(data: Omit<NewKinfolkPost, "id" | "createdAt" | "updatedAt">) {
	if (!db) throw new Error("Database not available");
	const [post] = await db.insert(kinfolkPosts).values(data).returning();
	revalidatePath("/kinfolk/feed");
	return post;
}

export async function updatePost(
	id: string,
	data: Partial<Omit<NewKinfolkPost, "id" | "createdAt" | "updatedAt">>,
) {
	if (!db) throw new Error("Database not available");
	const [post] = await db.update(kinfolkPosts).set(data).where(eq(kinfolkPosts.id, id)).returning();
	revalidatePath("/kinfolk/feed");
	return post;
}

export async function deletePost(id: string) {
	if (!db) throw new Error("Database not available");
	await db.delete(kinfolkPosts).where(eq(kinfolkPosts.id, id));
	revalidatePath("/kinfolk/feed");
}

export async function togglePinPost(id: string) {
	if (!db) throw new Error("Database not available");
	const [existing] = await db.select().from(kinfolkPosts).where(eq(kinfolkPosts.id, id));
	if (!existing) throw new Error("Post not found");
	const [post] = await db
		.update(kinfolkPosts)
		.set({ pinned: !existing.pinned })
		.where(eq(kinfolkPosts.id, id))
		.returning();
	revalidatePath("/kinfolk/feed");
	return post;
}

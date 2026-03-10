"use server";

import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import {
	photos,
	photoTags,
	people,
	type NewPhoto,
	type NewPhotoTag,
} from "@/server/db/schema";
import { requireFamilyAccess, requireAuth } from "./auth";

export async function getPhotos(familyId: string) {
	if (!db) return [];
	await requireFamilyAccess(familyId);
	return db
		.select()
		.from(photos)
		.where(eq(photos.familyId, familyId))
		.orderBy(desc(photos.createdAt));
}

export async function getPhotosByPerson(personId: string) {
	if (!db) return [];
	await requireAuth();
	const tags = await db
		.select({ photo: photos })
		.from(photoTags)
		.innerJoin(photos, eq(photoTags.photoId, photos.id))
		.where(eq(photoTags.personId, personId))
		.orderBy(desc(photos.createdAt));
	return tags.map((t) => t.photo);
}

export async function getPhotosByEvent(eventId: string) {
	if (!db) return [];
	await requireAuth();
	const tags = await db
		.select({ photo: photos })
		.from(photoTags)
		.innerJoin(photos, eq(photoTags.photoId, photos.id))
		.where(eq(photoTags.eventId, eventId))
		.orderBy(desc(photos.createdAt));
	return tags.map((t) => t.photo);
}

export async function getPhotoWithTags(id: string) {
	if (!db) return null;
	await requireAuth();
	const [photo] = await db.select().from(photos).where(eq(photos.id, id));
	if (!photo) return null;

	const tags = await db
		.select({
			tag: photoTags,
			person: people,
		})
		.from(photoTags)
		.leftJoin(people, eq(photoTags.personId, people.id))
		.where(eq(photoTags.photoId, id));

	return { ...photo, tags };
}

export async function createPhoto(data: Omit<NewPhoto, "id" | "createdAt">) {
	if (!db) throw new Error("Database not available");
	await requireFamilyAccess(data.familyId);
	const [photo] = await db.insert(photos).values(data).returning();
	revalidatePath("/kinfolk/photos");
	return photo;
}

export async function deletePhoto(id: string) {
	if (!db) throw new Error("Database not available");
	await requireAuth();
	// Verify the photo exists and user has access
	const [photo] = await db.select().from(photos).where(eq(photos.id, id));
	if (!photo) throw new Error("Photo not found");
	await requireFamilyAccess(photo.familyId);
	await db.delete(photos).where(eq(photos.id, id));
	revalidatePath("/kinfolk/photos");
}

export async function addPhotoTag(data: Omit<NewPhotoTag, "id">) {
	if (!db) throw new Error("Database not available");
	await requireAuth();
	const [tag] = await db.insert(photoTags).values(data).returning();
	revalidatePath("/kinfolk/photos");
	return tag;
}

export async function removePhotoTag(id: string) {
	if (!db) throw new Error("Database not available");
	await requireAuth();
	await db.delete(photoTags).where(eq(photoTags.id, id));
	revalidatePath("/kinfolk/photos");
}

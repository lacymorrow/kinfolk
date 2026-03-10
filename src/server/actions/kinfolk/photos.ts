"use server";

import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import {
	photos,
	photoTags,
	people,
	kinfolkEvents,
	type NewPhoto,
	type NewPhotoTag,
} from "@/server/db/schema";

export async function getPhotos(familyId: string) {
	if (!db) return [];
	return db
		.select()
		.from(photos)
		.where(eq(photos.familyId, familyId))
		.orderBy(desc(photos.createdAt));
}

export async function getPhotosByPerson(personId: string) {
	if (!db) return [];
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
	const [photo] = await db.insert(photos).values(data).returning();
	revalidatePath("/kinfolk/photos");
	return photo;
}

export async function deletePhoto(id: string) {
	if (!db) throw new Error("Database not available");
	await db.delete(photos).where(eq(photos.id, id));
	revalidatePath("/kinfolk/photos");
}

export async function addPhotoTag(data: Omit<NewPhotoTag, "id">) {
	if (!db) throw new Error("Database not available");
	const [tag] = await db.insert(photoTags).values(data).returning();
	revalidatePath("/kinfolk/photos");
	return tag;
}

export async function removePhotoTag(id: string) {
	if (!db) throw new Error("Database not available");
	await db.delete(photoTags).where(eq(photoTags.id, id));
	revalidatePath("/kinfolk/photos");
}

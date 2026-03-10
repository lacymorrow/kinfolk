"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { people } from "@/server/db/schema";

export async function claimProfile(personId: string, userId: string) {
	if (!db) throw new Error("Database not available");

	// Verify the person isn't already claimed
	const [person] = await db.select().from(people).where(eq(people.id, personId));
	if (!person) throw new Error("Person not found");
	if (person.userId) throw new Error("This person is already claimed");

	await db.update(people).set({ userId }).where(eq(people.id, personId));
	revalidatePath("/kinfolk/profile");
	revalidatePath("/kinfolk");
}

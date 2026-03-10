"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { people } from "@/server/db/schema";

export async function claimProfile(personId: string) {
	if (!db) throw new Error("Database not available");

	const session = await auth();
	if (!session?.user?.id) throw new Error("Unauthorized");
	const userId = session.user.id;

	// Verify the person exists and isn't already claimed
	const [person] = await db.select().from(people).where(eq(people.id, personId));
	if (!person) throw new Error("Person not found");
	if (person.userId) throw new Error("This person is already claimed");

	await db.update(people).set({ userId }).where(eq(people.id, personId));
	revalidatePath("/kinfolk/profile");
	revalidatePath("/kinfolk");
}

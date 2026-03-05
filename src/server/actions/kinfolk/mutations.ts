"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import {
	families,
	people,
	contacts,
	addresses,
	relationships,
	type NewPerson,
	type NewContact,
	type NewAddress,
	type NewRelationship,
} from "@/server/db/schema";

export async function createFamily(name: string) {
	if (!db) throw new Error("Database not available");
	const [family] = await db.insert(families).values({ name }).returning();
	revalidatePath("/kinfolk");
	return family;
}

export async function createPerson(data: Omit<NewPerson, "id" | "createdAt" | "updatedAt">) {
	if (!db) throw new Error("Database not available");
	const [person] = await db.insert(people).values(data).returning();
	revalidatePath("/kinfolk");
	return person;
}

export async function updatePerson(
	id: string,
	data: Partial<Omit<NewPerson, "id" | "createdAt" | "updatedAt">>,
) {
	if (!db) throw new Error("Database not available");
	const [person] = await db.update(people).set(data).where(eq(people.id, id)).returning();
	revalidatePath("/kinfolk");
	revalidatePath(`/kinfolk/person/${id}`);
	return person;
}

export async function deletePerson(id: string) {
	if (!db) throw new Error("Database not available");
	await db.delete(people).where(eq(people.id, id));
	revalidatePath("/kinfolk");
}

export async function createContact(data: Omit<NewContact, "id" | "createdAt">) {
	if (!db) throw new Error("Database not available");
	const [contact] = await db.insert(contacts).values(data).returning();
	revalidatePath("/kinfolk");
	return contact;
}

export async function deleteContact(id: string) {
	if (!db) throw new Error("Database not available");
	await db.delete(contacts).where(eq(contacts.id, id));
	revalidatePath("/kinfolk");
}

export async function createAddress(data: Omit<NewAddress, "id" | "createdAt">) {
	if (!db) throw new Error("Database not available");
	const [address] = await db.insert(addresses).values(data).returning();
	revalidatePath("/kinfolk");
	return address;
}

export async function deleteAddress(id: string) {
	if (!db) throw new Error("Database not available");
	await db.delete(addresses).where(eq(addresses.id, id));
	revalidatePath("/kinfolk");
}

export async function createRelationship(data: Omit<NewRelationship, "id" | "createdAt">) {
	if (!db) throw new Error("Database not available");

	// Create both directions
	const [rel] = await db.insert(relationships).values(data).returning();

	const inverseType =
		data.type === "parent"
			? "child"
			: data.type === "child"
				? "parent"
				: data.type;

	await db.insert(relationships).values({
		personId: data.relatedId,
		relatedId: data.personId,
		type: inverseType,
	});

	revalidatePath("/kinfolk");
	return rel;
}

export async function deleteRelationship(id: string) {
	if (!db) throw new Error("Database not available");
	// Get the relationship to find and delete the inverse
	const [rel] = await db.select().from(relationships).where(eq(relationships.id, id));
	if (rel) {
		// Delete both directions
		await db.delete(relationships).where(eq(relationships.id, id));

		const inverseType =
			rel.type === "parent"
				? "child"
				: rel.type === "child"
					? "parent"
					: rel.type;

		// Find and delete the inverse
		const inverseRels = await db
			.select()
			.from(relationships)
			.where(eq(relationships.personId, rel.relatedId));

		for (const inv of inverseRels) {
			if (inv.relatedId === rel.personId && inv.type === inverseType) {
				await db.delete(relationships).where(eq(relationships.id, inv.id));
				break;
			}
		}
	}
	revalidatePath("/kinfolk");
}

export async function updatePersonForm(formData: FormData) {
	if (!db) throw new Error("Database not available");

	const id = formData.get("id") as string;
	const data = {
		firstName: formData.get("firstName") as string,
		middleName: (formData.get("middleName") as string) || null,
		lastName: formData.get("lastName") as string,
		maidenName: (formData.get("maidenName") as string) || null,
		nickname: (formData.get("nickname") as string) || null,
		birthdate: (formData.get("birthdate") as string) || null,
		deathdate: (formData.get("deathdate") as string) || null,
		gender: (formData.get("gender") as string) || null,
		bio: (formData.get("bio") as string) || null,
	};

	const [person] = await db.update(people).set(data).where(eq(people.id, id)).returning();

	revalidatePath("/kinfolk");
	revalidatePath(`/kinfolk/person/${id}`);
	return person;
}

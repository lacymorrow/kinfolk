"use server";

import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import {
	kinfolkEvents,
	eventPeople,
	people,
	type NewKinfolkEvent,
	type NewEventPerson,
} from "@/server/db/schema";
import { requireFamilyAccess, requireAuth } from "./auth";

export async function getEvents(familyId: string, type?: string) {
	if (!db) return [];
	await requireFamilyAccess(familyId);
	const conditions = [eq(kinfolkEvents.familyId, familyId)];
	if (type) conditions.push(eq(kinfolkEvents.type, type));
	return db
		.select()
		.from(kinfolkEvents)
		.where(and(...conditions))
		.orderBy(desc(kinfolkEvents.date));
}

export async function getEvent(id: string) {
	if (!db) return null;
	await requireAuth();
	const [event] = await db.select().from(kinfolkEvents).where(eq(kinfolkEvents.id, id));
	return event ?? null;
}

export async function getEventWithPeople(id: string) {
	if (!db) return null;
	await requireAuth();
	const [event] = await db.select().from(kinfolkEvents).where(eq(kinfolkEvents.id, id));
	if (!event) return null;

	await requireFamilyAccess(event.familyId);

	const linked = await db
		.select({ eventPerson: eventPeople, person: people })
		.from(eventPeople)
		.innerJoin(people, eq(eventPeople.personId, people.id))
		.where(eq(eventPeople.eventId, id));

	return { ...event, people: linked };
}

export async function createEvent(data: Omit<NewKinfolkEvent, "id" | "createdAt">) {
	if (!db) throw new Error("Database not available");
	await requireFamilyAccess(data.familyId);
	const [event] = await db.insert(kinfolkEvents).values(data).returning();
	revalidatePath("/kinfolk/events");
	return event;
}

export async function updateEvent(
	id: string,
	data: Partial<Omit<NewKinfolkEvent, "id" | "createdAt">>,
) {
	if (!db) throw new Error("Database not available");
	await requireAuth();
	const [existing] = await db.select().from(kinfolkEvents).where(eq(kinfolkEvents.id, id));
	if (!existing) throw new Error("Event not found");
	await requireFamilyAccess(existing.familyId);
	const [event] = await db.update(kinfolkEvents).set(data).where(eq(kinfolkEvents.id, id)).returning();
	revalidatePath("/kinfolk/events");
	revalidatePath(`/kinfolk/events/${id}`);
	return event;
}

export async function deleteEvent(id: string) {
	if (!db) throw new Error("Database not available");
	await requireAuth();
	const [existing] = await db.select().from(kinfolkEvents).where(eq(kinfolkEvents.id, id));
	if (!existing) throw new Error("Event not found");
	await requireFamilyAccess(existing.familyId);
	await db.delete(kinfolkEvents).where(eq(kinfolkEvents.id, id));
	revalidatePath("/kinfolk/events");
}

export async function addEventPerson(data: Omit<NewEventPerson, "id">) {
	if (!db) throw new Error("Database not available");
	await requireAuth();
	const [ep] = await db.insert(eventPeople).values(data).returning();
	revalidatePath(`/kinfolk/events/${data.eventId}`);
	return ep;
}

export async function removeEventPerson(id: string, eventId: string) {
	if (!db) throw new Error("Database not available");
	await requireAuth();
	await db.delete(eventPeople).where(eq(eventPeople.id, id));
	revalidatePath(`/kinfolk/events/${eventId}`);
}

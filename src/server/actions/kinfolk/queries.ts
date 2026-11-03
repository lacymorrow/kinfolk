"use server";

import { eq, ilike, or, and, sql, count, desc, asc } from "drizzle-orm";
import { db } from "@/server/db";
import {
	families,
	people,
	contacts,
	addresses,
	relationships,
	type Person,
	type Contact,
	type Address,
	type Relationship,
} from "@/server/db/schema";
import { requireFamilyAccess, requireAuth } from "./auth";

// Wrap a read against the database so connection failures (e.g. paused Supabase
// tenant, network blip) degrade to an empty/default value instead of throwing a
// 500. The kinfolk error boundary handles unexpected throws beyond this.
//
// `NoInfer` on the fallback is load-bearing: T is inferred from `fn` alone, so
// the row types survive the wrapper. Inferring from both arguments made every
// `safeRead(null, ...)` caller widen T to `any`, which erased the query types
// and left the consuming pages full of implicit-`any` callbacks (LAC-6511).
async function safeRead<T>(fallback: NoInfer<T>, fn: () => Promise<T>): Promise<T> {
	if (!db) return fallback;
	try {
		return await fn();
	} catch (error) {
		console.error("[kinfolk] database read failed:", error);
		return fallback;
	}
}

export async function getFamilies() {
	return safeRead([], () => db!.select().from(families));
}

export async function getFamily(id: string) {
	return safeRead(null, async () => {
		const [family] = await db!.select().from(families).where(eq(families.id, id));
		return family ?? null;
	});
}

export async function getPeople(familyId?: string) {
	return safeRead([], () => {
		const query = db!
			.select()
			.from(people)
			.leftJoin(addresses, eq(addresses.personId, people.id))
			.orderBy(asc(people.lastName), asc(people.firstName));

		if (familyId) {
			return query.where(eq(people.familyId, familyId));
		}
		return query;
	});
}

export async function searchPeople(query: string) {
	return safeRead([], () => {
		const pattern = `%${query}%`;
		return db!
			.select()
			.from(people)
			.leftJoin(addresses, eq(addresses.personId, people.id))
			.where(
				or(
					ilike(people.firstName, pattern),
					ilike(people.lastName, pattern),
					ilike(people.nickname, pattern),
					ilike(people.maidenName, pattern),
				),
			)
			.orderBy(asc(people.lastName), asc(people.firstName));
	});
}

export async function getPerson(id: string) {
	return safeRead(null, async () => {
		const [person] = await db!.select().from(people).where(eq(people.id, id));
		return person ?? null;
	});
}

export async function getPersonWithDetails(id: string) {
	return safeRead(null, async () => {
		const [person] = await db!.select().from(people).where(eq(people.id, id));
		if (!person) return null;

		const personContacts = await db!
			.select()
			.from(contacts)
			.where(eq(contacts.personId, id));

		const personAddresses = await db!
			.select()
			.from(addresses)
			.where(eq(addresses.personId, id));

		const personRelationships = await db!
			.select({
				relationship: relationships,
				relatedPerson: people,
			})
			.from(relationships)
			.innerJoin(people, eq(relationships.relatedId, people.id))
			.where(eq(relationships.personId, id));

		return {
			...person,
			contacts: personContacts,
			addresses: personAddresses,
			relationships: personRelationships,
		};
	});
}

export async function getRelationshipsForPerson(personId: string) {
	return safeRead([], () =>
		db!
			.select({
				relationship: relationships,
				relatedPerson: people,
			})
			.from(relationships)
			.innerJoin(people, eq(relationships.relatedId, people.id))
			.where(eq(relationships.personId, personId)),
	);
}

export async function getAllPeopleWithRelationships(familyId?: string) {
	return safeRead({ people: [] as Person[], relationships: [] as Relationship[] }, async () => {
		const peopleQuery = familyId
			? db!.select().from(people).where(eq(people.familyId, familyId))
			: db!.select().from(people);

		const allPeople = await peopleQuery;
		const allRelationships = await db!.select().from(relationships);

		return { people: allPeople, relationships: allRelationships };
	});
}

export async function getFirstFamily() {
	return safeRead(null, async () => {
		const [family] = await db!.select().from(families).limit(1);
		return family ?? null;
	});
}

export async function getPersonByUserId(userId: string) {
	if (!db) return null;
	await requireAuth();
	return safeRead(null, async () => {
		const [person] = await db!.select().from(people).where(eq(people.userId, userId));
		return person ?? null;
	});
}

export async function getUnlinkedPeople(familyId?: string) {
	if (!db) return [];
	await requireAuth();
	if (familyId) await requireFamilyAccess(familyId);
	return safeRead([], () =>
		db!
			.select()
			.from(people)
			.where(
				familyId
					? and(eq(people.familyId, familyId), sql`${people.userId} IS NULL`)
					: sql`${people.userId} IS NULL`,
			)
			.orderBy(asc(people.lastName), asc(people.firstName)),
	);
}

// ---------------------------------------------------------------------------
// Regression guard (LAC-6511)
// ---------------------------------------------------------------------------
// `safeRead<any>(null, ...)` once erased the return type of every read that can
// resolve to `null`, and the damage only surfaced three files away as
// implicit-`any` callbacks in the person page. These are compile-time only
// (erased at build) and fail `bun run typecheck` the moment a read goes `any`
// again, next to the wrapper that would cause it rather than at a consumer.
type IsAny<T> = 0 extends 1 & T ? true : false;
type Expect<T extends true> = T;
type NotAny<T> = IsAny<T> extends false ? true : false;

type _PersonWithDetailsIsTyped = Expect<
	NotAny<NonNullable<Awaited<ReturnType<typeof getPersonWithDetails>>>["addresses"]>
>;
type _PersonIsTyped = Expect<NotAny<Awaited<ReturnType<typeof getPerson>>>>;
type _FamilyIsTyped = Expect<NotAny<Awaited<ReturnType<typeof getFirstFamily>>>>;

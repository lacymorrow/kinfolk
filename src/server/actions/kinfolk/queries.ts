"use server";

import { eq, ilike, or, sql, count, desc, asc } from "drizzle-orm";
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

export async function getFamilies() {
	if (!db) return [];
	return db.select().from(families);
}

export async function getFamily(id: string) {
	if (!db) return null;
	const [family] = await db.select().from(families).where(eq(families.id, id));
	return family ?? null;
}

export async function getPeople(familyId?: string) {
	if (!db) return [];
	const query = db
		.select()
		.from(people)
		.leftJoin(addresses, eq(addresses.personId, people.id))
		.orderBy(asc(people.lastName), asc(people.firstName));

	if (familyId) {
		return query.where(eq(people.familyId, familyId));
	}
	return query;
}

export async function searchPeople(query: string) {
	if (!db) return [];
	const pattern = `%${query}%`;
	return db
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
}

export async function getPerson(id: string) {
	if (!db) return null;
	const [person] = await db.select().from(people).where(eq(people.id, id));
	return person ?? null;
}

export async function getPersonWithDetails(id: string) {
	if (!db) return null;

	const [person] = await db.select().from(people).where(eq(people.id, id));
	if (!person) return null;

	const personContacts = await db
		.select()
		.from(contacts)
		.where(eq(contacts.personId, id));

	const personAddresses = await db
		.select()
		.from(addresses)
		.where(eq(addresses.personId, id));

	const personRelationships = await db
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
}

export async function getRelationshipsForPerson(personId: string) {
	if (!db) return [];
	return db
		.select({
			relationship: relationships,
			relatedPerson: people,
		})
		.from(relationships)
		.innerJoin(people, eq(relationships.relatedId, people.id))
		.where(eq(relationships.personId, personId));
}

export async function getAllPeopleWithRelationships(familyId?: string) {
	if (!db) return { people: [], relationships: [] };

	const peopleQuery = familyId
		? db.select().from(people).where(eq(people.familyId, familyId))
		: db.select().from(people);

	const allPeople = await peopleQuery;

	const allRelationships = await db.select().from(relationships);

	return { people: allPeople, relationships: allRelationships };
}

export async function getFirstFamily() {
	if (!db) return null;
	const [family] = await db.select().from(families).limit(1);
	return family ?? null;
}

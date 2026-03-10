"use server";

import { eq, asc, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { people, contacts, addresses } from "@/server/db/schema";
import { requireFamilyAccess } from "./auth";

interface ExportPerson {
	firstName: string;
	lastName: string;
	middleName: string | null;
	maidenName: string | null;
	nickname: string | null;
	birthdate: string | null;
	email: string | null;
	phone: string | null;
	street1: string | null;
	street2: string | null;
	city: string | null;
	state: string | null;
	zip: string | null;
	country: string | null;
}

async function getExportData(familyId: string): Promise<ExportPerson[]> {
	if (!db) return [];

	// Auth check
	await requireFamilyAccess(familyId);

	const rows = await db
		.select()
		.from(people)
		.where(eq(people.familyId, familyId))
		.orderBy(asc(people.lastName), asc(people.firstName));

	if (rows.length === 0) return [];

	// Batch-fetch all contacts and addresses for this family (fixes N+1)
	const personIds = rows.map((p) => p.id);

	const allContacts = await db
		.select()
		.from(contacts)
		.where(inArray(contacts.personId, personIds));

	const allAddresses = await db
		.select()
		.from(addresses)
		.where(inArray(addresses.personId, personIds));

	// Index by personId
	const contactsByPerson = new Map<string, typeof allContacts>();
	for (const c of allContacts) {
		const list = contactsByPerson.get(c.personId) ?? [];
		list.push(c);
		contactsByPerson.set(c.personId, list);
	}

	const addressesByPerson = new Map<string, typeof allAddresses>();
	for (const a of allAddresses) {
		const list = addressesByPerson.get(a.personId) ?? [];
		list.push(a);
		addressesByPerson.set(a.personId, list);
	}

	return rows.map((person) => {
		const personContacts = contactsByPerson.get(person.id) ?? [];
		const personAddresses = addressesByPerson.get(person.id) ?? [];

		const primaryEmail =
			personContacts.find((c) => c.type === "email" && c.isPrimary) ??
			personContacts.find((c) => c.type === "email");
		const primaryPhone =
			personContacts.find((c) => c.type === "phone" && c.isPrimary) ??
			personContacts.find((c) => c.type === "phone");
		const primaryAddress =
			personAddresses.find((a) => a.isPrimary) ?? personAddresses[0];

		return {
			firstName: person.firstName,
			lastName: person.lastName,
			middleName: person.middleName,
			maidenName: person.maidenName,
			nickname: person.nickname,
			birthdate: person.birthdate,
			email: primaryEmail?.value ?? null,
			phone: primaryPhone?.value ?? null,
			street1: primaryAddress?.street1 ?? null,
			street2: primaryAddress?.street2 ?? null,
			city: primaryAddress?.city ?? null,
			state: primaryAddress?.state ?? null,
			zip: primaryAddress?.zip ?? null,
			country: primaryAddress?.country ?? null,
		};
	});
}

function escapeVCardValue(value: string): string {
	return value.replace(/[\\;,]/g, (match) => `\\${match}`);
}

export async function exportVCard(familyId: string): Promise<string> {
	const data = await getExportData(familyId);
	const cards: string[] = [];

	for (const p of data) {
		const lines: string[] = [
			"BEGIN:VCARD",
			"VERSION:3.0",
			`N:${escapeVCardValue(p.lastName)};${escapeVCardValue(p.firstName)};${escapeVCardValue(p.middleName ?? "")};;`,
			`FN:${escapeVCardValue(p.firstName)} ${escapeVCardValue(p.lastName)}`,
		];

		if (p.nickname) {
			lines.push(`NICKNAME:${escapeVCardValue(p.nickname)}`);
		}

		if (p.email) {
			lines.push(`EMAIL;TYPE=INTERNET:${p.email}`);
		}

		if (p.phone) {
			lines.push(`TEL;TYPE=CELL:${p.phone}`);
		}

		if (p.street1) {
			const street = [p.street1, p.street2].filter(Boolean).join(", ");
			lines.push(
				`ADR;TYPE=HOME:;;${escapeVCardValue(street)};${escapeVCardValue(p.city ?? "")};${escapeVCardValue(p.state ?? "")};${escapeVCardValue(p.zip ?? "")};${escapeVCardValue(p.country ?? "")}`,
			);
		}

		if (p.birthdate) {
			lines.push(`BDAY:${p.birthdate.replace(/-/g, "")}`);
		}

		lines.push("END:VCARD");
		cards.push(lines.join("\r\n"));
	}

	return cards.join("\r\n");
}

function escapeCsvField(value: string): string {
	if (value.includes(",") || value.includes('"') || value.includes("\n")) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

export async function exportCSV(familyId: string): Promise<string> {
	const data = await getExportData(familyId);

	const header = "name,email,phone,address,birthday,relationship";
	const rows = data.map((p) => {
		const name = [p.firstName, p.middleName, p.lastName]
			.filter(Boolean)
			.join(" ");
		const addressParts = [p.street1, p.street2, p.city, p.state, p.zip, p.country].filter(Boolean);
		const address = addressParts.join(", ");
		return [
			escapeCsvField(name),
			escapeCsvField(p.email ?? ""),
			escapeCsvField(p.phone ?? ""),
			escapeCsvField(address),
			escapeCsvField(p.birthdate ?? ""),
			"",
		].join(",");
	});

	return [header, ...rows].join("\r\n");
}

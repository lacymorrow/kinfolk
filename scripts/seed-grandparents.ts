/**
 * Seed grandparents generation + sibling relationships
 *
 * Grandparents: Thomas Lacy Morrow II & Granny Dock
 * Their children (siblings): Tom, John, Alice, Paul, Lynn
 *
 * Tom and John should already exist in the DB.
 * This script:
 * 1. Creates the grandparents (if not exist)
 * 2. Creates Alice, Paul, Lynn (if not exist)
 * 3. Creates spouse relationship between grandparents
 * 4. Creates parent relationships from grandparents to all 5 children
 * 5. Creates sibling relationships between all 5 children
 */

import { eq, and, or, ilike } from "drizzle-orm";
import { db } from "@/server/db";
import { families, people, relationships } from "@/server/db/schema";

async function main() {
	if (!db) {
		console.error("Database not available");
		process.exit(1);
	}

	console.log("🌱 Seeding grandparents generation...");

	// Get the family
	const allFamilies = await db.select().from(families);
	const family = allFamilies[0];
	if (!family) {
		console.error("No family found. Run initial seed first.");
		process.exit(1);
	}
	console.log(`  Family: ${family.name} (${family.id})`);

	// Helper: find person by name
	async function findPerson(firstName: string, lastName: string) {
		const [person] = await db!
			.select()
			.from(people)
			.where(
				and(
					ilike(people.firstName, firstName),
					ilike(people.lastName, lastName),
				),
			);
		return person ?? null;
	}

	// Helper: create person if not exists
	async function ensurePerson(data: {
		firstName: string;
		lastName: string;
		middleName?: string;
		nickname?: string;
		gender?: string;
		isAlive?: boolean;
	}) {
		const existing = await findPerson(data.firstName, data.lastName);
		if (existing) {
			console.log(`  ✓ ${data.firstName} ${data.lastName} already exists (${existing.id})`);
			return existing;
		}

		const [person] = await db!
			.insert(people)
			.values({
				familyId: family.id,
				firstName: data.firstName,
				lastName: data.lastName,
				middleName: data.middleName ?? null,
				nickname: data.nickname ?? null,
				gender: data.gender ?? null,
				isAlive: data.isAlive ?? true,
			})
			.returning();

		console.log(`  + Created ${data.firstName} ${data.lastName} (${person!.id})`);
		return person!;
	}

	// Helper: create relationship if not exists
	async function ensureRelationship(
		personId: string,
		relatedId: string,
		type: string,
	) {
		const [existing] = await db!
			.select()
			.from(relationships)
			.where(
				and(
					eq(relationships.personId, personId),
					eq(relationships.relatedId, relatedId),
					eq(relationships.type, type),
				),
			);

		if (existing) return existing;

		const [rel] = await db!
			.insert(relationships)
			.values({ personId, relatedId, type })
			.returning();

		return rel!;
	}

	// --- Create Grandparents ---
	const granddad = await ensurePerson({
		firstName: "Thomas",
		lastName: "Morrow",
		middleName: "Lacy",
		nickname: "Thomas Lacy Morrow II",
		gender: "male",
		isAlive: false,
	});

	const granny = await ensurePerson({
		firstName: "Dock",
		lastName: "Morrow",
		nickname: "Granny Dock",
		gender: "female",
		isAlive: false,
	});

	// --- Create/find all 5 children ---
	const tom = await ensurePerson({
		firstName: "Tom",
		lastName: "Morrow",
		gender: "male",
	});

	const john = await ensurePerson({
		firstName: "John",
		lastName: "Morrow",
		gender: "male",
	});

	const alice = await ensurePerson({
		firstName: "Alice",
		lastName: "Morrow",
		gender: "female",
	});

	const paul = await ensurePerson({
		firstName: "Paul",
		lastName: "Morrow",
		gender: "male",
	});

	const lynn = await ensurePerson({
		firstName: "Lynn",
		lastName: "Morrow",
		gender: "female",
	});

	const children = [tom, john, alice, paul, lynn];

	// --- Relationships ---

	// Spouse: grandparents
	console.log("\n  Creating relationships...");
	await ensureRelationship(granddad.id, granny.id, "spouse");
	await ensureRelationship(granny.id, granddad.id, "spouse");
	console.log("  ✓ Thomas & Dock = spouse");

	// Parent relationships: each grandparent → each child
	for (const child of children) {
		await ensureRelationship(granddad.id, child.id, "parent");
		await ensureRelationship(granny.id, child.id, "parent");
		console.log(`  ✓ Thomas & Dock → parent of ${child.firstName}`);
	}

	// Sibling relationships: all pairs
	for (let i = 0; i < children.length; i++) {
		for (let j = i + 1; j < children.length; j++) {
			await ensureRelationship(children[i]!.id, children[j]!.id, "sibling");
			await ensureRelationship(children[j]!.id, children[i]!.id, "sibling");
		}
	}
	console.log("  ✓ All 5 siblings linked");

	console.log("\n✅ Grandparents generation seeded successfully!");
	console.log("   Tree: Thomas Lacy Morrow II & Granny Dock");
	console.log("   Children: Tom, John, Alice, Paul, Lynn");
}

main()
	.then(() => process.exit(0))
	.catch((e) => {
		console.error("❌ Seed failed:", e);
		process.exit(1);
	});

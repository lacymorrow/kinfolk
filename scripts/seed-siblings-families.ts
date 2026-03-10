/**
 * Seed families for Paul, Lynn, and Alice (siblings of Tom & John)
 *
 * Paul Morrow & Penny (wife)
 *   - Taylor Morrow (son) — already in DB
 *   - Lucas Morrow (son) — already in DB
 *
 * Lynn (née Morrow) & Billy Perrin (late husband, deceased)
 *   - Shannon Perrin (daughter) — NEW
 *   - Christie (Kristie Parker in DB) — already in DB
 *
 * Alice (née Morrow) & Jim Dean (husband)
 *   - Lacy (Lacy Lawrence in DB) — already in DB
 *   - Liza (Liza Stevens in DB) — already in DB
 */

import { eq, and, ilike } from "drizzle-orm";
import { db } from "@/server/db";
import * as schema from "../src/server/db/schema";

async function findPerson(firstName: string, lastName: string) {
	if (!db) throw new Error("Database not available");
	const [person] = await db
		.select()
		.from(schema.people)
		.where(
			and(
				ilike(schema.people.firstName, firstName),
				ilike(schema.people.lastName, lastName),
			),
		);
	return person ?? null;
}

async function findPersonLoose(firstName: string) {
	if (!db) throw new Error("Database not available");
	const results = await db
		.select()
		.from(schema.people)
		.where(ilike(schema.people.firstName, firstName));
	return results;
}

/** Find or create a person, returning the record either way. */
async function ensurePerson(
	familyId: string,
	firstName: string,
	lastName: string,
	opts: { gender?: string; isAlive?: boolean } = {},
) {
	if (!db) throw new Error("Database not available");
	const existing = await findPerson(firstName, lastName);
	if (existing) {
		console.log(`  ✓ ${firstName} ${lastName} exists (${existing.id})`);
		return existing;
	}

	const [created] = await db
		.insert(schema.people)
		.values({
			familyId,
			firstName,
			lastName,
			gender: opts.gender ?? null,
			isAlive: opts.isAlive ?? true,
		})
		.returning();

	console.log(`  + Created ${firstName} ${lastName} (${created!.id})`);
	return created!;
}

async function ensureRelationship(
	personId: string,
	relatedId: string,
	type: string,
) {
	if (!db) throw new Error("Database not available");
	const [existing] = await db
		.select()
		.from(schema.relationships)
		.where(
			and(
				eq(schema.relationships.personId, personId),
				eq(schema.relationships.relatedId, relatedId),
				eq(schema.relationships.type, type),
			),
		);

	if (existing) return existing;

	const [rel] = await db
		.insert(schema.relationships)
		.values({ personId, relatedId, type })
		.returning();

	return rel!;
}

async function main() {
	if (!db) {
		console.error("Database not available");
		process.exit(1);
	}

	console.log("🌱 Seeding Paul, Lynn, and Alice families...\n");

	// Get family
	const allFamilies = await db.select().from(schema.families);
	const family = allFamilies[0];
	if (!family) {
		console.error("No family found. Run initial seed first.");
		process.exit(1);
	}

	// --- Find existing people ---
	const paul = await findPerson("Paul", "Morrow");
	const lynn = await findPerson("Lynn", "Morrow");
	const alice = await findPerson("Alice", "Morrow");
	const taylor = await findPerson("Taylor", "Morrow");
	const lucas = await findPerson("Lucas", "Morrow");
	const kristie = await findPerson("Kristie", "Parker");
	const lacyL = await findPerson("Lacy", "Lawrence");
	const liza = await findPerson("Liza", "Stevens");

	if (!paul || !lynn || !alice) {
		console.error("Missing siblings. Run seed-grandparents.ts first.");
		console.log("  Paul:", paul?.id ?? "MISSING");
		console.log("  Lynn:", lynn?.id ?? "MISSING");
		console.log("  Alice:", alice?.id ?? "MISSING");
		process.exit(1);
	}

	console.log("Found siblings:");
	console.log(`  Paul: ${paul.id}`);
	console.log(`  Lynn: ${lynn.id}`);
	console.log(`  Alice: ${alice.id}`);

	// --- Create new people ---
	const penny = await ensurePerson(family.id, "Penny", "Morrow", { gender: "female" });
	const billy = await ensurePerson(family.id, "Billy", "Perrin", { gender: "male", isAlive: false });
	const jim = await ensurePerson(family.id, "Jim", "Dean", { gender: "male" });
	const shannon = await ensurePerson(family.id, "Shannon", "Perrin", { gender: "female" });

	// --- Update Lynn's maiden name if not set ---
	// Lynn married into Perrin but in DB she's Lynn Morrow (maiden)
	// We can add maidenName = Morrow, but keep lastName as Morrow since that's her family identity

	// --- RELATIONSHIPS ---

	console.log("\n  Creating relationships...");

	// === PAUL's FAMILY ===
	// Paul & Penny = spouses
	await ensureRelationship(paul.id, penny.id, "spouse");
	await ensureRelationship(penny.id, paul.id, "spouse");
	console.log("  ✓ Paul & Penny = spouse");

	if (taylor) {
		// Paul & Penny → Taylor (parent)
		await ensureRelationship(paul.id, taylor.id, "parent");
		await ensureRelationship(penny.id, taylor.id, "parent");
		console.log("  ✓ Paul & Penny → parent of Taylor");
	} else {
		console.log("  ⚠ Taylor Morrow not found in DB");
	}

	if (lucas) {
		// Paul & Penny → Lucas (parent)
		await ensureRelationship(paul.id, lucas.id, "parent");
		await ensureRelationship(penny.id, lucas.id, "parent");
		console.log("  ✓ Paul & Penny → parent of Lucas");
	} else {
		console.log("  ⚠ Lucas Morrow not found in DB");
	}

	// Taylor & Lucas = siblings
	if (taylor && lucas) {
		await ensureRelationship(taylor.id, lucas.id, "sibling");
		await ensureRelationship(lucas.id, taylor.id, "sibling");
		console.log("  ✓ Taylor & Lucas = siblings");
	}

	// === LYNN's FAMILY ===
	// Lynn & Billy Perrin = spouses
	await ensureRelationship(lynn.id, billy.id, "spouse");
	await ensureRelationship(billy.id, lynn.id, "spouse");
	console.log("  ✓ Lynn & Billy Perrin = spouse");

	// Lynn & Billy → Shannon
	await ensureRelationship(lynn.id, shannon.id, "parent");
	await ensureRelationship(billy.id, shannon.id, "parent");
	console.log("  ✓ Lynn & Billy → parent of Shannon");

	if (kristie) {
		// Lynn & Billy → Christie (Kristie Parker)
		await ensureRelationship(lynn.id, kristie.id, "parent");
		await ensureRelationship(billy.id, kristie.id, "parent");
		console.log("  ✓ Lynn & Billy → parent of Christie (Kristie Parker)");

		// Shannon & Christie = siblings
		await ensureRelationship(shannon.id, kristie.id, "sibling");
		await ensureRelationship(kristie.id, shannon.id, "sibling");
		console.log("  ✓ Shannon & Christie = siblings");
	} else {
		console.log("  ⚠ Kristie Parker not found in DB");
	}

	// === ALICE's FAMILY ===
	// Alice & Jim Dean = spouses
	await ensureRelationship(alice.id, jim.id, "spouse");
	await ensureRelationship(jim.id, alice.id, "spouse");
	console.log("  ✓ Alice & Jim Dean = spouse");

	if (lacyL) {
		// Alice & Jim → Lacy (Lawrence)
		await ensureRelationship(alice.id, lacyL.id, "parent");
		await ensureRelationship(jim.id, lacyL.id, "parent");
		console.log("  ✓ Alice & Jim → parent of Lacy (Lawrence)");
	} else {
		console.log("  ⚠ Lacy Lawrence not found in DB");
	}

	if (liza) {
		// Alice & Jim → Liza (Stevens)
		await ensureRelationship(alice.id, liza.id, "parent");
		await ensureRelationship(jim.id, liza.id, "parent");
		console.log("  ✓ Alice & Jim → parent of Liza (Stevens)");
	} else {
		console.log("  ⚠ Liza Stevens not found in DB");
	}

	// Lacy Lawrence & Liza = siblings
	if (lacyL && liza) {
		await ensureRelationship(lacyL.id, liza.id, "sibling");
		await ensureRelationship(liza.id, lacyL.id, "sibling");
		console.log("  ✓ Lacy Lawrence & Liza = siblings");
	}

	console.log("\n✅ Sibling families seeded!");
	console.log("   Paul & Penny → Taylor, Lucas");
	console.log("   Lynn & Billy Perrin (†) → Shannon, Christie");
	console.log("   Alice & Jim Dean → Lacy (Lawrence), Liza (Stevens)");
	console.log("\n   ⚠ Ginny Lamb still unassigned — need parent info");

}

main()
	.then(() => process.exit(0))
	.catch((e) => {
		console.error("❌ Seed failed:", e);
		process.exit(1);
	});

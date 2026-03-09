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
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/server/db/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error("DATABASE_URL is required");
	process.exit(1);
}

const client = postgres(DATABASE_URL, {
	ssl: { rejectUnauthorized: false },
});
const db = drizzle(client, { schema });

async function findPerson(firstName: string, lastName: string) {
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
	const results = await db
		.select()
		.from(schema.people)
		.where(ilike(schema.people.firstName, firstName));
	return results;
}

async function ensureRelationship(
	personId: string,
	relatedId: string,
	type: string,
) {
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

	// Penny (Paul's wife)
	let penny = await findPerson("Penny", "Morrow");
	if (!penny) {
		const [p] = await db
			.insert(schema.people)
			.values({
				familyId: family.id,
				firstName: "Penny",
				lastName: "Morrow",
				gender: "female",
				isAlive: true,
			})
			.returning();
		penny = p!;
		console.log(`  + Created Penny Morrow (${penny.id})`);
	} else {
		console.log(`  ✓ Penny Morrow exists (${penny.id})`);
	}

	// Billy Perrin (Lynn's late husband, deceased)
	let billy = await findPerson("Billy", "Perrin");
	if (!billy) {
		const [b] = await db
			.insert(schema.people)
			.values({
				familyId: family.id,
				firstName: "Billy",
				lastName: "Perrin",
				gender: "male",
				isAlive: false,
			})
			.returning();
		billy = b!;
		console.log(`  + Created Billy Perrin (deceased) (${billy.id})`);
	} else {
		console.log(`  ✓ Billy Perrin exists (${billy.id})`);
	}

	// Jim Dean (Alice's husband)
	let jim = await findPerson("Jim", "Dean");
	if (!jim) {
		const [j] = await db
			.insert(schema.people)
			.values({
				familyId: family.id,
				firstName: "Jim",
				lastName: "Dean",
				gender: "male",
				isAlive: true,
			})
			.returning();
		jim = j!;
		console.log(`  + Created Jim Dean (${jim.id})`);
	} else {
		console.log(`  ✓ Jim Dean exists (${jim.id})`);
	}

	// Shannon Perrin (Lynn & Billy's daughter) — NEW
	let shannon = await findPerson("Shannon", "Perrin");
	if (!shannon) {
		const [s] = await db
			.insert(schema.people)
			.values({
				familyId: family.id,
				firstName: "Shannon",
				lastName: "Perrin",
				gender: "female",
				isAlive: true,
			})
			.returning();
		shannon = s!;
		console.log(`  + Created Shannon Perrin (${shannon.id})`);
	} else {
		console.log(`  ✓ Shannon Perrin exists (${shannon.id})`);
	}

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
		await ensureRelationship(taylor.id, paul.id, "child");
		await ensureRelationship(penny.id, taylor.id, "parent");
		await ensureRelationship(taylor.id, penny.id, "child");
		console.log("  ✓ Paul & Penny → parent of Taylor");
	} else {
		console.log("  ⚠ Taylor Morrow not found in DB");
	}

	if (lucas) {
		// Paul & Penny → Lucas (parent)
		await ensureRelationship(paul.id, lucas.id, "parent");
		await ensureRelationship(lucas.id, paul.id, "child");
		await ensureRelationship(penny.id, lucas.id, "parent");
		await ensureRelationship(lucas.id, penny.id, "child");
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
	await ensureRelationship(shannon.id, lynn.id, "child");
	await ensureRelationship(billy.id, shannon.id, "parent");
	await ensureRelationship(shannon.id, billy.id, "child");
	console.log("  ✓ Lynn & Billy → parent of Shannon");

	if (kristie) {
		// Lynn & Billy → Christie (Kristie Parker)
		await ensureRelationship(lynn.id, kristie.id, "parent");
		await ensureRelationship(kristie.id, lynn.id, "child");
		await ensureRelationship(billy.id, kristie.id, "parent");
		await ensureRelationship(kristie.id, billy.id, "child");
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
		await ensureRelationship(lacyL.id, alice.id, "child");
		await ensureRelationship(jim.id, lacyL.id, "parent");
		await ensureRelationship(lacyL.id, jim.id, "child");
		console.log("  ✓ Alice & Jim → parent of Lacy (Lawrence)");
	} else {
		console.log("  ⚠ Lacy Lawrence not found in DB");
	}

	if (liza) {
		// Alice & Jim → Liza (Stevens)
		await ensureRelationship(alice.id, liza.id, "parent");
		await ensureRelationship(liza.id, alice.id, "child");
		await ensureRelationship(jim.id, liza.id, "parent");
		await ensureRelationship(liza.id, jim.id, "child");
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

	await client.end();
}

main()
	.then(() => process.exit(0))
	.catch((e) => {
		console.error("❌ Seed failed:", e);
		process.exit(1);
	});

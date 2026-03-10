import { eq, and, ilike } from "drizzle-orm";
import { db } from "@/server/db";
import { families, people, relationships } from "@/server/db/schema";

async function main() {
	if (!db) { console.error("No DB"); process.exit(1); }

	const allFamilies = await db.select().from(families);
	const family = allFamilies[0]!;

	async function findPerson(firstName: string, lastName: string) {
		const [p] = await db!.select().from(people)
			.where(and(ilike(people.firstName, firstName), ilike(people.lastName, lastName)));
		return p ?? null;
	}

	async function ensure(data: { firstName: string; lastName: string; gender?: string; maidenName?: string }) {
		const existing = await findPerson(data.firstName, data.lastName);
		if (existing) { console.log("  ✓ %s %s exists", data.firstName, data.lastName); return existing; }
		const [p] = await db!.insert(people).values({
			familyId: family.id, firstName: data.firstName, lastName: data.lastName,
			gender: data.gender ?? null, maidenName: data.maidenName ?? null,
		}).returning();
		console.log("  + %s %s (%s)", data.firstName, data.lastName, p!.id);
		return p!;
	}

	async function rel(a: string, b: string, type: string) {
		const [existing] = await db!.select().from(relationships)
			.where(and(eq(relationships.personId, a), eq(relationships.relatedId, b), eq(relationships.type, type)));
		if (!existing) await db!.insert(relationships).values({ personId: a, relatedId: b, type });
	}

	async function biRel(a: string, b: string, type: string) { await rel(a, b, type); await rel(b, a, type); }

	console.log("🌱 Adding Miller Morrow & Sharon...");

	const miller = await ensure({ firstName: "Miller", lastName: "Morrow", gender: "male" });
	const sharon = await ensure({ firstName: "Sharon", lastName: "Morrow", gender: "female" });
	await biRel(miller.id, sharon.id, "spouse");
	console.log("  ✓ Miller & Sharon = spouse");

	// Lacy's brother → same parents (Tom & Susan)
	const lacy = await findPerson("Lacy", "Morrow");
	const tom = await findPerson("Tom", "Morrow");
	const susan = await findPerson("Susan", "Morrow");

	if (tom) { await rel(tom.id, miller.id, "parent"); console.log("  ✓ Tom → parent of Miller"); }
	if (susan) { await rel(susan.id, miller.id, "parent"); console.log("  ✓ Susan → parent of Miller"); }
	if (lacy) { await biRel(lacy.id, miller.id, "sibling"); console.log("  ✓ Lacy ↔ Miller = siblings"); }

	console.log("✅ Done!");
}

main().then(() => process.exit(0)).catch(e => { console.error("❌", e); process.exit(1); });

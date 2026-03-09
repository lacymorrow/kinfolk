/**
 * Seed: Sally Morrow + Cowhig side of the family
 *
 * Morrow additions:
 * - Sally Morrow (sister of Tom/John/Alice/Paul/Lynn, mother of Ginny)
 * - Parent relationships from Thomas & Dock to Sally
 * - Sibling relationships Sally ↔ all siblings
 * - Parent relationship Sally → Ginny
 *
 * Cowhig side:
 * - Bill Cowhig (Papa Bill) & Evelyn Cowhig (grandparents)
 * - Their children: Susan, Billy, Steve, John Cowhig, Mike
 * - Spouses: Billy+Dahlia, Mike+Denise
 * - Grandchildren: Jordan (Billy), Lee+David (Steve), Amy+Heather (John C.), Paul C.+Mittie+Josie (Mike)
 */

import { eq, and, ilike } from "drizzle-orm";
import { db } from "@/server/db";
import { families, people, relationships } from "@/server/db/schema";

async function main() {
	if (!db) { console.error("No DB"); process.exit(1); }

	console.log("🌱 Seeding Sally + Cowhig family...");

	const allFamilies = await db.select().from(families);
	const family = allFamilies[0];
	if (!family) { console.error("No family"); process.exit(1); }
	console.log("  Family: %s (%s)", family.name, family.id);

	// --- Helpers ---
	async function findPerson(firstName: string, lastName: string) {
		const [p] = await db!.select().from(people)
			.where(and(ilike(people.firstName, firstName), ilike(people.lastName, lastName)));
		return p ?? null;
	}

	async function ensure(data: { firstName: string; lastName: string; middleName?: string; nickname?: string; gender?: string; isAlive?: boolean; maidenName?: string }) {
		const existing = await findPerson(data.firstName, data.lastName);
		if (existing) {
			console.log("  ✓ %s %s exists (%s)", data.firstName, data.lastName, existing.id);
			return existing;
		}
		const [p] = await db!.insert(people).values({
			familyId: family.id,
			firstName: data.firstName,
			lastName: data.lastName,
			middleName: data.middleName ?? null,
			nickname: data.nickname ?? null,
			gender: data.gender ?? null,
			isAlive: data.isAlive ?? true,
			maidenName: data.maidenName ?? null,
		}).returning();
		console.log("  + %s %s (%s)", data.firstName, data.lastName, p!.id);
		return p!;
	}

	async function rel(personId: string, relatedId: string, type: string) {
		const [existing] = await db!.select().from(relationships)
			.where(and(eq(relationships.personId, personId), eq(relationships.relatedId, relatedId), eq(relationships.type, type)));
		if (existing) return;
		await db!.insert(relationships).values({ personId, relatedId, type });
	}

	async function biRel(a: string, b: string, type: string) {
		await rel(a, b, type);
		await rel(b, a, type);
	}

	// =====================
	// MORROW SIDE: Sally
	// =====================
	console.log("\n--- Morrow: Sally ---");

	const sally = await ensure({ firstName: "Sally", lastName: "Morrow", gender: "female" });

	// Get existing grandparents and siblings
	const thomas = await findPerson("Thomas", "Morrow");
	const dock = await findPerson("Dock", "Morrow");
	const tom = await findPerson("Tom", "Morrow");
	const john = await findPerson("John", "Morrow");
	const alice = await findPerson("Alice", "Morrow");
	const paul = await findPerson("Paul", "Morrow");
	const lynn = await findPerson("Lynn", "Morrow");
	const ginny = await findPerson("Ginny", "Lamb");

	// Parent: Thomas & Dock → Sally
	if (thomas) { await rel(thomas.id, sally.id, "parent"); console.log("  ✓ Thomas → parent of Sally"); }
	if (dock) { await rel(dock.id, sally.id, "parent"); console.log("  ✓ Dock → parent of Sally"); }

	// Siblings: Sally ↔ all others
	const morrowSiblings = [tom, john, alice, paul, lynn].filter(Boolean) as NonNullable<typeof tom>[];
	for (const sib of morrowSiblings) {
		await biRel(sally.id, sib.id, "sibling");
	}
	console.log("  ✓ Sally ↔ %d siblings", morrowSiblings.length);

	// Sally → parent of Ginny
	if (ginny) {
		await rel(sally.id, ginny.id, "parent");
		console.log("  ✓ Sally → parent of Ginny");
	}

	// =====================
	// COWHIG SIDE
	// =====================
	console.log("\n--- Cowhig side ---");

	// Grandparents
	const papaBill = await ensure({ firstName: "Bill", lastName: "Cowhig", nickname: "Papa Bill", gender: "male", isAlive: false });
	const evelyn = await ensure({ firstName: "Evelyn", lastName: "Cowhig", gender: "female", isAlive: false });
	await biRel(papaBill.id, evelyn.id, "spouse");
	console.log("  ✓ Bill & Evelyn = spouse");

	// Susan (already exists as Susan Morrow, née Cowhig)
	const susan = await findPerson("Susan", "Morrow");
	if (!susan) {
		console.error("  ✗ Susan Morrow not found!");
		process.exit(1);
	}
	// Update maiden name if needed
	if (!susan.maidenName) {
		await db!.update(people).set({ maidenName: "Cowhig" }).where(eq(people.id, susan.id));
		console.log("  ✓ Updated Susan's maiden name to Cowhig");
	}

	// Billy Cowhig & Dahlia
	const billy = await ensure({ firstName: "Billy", lastName: "Cowhig", gender: "male" });
	const dahlia = await ensure({ firstName: "Dahlia", lastName: "Cowhig", gender: "female" });
	await biRel(billy.id, dahlia.id, "spouse");
	const jordan = await ensure({ firstName: "Jordan", lastName: "Cowhig", gender: null });
	await rel(billy.id, jordan.id, "parent");
	await rel(dahlia.id, jordan.id, "parent");
	console.log("  ✓ Billy & Dahlia → Jordan");

	// Steve Cowhig
	const steve = await ensure({ firstName: "Steve", lastName: "Cowhig", gender: "male" });
	const lee = await ensure({ firstName: "Lee", lastName: "Cowhig", gender: null });
	const david = await ensure({ firstName: "David", lastName: "Cowhig", gender: null });
	await rel(steve.id, lee.id, "parent");
	await rel(steve.id, david.id, "parent");
	await biRel(lee.id, david.id, "sibling");
	console.log("  ✓ Steve → Lee, David");

	// John Cowhig (distinct from John Morrow)
	// Check if there's already a John Cowhig
	let johnC = await findPerson("John", "Cowhig");
	if (!johnC) {
		const [p] = await db!.insert(people).values({
			familyId: family.id,
			firstName: "John",
			lastName: "Cowhig",
			gender: "male",
		}).returning();
		johnC = p!;
		console.log("  + John Cowhig (%s)", johnC.id);
	} else {
		console.log("  ✓ John Cowhig exists (%s)", johnC.id);
	}
	const amy = await ensure({ firstName: "Amy", lastName: "Cowhig", gender: "female" });
	const heather = await ensure({ firstName: "Heather", lastName: "Cowhig", gender: "female" });
	await rel(johnC.id, amy.id, "parent");
	await rel(johnC.id, heather.id, "parent");
	await biRel(amy.id, heather.id, "sibling");
	console.log("  ✓ John C. → Amy, Heather");

	// Mike Cowhig & Denise
	const mike = await ensure({ firstName: "Mike", lastName: "Cowhig", gender: "male" });
	const denise = await ensure({ firstName: "Denise", lastName: "Cowhig", gender: "female" });
	await biRel(mike.id, denise.id, "spouse");
	const paulC = await ensure({ firstName: "Paul", lastName: "Cowhig", gender: "male" });
	const mittie = await ensure({ firstName: "Mittie", lastName: "Cowhig", gender: "female" });
	const josie = await ensure({ firstName: "Josie", lastName: "Cowhig", gender: "female" });
	await rel(mike.id, paulC.id, "parent");
	await rel(denise.id, paulC.id, "parent");
	await rel(mike.id, mittie.id, "parent");
	await rel(denise.id, mittie.id, "parent");
	await rel(mike.id, josie.id, "parent");
	await rel(denise.id, josie.id, "parent");
	await biRel(paulC.id, mittie.id, "sibling");
	await biRel(paulC.id, josie.id, "sibling");
	await biRel(mittie.id, josie.id, "sibling");
	console.log("  ✓ Mike & Denise → Paul C., Mittie, Josie");

	// Cowhig children: Bill & Evelyn → Susan, Billy, Steve, John C., Mike
	const cowhigChildren = [susan, billy, steve, johnC, mike];
	for (const child of cowhigChildren) {
		await rel(papaBill.id, child.id, "parent");
		await rel(evelyn.id, child.id, "parent");
	}
	console.log("  ✓ Bill & Evelyn → all 5 children");

	// Sibling relationships among Cowhig children
	for (let i = 0; i < cowhigChildren.length; i++) {
		for (let j = i + 1; j < cowhigChildren.length; j++) {
			await biRel(cowhigChildren[i]!.id, cowhigChildren[j]!.id, "sibling");
		}
	}
	console.log("  ✓ All 5 Cowhig siblings linked");

	console.log("\n✅ Done! Sally + full Cowhig side seeded.");
}

main().then(() => process.exit(0)).catch(e => { console.error("❌", e); process.exit(1); });

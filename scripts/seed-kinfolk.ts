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

interface PersonSeed {
	firstName: string;
	middleName?: string;
	lastName: string;
	maidenName?: string;
	nickname?: string;
	birthdate?: string;
	gender?: string;
	bio?: string;
	isAlive?: boolean;
}

interface ContactSeed {
	type: string;
	subtype?: string;
	value: string;
	isPrimary?: boolean;
}

interface AddressSeed {
	label?: string;
	street1: string;
	street2?: string;
	city: string;
	state: string;
	zip: string;
}

interface RelSeed {
	from: string; // key
	to: string; // key
	type: "parent" | "child" | "spouse" | "sibling" | "partner";
}

async function seed() {
	console.log("Seeding Kinfolk data...");

	// 1. Create family
	const familyResult = await db
		.insert(schema.families)
		.values({ name: "The Morrows" })
		.returning();
	const family = familyResult[0]!;
	const familyId = family.id;

	// 2. Insert all people
	const peopleData: Record<string, PersonSeed> = {
		tom: { firstName: "Tom", lastName: "Morrow", gender: "male" },
		susan: { firstName: "Susan", lastName: "Morrow", maidenName: "Cowhig", gender: "female" },
		john: { firstName: "John", lastName: "Morrow", gender: "male" },
		suzanne: { firstName: "Suzanne", lastName: "Morrow", gender: "female" },
		lacy: { firstName: "Lacy", lastName: "Morrow", gender: "male" },
		cait: { firstName: "Cait", lastName: "Morrow", gender: "female" },
		sarah: { firstName: "Sarah Alice", lastName: "Morrow", gender: "female" },
		kelsey: { firstName: "Kelsey", lastName: "Fontenot", maidenName: "Morrow", gender: "female" },
		andrew: { firstName: "Andrew", lastName: "Fontenot", gender: "male" },
		mattie: { firstName: "Mattie", lastName: "Morrow", gender: "female" },
		holly: { firstName: "Holly", lastName: "Morrow", gender: "female" },
		taylor: { firstName: "Taylor", lastName: "Morrow", gender: "male" },
		tracy: { firstName: "Tracy", lastName: "Morrow", gender: "female" },
		twyla: { firstName: "Twyla", lastName: "Morrow", gender: "female" },
		beatrice: { firstName: "Beatrice", lastName: "Morrow", gender: "female" },
		kristie: { firstName: "Kristie", lastName: "Parker", maidenName: "Morrow", gender: "female" },
		daniel: { firstName: "Daniel", lastName: "Parker", gender: "male" },
		liza: { firstName: "Liza", lastName: "Stevens", gender: "female" },
		ross: { firstName: "Ross", lastName: "Stevens", gender: "male" },
		saylor: { firstName: "Saylor", lastName: "Stevens", gender: "female" },
		lily: { firstName: "Lily", lastName: "Stevens", gender: "female" },
		ginny: { firstName: "Ginny", lastName: "Lamb", gender: "female" },
		marc: { firstName: "Marc", lastName: "Lamb", gender: "male" },
		xavier: { firstName: "Xavier", lastName: "Lamb", gender: "male" },
		lucas: { firstName: "Lucas", lastName: "Morrow", gender: "male" },
		alison: { firstName: "Alison", lastName: "Morrow", gender: "female" },
		lacyL: { firstName: "Lacy", lastName: "Lawrence", maidenName: "Morrow", gender: "female" },
		josh: { firstName: "Josh", lastName: "Lawrence", gender: "male" },
		avery: { firstName: "Avery", lastName: "Lawrence", gender: "female" },
	};

	const personIds: Record<string, string> = {};

	for (const [key, data] of Object.entries(peopleData)) {
		const result = await db
			.insert(schema.people)
			.values({
				familyId,
				firstName: data.firstName,
				middleName: data.middleName ?? null,
				lastName: data.lastName,
				maidenName: data.maidenName ?? null,
				nickname: data.nickname ?? null,
				birthdate: data.birthdate ?? null,
				gender: data.gender ?? null,
				bio: data.bio ?? null,
				isAlive: data.isAlive ?? true,
			})
			.returning();
		personIds[key] = result[0]!.id;
	}

	// 3. Insert contacts
	const contactsData: Record<string, ContactSeed[]> = {
		lacy: [{ type: "email", subtype: "personal", value: "me@lacymorrow.com", isPrimary: true }],
		sarah: [{ type: "email", subtype: "personal", value: "sarahamorro3@gmail.com", isPrimary: true }],
		kristie: [{ type: "email", subtype: "personal", value: "Kristiebyrd@gmail.com", isPrimary: true }],
		liza: [{ type: "email", subtype: "personal", value: "Lizastevens09@gmail.com", isPrimary: true }],
		ginny: [{ type: "email", subtype: "personal", value: "Ginnylamb1@gmail.com", isPrimary: true }],
		lucas: [{ type: "email", subtype: "personal", value: "Lotsaluc2@gmail.com", isPrimary: true }],
		lacyL: [{ type: "email", subtype: "personal", value: "Lalawrence37@gmail.com", isPrimary: true }],
		josh: [{ type: "email", subtype: "personal", value: "jflawrence87@gmail.com", isPrimary: true }],
	};

	for (const [key, contactList] of Object.entries(contactsData)) {
		for (const contact of contactList) {
			await db.insert(schema.contacts).values({
				personId: personIds[key]!,
				type: contact.type,
				subtype: contact.subtype ?? null,
				value: contact.value,
				isPrimary: contact.isPrimary ?? false,
			});
		}
	}

	// 4. Insert addresses
	const addressesData: Record<string, AddressSeed> = {
		lacy: { label: "home", street1: "1011 Sewickley Dr", city: "Charlotte", state: "NC", zip: "28209" },
		sarah: { label: "home", street1: "75 Walter Ridge Rd", city: "West Jefferson", state: "NC", zip: "28694" },
		kelsey: { label: "home", street1: "6809 Miranda Dr", city: "Austin", state: "TX", zip: "78752" },
		taylor: { label: "home", street1: "1604 Harmont Dr", city: "Raleigh", state: "NC", zip: "27603" },
		kristie: { label: "home", street1: "104 Alabama Ave", city: "Carolina Beach", state: "NC", zip: "28428" },
		liza: { label: "home", street1: "20 W Henderson St", city: "Wrightsville Beach", state: "NC", zip: "28480" },
		ginny: { label: "home", street1: "6636 Mangrove Way", city: "Naples", state: "FL", zip: "34109" },
		lucas: { label: "home", street1: "314 Baymount Dr", city: "Statesville", state: "NC", zip: "28625" },
		lacyL: { label: "home", street1: "3209 Camden Cir", city: "Wilmington", state: "NC", zip: "28403" },
	};

	for (const [key, addr] of Object.entries(addressesData)) {
		await db.insert(schema.addresses).values({
			personId: personIds[key]!,
			label: addr.label ?? null,
			street1: addr.street1,
			street2: addr.street2 ?? null,
			city: addr.city,
			state: addr.state,
			zip: addr.zip,
		});
	}

	// 5. Insert relationships (bidirectional)
	const rels: RelSeed[] = [
		// Generation 1 - Tom & Susan are spouses
		{ from: "tom", to: "susan", type: "spouse" },
		// Generation 1 - John & Suzanne are spouses
		{ from: "john", to: "suzanne", type: "spouse" },
		// Tom & Susan → Lacy (parent-child)
		{ from: "tom", to: "lacy", type: "parent" },
		{ from: "susan", to: "lacy", type: "parent" },
		// Lacy & Cait
		{ from: "lacy", to: "cait", type: "spouse" },
		// John & Suzanne → their daughters
		{ from: "john", to: "sarah", type: "parent" },
		{ from: "suzanne", to: "sarah", type: "parent" },
		{ from: "john", to: "kelsey", type: "parent" },
		{ from: "suzanne", to: "kelsey", type: "parent" },
		{ from: "john", to: "mattie", type: "parent" },
		{ from: "suzanne", to: "mattie", type: "parent" },
		{ from: "john", to: "holly", type: "parent" },
		{ from: "suzanne", to: "holly", type: "parent" },
		// Kelsey & Andrew
		{ from: "kelsey", to: "andrew", type: "spouse" },
		// Taylor & Tracy (partner)
		{ from: "taylor", to: "tracy", type: "partner" },
		// Taylor & Tracy → kids
		{ from: "taylor", to: "twyla", type: "parent" },
		{ from: "tracy", to: "twyla", type: "parent" },
		{ from: "taylor", to: "beatrice", type: "parent" },
		{ from: "tracy", to: "beatrice", type: "parent" },
		// Kristie & Daniel
		{ from: "kristie", to: "daniel", type: "spouse" },
		// Liza & Ross
		{ from: "liza", to: "ross", type: "spouse" },
		{ from: "liza", to: "saylor", type: "parent" },
		{ from: "ross", to: "saylor", type: "parent" },
		{ from: "liza", to: "lily", type: "parent" },
		{ from: "ross", to: "lily", type: "parent" },
		// Ginny & Marc
		{ from: "ginny", to: "marc", type: "spouse" },
		{ from: "ginny", to: "xavier", type: "parent" },
		{ from: "marc", to: "xavier", type: "parent" },
		// Lucas & Alison
		{ from: "lucas", to: "alison", type: "spouse" },
		// Lacy Lawrence & Josh
		{ from: "lacyL", to: "josh", type: "spouse" },
		{ from: "lacyL", to: "avery", type: "parent" },
		{ from: "josh", to: "avery", type: "parent" },
		// Sibling relationships for John & Suzanne's daughters
		{ from: "sarah", to: "kelsey", type: "sibling" },
		{ from: "sarah", to: "mattie", type: "sibling" },
		{ from: "sarah", to: "holly", type: "sibling" },
		{ from: "kelsey", to: "mattie", type: "sibling" },
		{ from: "kelsey", to: "holly", type: "sibling" },
		{ from: "mattie", to: "holly", type: "sibling" },
		// Tom & John are siblings (brothers)
		{ from: "tom", to: "john", type: "sibling" },
	];

	for (const rel of rels) {
		// Insert the forward relationship
		await db.insert(schema.relationships).values({
			personId: personIds[rel.from]!,
			relatedId: personIds[rel.to]!,
			type: rel.type,
		});

		// Insert the inverse relationship
		const inverseType =
			rel.type === "parent"
				? "child"
				: rel.type === "child"
					? "parent"
					: rel.type; // spouse, sibling, partner are symmetric
		await db.insert(schema.relationships).values({
			personId: personIds[rel.to]!,
			relatedId: personIds[rel.from]!,
			type: inverseType,
		});
	}

	console.log(`Seeded ${Object.keys(peopleData).length} people with relationships, contacts, and addresses.`);

	await client.end();
}

seed().catch((err) => {
	console.error("Seed failed:", err);
	process.exit(1);
});

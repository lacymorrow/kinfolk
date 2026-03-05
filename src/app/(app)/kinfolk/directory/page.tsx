import { getPeople, getFirstFamily } from "@/server/actions/kinfolk/queries";
import { DirectoryClient } from "./directory-client";
import type { Person, Address } from "@/server/db/schema";

export default async function DirectoryPage() {
	const family = await getFirstFamily();
	if (!family) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center">
				<p className="text-muted-foreground">No family data found. Run the seed script first.</p>
			</div>
		);
	}

	const rows = await getPeople(family.id);

	const people = rows.map((row) => ({
		person: row.person as Person,
		address: (row.address as Address) ?? null,
	}));

	return <DirectoryClient people={people} />;
}

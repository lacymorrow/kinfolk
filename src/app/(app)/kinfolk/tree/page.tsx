import { auth } from "@/server/auth";
import {
	getAllPeopleWithRelationships,
	getFirstFamily,
	getPersonByUserId,
} from "@/server/actions/kinfolk/queries";
import { FamilyTree } from "./family-tree";

export default async function TreePage() {
	const family = await getFirstFamily();
	if (!family) {
		return (
			<div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
				<p className="text-muted-foreground">No family data found. Run the seed script first.</p>
			</div>
		);
	}

	const { people, relationships } = await getAllPeopleWithRelationships(family.id);

	// Resolve current user's person record for "Focus My Branch"
	let currentPersonId: string | undefined;
	try {
		const session = await auth();
		if (session?.user?.id) {
			const person = await getPersonByUserId(session.user.id);
			if (person) currentPersonId = person.id;
		}
	} catch {
		// Not logged in or no linked person — button just won't appear
	}

	return (
		<FamilyTree
			familyId={family.id}
			people={people}
			relationships={relationships}
			currentPersonId={currentPersonId}
		/>
	);
}

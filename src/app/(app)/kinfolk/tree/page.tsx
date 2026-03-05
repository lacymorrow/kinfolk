import { getAllPeopleWithRelationships, getFirstFamily } from "@/server/actions/kinfolk/queries";
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

	return <FamilyTree people={people} relationships={relationships} />;
}

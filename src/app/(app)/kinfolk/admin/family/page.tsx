import Link from "next/link";
import { getPeople, getFirstFamily } from "@/server/actions/kinfolk/queries";
import { AddPersonForm } from "./add-person-form";
import type { Person } from "@/server/db/schema";

export default async function AdminFamilyPage() {
	const family = await getFirstFamily();
	if (!family) {
		return (
			<div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
				<h1 className="mb-4 text-2xl font-bold tracking-tight">Family Management</h1>
				<p className="text-muted-foreground">
					No family exists yet. Run the seed script to create one.
				</p>
			</div>
		);
	}

	const rows = await getPeople(family.id);
	const people = rows.map((row) => row.person as Person);

	return (
		<div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
			<div className="mb-6">
				<h1 className="text-2xl font-bold tracking-tight">{family.name}</h1>
				<p className="text-muted-foreground">
					{people.length} members
				</p>
			</div>

			{/* Add Person */}
			<div className="mb-8 rounded-xl border bg-card p-6">
				<h2 className="mb-4 text-lg font-semibold">Add Person</h2>
				<AddPersonForm familyId={family.id} allPeople={people} />
			</div>

			{/* People List */}
			<div>
				<h2 className="mb-4 text-lg font-semibold">Members</h2>
				<div className="space-y-2">
					{people.map((person) => (
						<div
							key={person.id}
							className="flex items-center justify-between rounded-md border p-3"
						>
							<div>
								<span className="font-medium">
									{person.firstName} {person.lastName}
								</span>
								{person.maidenName && (
									<span className="ml-1 text-sm text-muted-foreground">
										(née {person.maidenName})
									</span>
								)}
							</div>
							<div className="flex gap-2">
								<Link
									href={`/kinfolk/person/${person.id}`}
									className="rounded-md bg-secondary px-3 py-1 text-sm hover:bg-secondary/80"
								>
									View
								</Link>
								<Link
									href={`/kinfolk/person/${person.id}/edit`}
									className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90"
								>
									Edit
								</Link>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

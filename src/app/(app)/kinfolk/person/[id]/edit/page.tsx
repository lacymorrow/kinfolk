import { notFound, redirect } from "next/navigation";
import { getPersonWithDetails, getPeople, getFirstFamily } from "@/server/actions/kinfolk/queries";
import { PersonForm } from "./person-form";
import type { Person } from "@/server/db/schema";

export default async function EditPersonPage({
	params,
}: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const person = await getPersonWithDetails(id);
	if (!person) return notFound();

	const family = await getFirstFamily();
	const allPeopleRows = family ? await getPeople(family.id) : [];
	const allPeople = allPeopleRows
		.map((row) => row.person as Person)
		.filter((p) => p.id !== id);

	return (
		<div className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
			<h1 className="mb-6 text-2xl font-bold tracking-tight">
				Edit {person.firstName} {person.lastName}
			</h1>
			<PersonForm person={person} allPeople={allPeople} />
		</div>
	);
}

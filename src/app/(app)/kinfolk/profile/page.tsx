import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import {
	getPersonByUserId,
	getPersonWithDetails,
	getFirstFamily,
	getUnlinkedPeople,
} from "@/server/actions/kinfolk/queries";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect("/auth/login");
	}

	const family = await getFirstFamily();
	const person = await getPersonByUserId(session.user.id);

	if (person) {
		const details = await getPersonWithDetails(person.id);
		return (
			<ProfileClient
				mode="linked"
				person={details!}
				userId={session.user.id}
				userName={session.user.name ?? null}
			/>
		);
	}

	// Not linked — show claim flow
	const unlinked = family ? await getUnlinkedPeople(family.id) : [];
	return (
		<ProfileClient
			mode="unlinked"
			userId={session.user.id}
			userName={session.user.name ?? null}
			unlinkedPeople={unlinked}
		/>
	);
}

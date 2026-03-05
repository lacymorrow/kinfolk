import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersonWithDetails } from "@/server/actions/kinfolk/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PersonPage({
	params,
}: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const person = await getPersonWithDetails(id);
	if (!person) return notFound();

	const displayName = person.maidenName
		? `${person.firstName} ${person.middleName ?? ""} ${person.lastName} (née ${person.maidenName})`
		: `${person.firstName} ${person.middleName ?? ""} ${person.lastName}`;

	const age = person.birthdate ? calculateAge(person.birthdate, person.deathdate) : null;

	const primaryAddress = person.addresses.find((a) => a.isPrimary) ?? person.addresses[0];

	// Group relationships by type
	// type="child" means "this person is a child of relatedPerson" → relatedPerson is a parent
	// type="parent" means "this person is a parent of relatedPerson" → relatedPerson is a child
	const parents = person.relationships.filter((r) => r.relationship.type === "child");
	const children = person.relationships.filter((r) => r.relationship.type === "parent");
	const spouses = person.relationships.filter(
		(r) => r.relationship.type === "spouse" || r.relationship.type === "partner",
	);
	const siblings = person.relationships.filter((r) => r.relationship.type === "sibling");

	return (
		<div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
			{/* Header */}
			<div className="mb-8 flex items-start justify-between">
				<div className="flex items-center gap-4">
					<div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
						{person.avatarUrl ? (
							<img
								src={person.avatarUrl}
								alt={person.firstName}
								className="h-full w-full rounded-full object-cover"
							/>
						) : (
							`${person.firstName[0]}${person.lastName[0]}`
						)}
					</div>
					<div>
						<h1 className="text-3xl font-bold tracking-tight">{displayName.trim()}</h1>
						<div className="mt-1 flex items-center gap-3 text-muted-foreground">
							{age !== null && <span>{age} years old</span>}
							{primaryAddress && (
								<span>
									{primaryAddress.city}, {primaryAddress.state}
								</span>
							)}
						</div>
						{person.nickname && (
							<p className="mt-1 text-sm text-muted-foreground">
								&ldquo;{person.nickname}&rdquo;
							</p>
						)}
					</div>
				</div>
				<Link
					href={`/kinfolk/person/${id}/edit`}
					className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
				>
					Edit
				</Link>
			</div>

			{person.bio && (
				<p className="mb-8 text-muted-foreground">{person.bio}</p>
			)}

			<div className="grid gap-6 md:grid-cols-2">
				{/* Contact Info */}
				{person.contacts.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>Contact</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{person.contacts.map((contact) => (
								<div key={contact.id} className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium capitalize">
											{contact.subtype ?? contact.type}
										</p>
										{contact.type === "email" ? (
											<a
												href={`mailto:${contact.value}`}
												className="text-sm text-primary hover:underline"
											>
												{contact.value}
											</a>
										) : contact.type === "phone" ? (
											<a
												href={`tel:${contact.value}`}
												className="text-sm text-primary hover:underline"
											>
												{contact.value}
											</a>
										) : (
											<p className="text-sm text-muted-foreground">
												{contact.value}
											</p>
										)}
									</div>
									{contact.isPrimary && (
										<span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
											Primary
										</span>
									)}
								</div>
							))}
						</CardContent>
					</Card>
				)}

				{/* Addresses */}
				{person.addresses.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>Address</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							{person.addresses.map((addr) => (
								<div key={addr.id}>
									{addr.label && (
										<p className="text-sm font-medium capitalize">
											{addr.label}
										</p>
									)}
									<a
										href={`https://maps.google.com/?q=${encodeURIComponent(
											`${addr.street1}, ${addr.city}, ${addr.state} ${addr.zip}`,
										)}`}
										target="_blank"
										rel="noopener noreferrer"
										className="text-sm text-primary hover:underline"
									>
										{addr.street1}
										{addr.street2 && `, ${addr.street2}`}
										<br />
										{addr.city}, {addr.state} {addr.zip}
									</a>
								</div>
							))}
						</CardContent>
					</Card>
				)}

				{/* Relationships */}
				<Card className="md:col-span-2">
					<CardHeader>
						<CardTitle>Family</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
							<RelationshipGroup title="Parents" relationships={parents} />
							<RelationshipGroup title="Spouse / Partner" relationships={spouses} />
							<RelationshipGroup title="Siblings" relationships={siblings} />
							<RelationshipGroup title="Children" relationships={children} />
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

const RelationshipGroup = ({
	title,
	relationships,
}: {
	title: string;
	relationships: Array<{
		relationship: { id: string; type: string };
		relatedPerson: {
			id: string;
			firstName: string;
			lastName: string;
			maidenName: string | null;
		};
	}>;
}) => {
	if (relationships.length === 0) return null;

	return (
		<div>
			<h3 className="mb-2 text-sm font-semibold text-muted-foreground">{title}</h3>
			<ul className="space-y-1">
				{relationships.map(({ relatedPerson }) => (
					<li key={relatedPerson.id}>
						<Link
							href={`/kinfolk/person/${relatedPerson.id}`}
							className="text-sm text-primary hover:underline"
						>
							{relatedPerson.firstName} {relatedPerson.lastName}
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
};

function calculateAge(birthdate: string, deathdate?: string | null): number {
	const birth = new Date(birthdate);
	const end = deathdate ? new Date(deathdate) : new Date();
	let age = end.getFullYear() - birth.getFullYear();
	const m = end.getMonth() - birth.getMonth();
	if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) {
		age--;
	}
	return age;
}

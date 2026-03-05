"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { updatePersonForm } from "@/server/actions/kinfolk/mutations";
import { createContact, deleteContact, createAddress, deleteAddress, createRelationship } from "@/server/actions/kinfolk/mutations";
import type { Person, Contact, Address, Relationship } from "@/server/db/schema";

interface PersonWithDetails extends Person {
	contacts: Contact[];
	addresses: Address[];
	relationships: Array<{
		relationship: Relationship;
		relatedPerson: Person;
	}>;
}

interface PersonFormProps {
	person: PersonWithDetails;
	allPeople: Person[];
}

export const PersonForm = ({ person, allPeople }: PersonFormProps) => {
	const router = useRouter();
	const [saving, setSaving] = useState(false);
	const [newContactType, setNewContactType] = useState("email");
	const [newContactValue, setNewContactValue] = useState("");
	const [newRelType, setNewRelType] = useState("spouse");
	const [newRelPersonId, setNewRelPersonId] = useState("");

	const handleSubmit = async (formData: FormData) => {
		setSaving(true);
		try {
			await updatePersonForm(formData);
			router.push(`/kinfolk/person/${person.id}`);
		} catch {
			setSaving(false);
		}
	};

	const handleAddContact = async () => {
		if (!newContactValue.trim()) return;
		await createContact({
			personId: person.id,
			type: newContactType,
			value: newContactValue.trim(),
			isPrimary: false,
		});
		setNewContactValue("");
		router.refresh();
	};

	const handleDeleteContact = async (contactId: string) => {
		await deleteContact(contactId);
		router.refresh();
	};

	const handleAddRelationship = async () => {
		if (!newRelPersonId) return;
		await createRelationship({
			personId: person.id,
			relatedId: newRelPersonId,
			type: newRelType,
		});
		setNewRelPersonId("");
		router.refresh();
	};

	return (
		<div className="space-y-8">
			{/* Basic Info Form */}
			<form action={handleSubmit} className="space-y-4">
				<input type="hidden" name="id" value={person.id} />

				<div className="grid grid-cols-2 gap-4">
					<div>
						<Label htmlFor="firstName">First Name</Label>
						<Input id="firstName" name="firstName" defaultValue={person.firstName} required />
					</div>
					<div>
						<Label htmlFor="middleName">Middle Name</Label>
						<Input id="middleName" name="middleName" defaultValue={person.middleName ?? ""} />
					</div>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div>
						<Label htmlFor="lastName">Last Name</Label>
						<Input id="lastName" name="lastName" defaultValue={person.lastName} required />
					</div>
					<div>
						<Label htmlFor="maidenName">Maiden Name</Label>
						<Input id="maidenName" name="maidenName" defaultValue={person.maidenName ?? ""} />
					</div>
				</div>

				<div>
					<Label htmlFor="nickname">Nickname</Label>
					<Input id="nickname" name="nickname" defaultValue={person.nickname ?? ""} />
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div>
						<Label htmlFor="birthdate">Birthdate</Label>
						<Input id="birthdate" name="birthdate" type="date" defaultValue={person.birthdate ?? ""} />
					</div>
					<div>
						<Label htmlFor="deathdate">Death Date</Label>
						<Input id="deathdate" name="deathdate" type="date" defaultValue={person.deathdate ?? ""} />
					</div>
				</div>

				<div>
					<Label htmlFor="gender">Gender</Label>
					<Select name="gender" defaultValue={person.gender ?? ""}>
						<SelectTrigger>
							<SelectValue placeholder="Select gender" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="male">Male</SelectItem>
							<SelectItem value="female">Female</SelectItem>
							<SelectItem value="other">Other</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div>
					<Label htmlFor="bio">Bio</Label>
					<Textarea id="bio" name="bio" rows={3} defaultValue={person.bio ?? ""} />
				</div>

				<button
					type="submit"
					disabled={saving}
					className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
				>
					{saving ? "Saving..." : "Save Changes"}
				</button>
			</form>

			{/* Contacts Section */}
			<div>
				<h2 className="mb-3 text-lg font-semibold">Contacts</h2>
				<div className="space-y-2">
					{person.contacts.map((contact) => (
						<div key={contact.id} className="flex items-center justify-between rounded-md border p-3">
							<div>
								<span className="text-sm font-medium capitalize">{contact.type}</span>
								<span className="mx-2 text-muted-foreground">—</span>
								<span className="text-sm">{contact.value}</span>
							</div>
							<button
								type="button"
								onClick={() => handleDeleteContact(contact.id)}
								className="text-sm text-destructive hover:underline"
							>
								Remove
							</button>
						</div>
					))}
				</div>
				<div className="mt-3 flex gap-2">
					<Select value={newContactType} onValueChange={setNewContactType}>
						<SelectTrigger className="w-[120px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="email">Email</SelectItem>
							<SelectItem value="phone">Phone</SelectItem>
							<SelectItem value="social">Social</SelectItem>
						</SelectContent>
					</Select>
					<Input
						placeholder="Value..."
						value={newContactValue}
						onChange={(e) => setNewContactValue(e.target.value)}
						className="flex-1"
					/>
					<button
						type="button"
						onClick={handleAddContact}
						className="rounded-md bg-secondary px-3 py-2 text-sm font-medium hover:bg-secondary/80"
					>
						Add
					</button>
				</div>
			</div>

			{/* Relationships Section */}
			<div>
				<h2 className="mb-3 text-lg font-semibold">Relationships</h2>
				<div className="space-y-2">
					{person.relationships.map(({ relationship, relatedPerson }) => (
						<div key={relationship.id} className="flex items-center justify-between rounded-md border p-3">
							<span className="text-sm">
								<span className="capitalize font-medium">{relationship.type}</span>
								<span className="mx-2 text-muted-foreground">of</span>
								{relatedPerson.firstName} {relatedPerson.lastName}
							</span>
						</div>
					))}
				</div>
				<div className="mt-3 flex gap-2">
					<Select value={newRelType} onValueChange={setNewRelType}>
						<SelectTrigger className="w-[120px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="parent">Parent</SelectItem>
							<SelectItem value="child">Child</SelectItem>
							<SelectItem value="spouse">Spouse</SelectItem>
							<SelectItem value="sibling">Sibling</SelectItem>
							<SelectItem value="partner">Partner</SelectItem>
						</SelectContent>
					</Select>
					<Select value={newRelPersonId} onValueChange={setNewRelPersonId}>
						<SelectTrigger className="flex-1">
							<SelectValue placeholder="Select person..." />
						</SelectTrigger>
						<SelectContent>
							{allPeople.map((p) => (
								<SelectItem key={p.id} value={p.id}>
									{p.firstName} {p.lastName}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<button
						type="button"
						onClick={handleAddRelationship}
						className="rounded-md bg-secondary px-3 py-2 text-sm font-medium hover:bg-secondary/80"
					>
						Add
					</button>
				</div>
			</div>
		</div>
	);
};

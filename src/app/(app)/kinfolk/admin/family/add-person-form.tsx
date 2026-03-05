"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { createPerson, createRelationship } from "@/server/actions/kinfolk/mutations";
import type { Person } from "@/server/db/schema";

interface AddPersonFormProps {
	familyId: string;
	allPeople: Person[];
}

export const AddPersonForm = ({ familyId, allPeople }: AddPersonFormProps) => {
	const router = useRouter();
	const [saving, setSaving] = useState(false);
	const [relType, setRelType] = useState("");
	const [relPersonId, setRelPersonId] = useState("");

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSaving(true);

		const formData = new FormData(e.currentTarget);

		try {
			const newPerson = await createPerson({
				familyId,
				firstName: formData.get("firstName") as string,
				middleName: (formData.get("middleName") as string) || null,
				lastName: formData.get("lastName") as string,
				maidenName: (formData.get("maidenName") as string) || null,
				nickname: (formData.get("nickname") as string) || null,
				gender: (formData.get("gender") as string) || null,
				birthdate: (formData.get("birthdate") as string) || null,
			});

			// Add relationship if specified
			if (relType && relPersonId && newPerson) {
				await createRelationship({
					personId: newPerson.id,
					relatedId: relPersonId,
					type: relType,
				});
			}

			e.currentTarget.reset();
			setRelType("");
			setRelPersonId("");
			router.refresh();
		} catch {
			// Error handled by UI
		} finally {
			setSaving(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="grid grid-cols-2 gap-4">
				<div>
					<Label htmlFor="add-firstName">First Name</Label>
					<Input id="add-firstName" name="firstName" required />
				</div>
				<div>
					<Label htmlFor="add-lastName">Last Name</Label>
					<Input id="add-lastName" name="lastName" required />
				</div>
			</div>

			<div className="grid grid-cols-3 gap-4">
				<div>
					<Label htmlFor="add-middleName">Middle Name</Label>
					<Input id="add-middleName" name="middleName" />
				</div>
				<div>
					<Label htmlFor="add-maidenName">Maiden Name</Label>
					<Input id="add-maidenName" name="maidenName" />
				</div>
				<div>
					<Label htmlFor="add-nickname">Nickname</Label>
					<Input id="add-nickname" name="nickname" />
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<Label htmlFor="add-gender">Gender</Label>
					<Select name="gender">
						<SelectTrigger>
							<SelectValue placeholder="Select..." />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="male">Male</SelectItem>
							<SelectItem value="female">Female</SelectItem>
							<SelectItem value="other">Other</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div>
					<Label htmlFor="add-birthdate">Birthdate</Label>
					<Input id="add-birthdate" name="birthdate" type="date" />
				</div>
			</div>

			{/* Optional initial relationship */}
			<div className="rounded-md border p-4">
				<h3 className="mb-3 text-sm font-medium">Initial Relationship (optional)</h3>
				<div className="flex gap-2">
					<Select value={relType} onValueChange={setRelType}>
						<SelectTrigger className="w-[130px]">
							<SelectValue placeholder="Type..." />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="parent">Parent of</SelectItem>
							<SelectItem value="child">Child of</SelectItem>
							<SelectItem value="spouse">Spouse of</SelectItem>
							<SelectItem value="sibling">Sibling of</SelectItem>
							<SelectItem value="partner">Partner of</SelectItem>
						</SelectContent>
					</Select>
					<Select value={relPersonId} onValueChange={setRelPersonId}>
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
				</div>
			</div>

			<button
				type="submit"
				disabled={saving}
				className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
			>
				{saving ? "Adding..." : "Add Person"}
			</button>
		</form>
	);
};

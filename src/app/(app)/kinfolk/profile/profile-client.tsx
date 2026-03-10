"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { updatePerson } from "@/server/actions/kinfolk/mutations";
import { claimProfile } from "./actions";
import type { Person, Contact, Address } from "@/server/db/schema";

interface PersonDetails extends Person {
	contacts: Contact[];
	addresses: Address[];
	relationships: Array<{
		relationship: { id: string; type: string };
		relatedPerson: { id: string; firstName: string; lastName: string; maidenName: string | null };
	}>;
}

interface ProfileClientProps {
	mode: "linked" | "unlinked";
	userId: string;
	userName: string | null;
	person?: PersonDetails;
	unlinkedPeople?: Person[];
}

export const ProfileClient = ({
	mode,
	userId,
	userName,
	person,
	unlinkedPeople = [],
}: ProfileClientProps) => {
	const router = useRouter();
	const [saving, setSaving] = useState(false);
	const [selectedPersonId, setSelectedPersonId] = useState("");

	const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!person) return;
		setSaving(true);
		const fd = new FormData(e.currentTarget);
		try {
			await updatePerson(person.id, {
				bio: (fd.get("bio") as string) || null,
				avatarUrl: (fd.get("avatarUrl") as string) || null,
			});
			router.refresh();
		} finally {
			setSaving(false);
		}
	};

	const handleClaim = async () => {
		if (!selectedPersonId) return;
		setSaving(true);
		try {
			await claimProfile(selectedPersonId);
			router.refresh();
		} finally {
			setSaving(false);
		}
	};

	if (mode === "linked" && person) {
		return (
			<div className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
				<h1 className="mb-6 text-2xl font-bold tracking-tight">My Profile</h1>

				<Card className="mb-6">
					<CardHeader>
						<CardTitle>
							{person.firstName} {person.lastName}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="mb-4 flex items-center gap-4">
							{person.avatarUrl ? (
								<img
									src={person.avatarUrl}
									alt={person.firstName}
									className="h-20 w-20 rounded-full object-cover"
								/>
							) : (
								<div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
									{person.firstName[0]}{person.lastName[0]}
								</div>
							)}
							<div>
								<p className="text-lg font-medium">
									{person.firstName} {person.lastName}
								</p>
								{person.nickname && (
									<p className="text-sm text-muted-foreground">&ldquo;{person.nickname}&rdquo;</p>
								)}
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Edit Profile</CardTitle>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleUpdate} className="space-y-4">
							<div>
								<Label htmlFor="prof-avatar">Avatar URL</Label>
								<Input
									id="prof-avatar"
									name="avatarUrl"
									type="url"
									defaultValue={person.avatarUrl ?? ""}
									placeholder="https://..."
								/>
							</div>
							<div>
								<Label htmlFor="prof-bio">Bio</Label>
								<Textarea
									id="prof-bio"
									name="bio"
									rows={4}
									defaultValue={person.bio ?? ""}
									placeholder="Tell the family about yourself..."
								/>
							</div>
							<Button type="submit" disabled={saving}>
								{saving ? "Saving..." : "Save Changes"}
							</Button>
						</form>
					</CardContent>
				</Card>

				{/* Contact info display */}
				{person.contacts.length > 0 && (
					<Card className="mt-6">
						<CardHeader>
							<CardTitle>Contact Info</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							{person.contacts.map((c) => (
								<div key={c.id} className="flex items-center justify-between text-sm">
									<span className="capitalize text-muted-foreground">{c.subtype ?? c.type}</span>
									<span>{c.value}</span>
								</div>
							))}
						</CardContent>
					</Card>
				)}
			</div>
		);
	}

	// Unlinked — claim flow
	return (
		<div className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
			<h1 className="mb-6 text-2xl font-bold tracking-tight">Claim Your Profile</h1>

			<Card>
				<CardContent className="p-6">
					<p className="mb-4 text-muted-foreground">
						Hi{userName ? ` ${userName}` : ""}! Your account isn&apos;t linked to a person in the family directory yet.
						Select yourself below to claim your profile.
					</p>

					{unlinkedPeople.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No unclaimed people in the directory. Ask a family admin to add you first.
						</p>
					) : (
						<div className="space-y-4">
							<div>
								<Label>I am...</Label>
								<Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
									<SelectTrigger>
										<SelectValue placeholder="Select your name..." />
									</SelectTrigger>
									<SelectContent>
										{unlinkedPeople.map((p) => (
											<SelectItem key={p.id} value={p.id}>
												{p.firstName} {p.lastName}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<Button onClick={handleClaim} disabled={!selectedPersonId || saving}>
								{saving ? "Claiming..." : "Claim Profile"}
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
};

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createPerson, createRelationship } from "@/server/actions/kinfolk/mutations";
import type { Person } from "@/server/db/schema";
import { UserPlus, Search, Check, Plus, AlertTriangle } from "lucide-react";

// --- Types ---

export type RelationshipContext = {
	/** The person we're adding a relationship TO */
	personId: string;
	personName: string;
	/** Pre-selected relationship type */
	type: "parent" | "child" | "spouse" | "partner" | "sibling";
};

interface AddPersonDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	familyId: string;
	allPeople: Person[];
	/** Pre-fill relationship context (e.g. "Add child of John") */
	relationshipContext?: RelationshipContext;
}

// --- Fuzzy matching ---

function scorePerson(query: string, person: Person): number {
	const q = query.toLowerCase().trim();
	if (!q) return 0;
	const full = `${person.firstName} ${person.lastName}`.toLowerCase();
	const first = person.firstName.toLowerCase();
	const last = person.lastName.toLowerCase();
	const nick = person.nickname?.toLowerCase() ?? "";
	const maiden = person.maidenName?.toLowerCase() ?? "";

	// Exact full name match
	if (full === q) return 100;
	// First or last exact match
	if (first === q || last === q) return 80;
	// Starts with
	if (full.startsWith(q)) return 70;
	if (first.startsWith(q) || last.startsWith(q)) return 60;
	// Nickname/maiden match
	if (nick === q || maiden === q) return 55;
	if (nick.startsWith(q) || maiden.startsWith(q)) return 50;
	// Contains
	if (full.includes(q)) return 40;
	if (nick.includes(q) || maiden.includes(q)) return 30;

	// Multi-word: check if all words match somewhere
	const words = q.split(/\s+/);
	const fields = [full, nick, maiden].join(" ");
	if (words.every((w) => fields.includes(w))) return 25;

	return 0;
}

// --- Component ---

export function AddPersonDialog({
	open,
	onOpenChange,
	familyId,
	allPeople,
	relationshipContext,
}: AddPersonDialogProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	// Error state
	const [error, setError] = useState<string | null>(null);

	// Form state
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [gender, setGender] = useState("");
	const [birthdate, setBirthdate] = useState("");

	// Relationship
	const [relType, setRelType] = useState(relationshipContext?.type ?? "");
	const [relPersonId, setRelPersonId] = useState(relationshipContext?.personId ?? "");

	// Existing person linking (instead of creating new)
	const [linkExisting, setLinkExisting] = useState<Person | null>(null);

	// Step: "search" (showing suggestions) or "create" (filling details)
	const [step, setStep] = useState<"search" | "create">("search");

	// Reset on open/close
	useEffect(() => {
		if (open) {
			setFirstName("");
			setLastName("");
			setGender("");
			setBirthdate("");
			setRelType(relationshipContext?.type ?? "");
			setRelPersonId(relationshipContext?.personId ?? "");
			setLinkExisting(null);
			setStep("search");
			setError(null);
		}
	}, [open, relationshipContext]);

	// Search query from first + last name
	const query = `${firstName} ${lastName}`.trim();

	// Fuzzy-matched suggestions
	const suggestions = useMemo(() => {
		if (!query || query.length < 2) return [];
		return allPeople
			.map((p) => ({ person: p, score: scorePerson(query, p) }))
			.filter((s) => s.score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, 8)
			.map((s) => s.person);
	}, [query, allPeople]);

	// Is the current name an exact duplicate?
	const exactDuplicate = useMemo(() => {
		if (!firstName.trim() || !lastName.trim()) return null;
		return allPeople.find(
			(p) =>
				p.firstName.toLowerCase() === firstName.trim().toLowerCase() &&
				p.lastName.toLowerCase() === lastName.trim().toLowerCase(),
		);
	}, [firstName, lastName, allPeople]);

	const handleLinkExisting = useCallback(
		(person: Person) => {
			setLinkExisting(person);
			setStep("create"); // reuse "create" step to confirm
		},
		[],
	);

	const handleCreateNew = useCallback(() => {
		setLinkExisting(null);
		setStep("create");
	}, []);

	const handleSubmit = useCallback(async () => {
		startTransition(async () => {
			setError(null);
			try {
				if (linkExisting) {
					// Just create the relationship to the existing person
					if (relType && relPersonId) {
						await createRelationship({
							personId: linkExisting.id,
							relatedId: relPersonId,
							type: relType,
						});
					}
				} else {
					// Create new person
					const newPerson = await createPerson({
						familyId,
						firstName: firstName.trim(),
						lastName: lastName.trim(),
						middleName: null,
						maidenName: null,
						nickname: null,
						gender: gender || null,
						birthdate: birthdate || null,
					});

					// Add relationship if specified
					if (relType && relPersonId && newPerson) {
						await createRelationship({
							personId: newPerson.id,
							relatedId: relPersonId,
							type: relType,
						});
					}
				}

				onOpenChange(false);
				router.refresh();
			} catch (err) {
				console.error("Failed to add person:", err);
				setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
			}
		});
	}, [linkExisting, relType, relPersonId, familyId, firstName, lastName, gender, birthdate, onOpenChange, router]);

	const contextLabel = relationshipContext
		? `${friendlyRelType(relationshipContext.type)} ${relationshipContext.personName}`
		: null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<UserPlus className="h-5 w-5" />
						{contextLabel ? `Add ${contextLabel}` : "Add Person"}
					</DialogTitle>
					<DialogDescription>
						{step === "search"
							? "Start typing to find an existing person or create someone new."
							: linkExisting
								? `Link ${linkExisting.firstName} ${linkExisting.lastName} to the family tree.`
								: "Fill in the details for the new person."}
					</DialogDescription>
				</DialogHeader>

				{step === "search" ? (
					<div className="space-y-4">
						{/* Name inputs with live search */}
						<div className="grid grid-cols-2 gap-3">
							<div>
								<Label htmlFor="ap-first">First Name</Label>
								<Input
									id="ap-first"
									value={firstName}
									onChange={(e) => setFirstName(e.target.value)}
									placeholder="First name"
									autoFocus
								/>
							</div>
							<div>
								<Label htmlFor="ap-last">Last Name</Label>
								<Input
									id="ap-last"
									value={lastName}
									onChange={(e) => setLastName(e.target.value)}
									placeholder="Last name"
								/>
							</div>
						</div>

						{/* Duplicate warning */}
						{exactDuplicate && (
							<div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm dark:border-yellow-800 dark:bg-yellow-950">
								<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
								<div>
									<span className="font-medium">{exactDuplicate.firstName} {exactDuplicate.lastName}</span> already exists.
									<button
										type="button"
										className="ml-1 font-medium text-yellow-700 underline underline-offset-2 hover:text-yellow-800 dark:text-yellow-400"
										onClick={() => handleLinkExisting(exactDuplicate)}
									>
										Link this person instead?
									</button>
								</div>
							</div>
						)}

						{/* Suggestions */}
						{suggestions.length > 0 && !exactDuplicate && (
							<div>
								<div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
									<Search className="h-3 w-3" />
									Existing people matching "{query}"
								</div>
								<div className="max-h-48 space-y-1 overflow-auto">
									{suggestions.map((p) => (
										<button
											key={p.id}
											type="button"
											className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
											onClick={() => handleLinkExisting(p)}
										>
											<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
												{p.firstName[0]}{p.lastName[0]}
											</div>
											<div>
												<div className="font-medium">{p.firstName} {p.lastName}</div>
												{p.nickname && (
													<div className="text-xs text-muted-foreground">"{p.nickname}"</div>
												)}
											</div>
										</button>
									))}
								</div>
							</div>
						)}

						{/* Action buttons */}
						<div className="flex gap-2 pt-2">
							<Button
								onClick={handleCreateNew}
								disabled={!firstName.trim() || !lastName.trim()}
								className="flex-1"
							>
								<Plus className="mr-1.5 h-4 w-4" />
								Create New Person
							</Button>
						</div>
					</div>
				) : (
					<div className="space-y-4">
						{linkExisting ? (
							/* Linking existing person — just confirm relationship */
							<div className="rounded-md border bg-muted/50 p-4">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
										{linkExisting.firstName[0]}{linkExisting.lastName[0]}
									</div>
									<div>
										<div className="font-medium">{linkExisting.firstName} {linkExisting.lastName}</div>
										{linkExisting.birthdate && (
											<div className="text-xs text-muted-foreground">
												b. {new Date(linkExisting.birthdate).getFullYear()}
											</div>
										)}
									</div>
								</div>
							</div>
						) : (
							/* Creating new person — extra optional fields */
							<>
								<div className="grid grid-cols-2 gap-3">
									<div>
										<Label>First Name</Label>
										<Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
									</div>
									<div>
										<Label>Last Name</Label>
										<Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
									</div>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div>
										<Label>Gender</Label>
										<Select value={gender} onValueChange={setGender}>
											<SelectTrigger>
												<SelectValue placeholder="Optional" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="male">Male</SelectItem>
												<SelectItem value="female">Female</SelectItem>
												<SelectItem value="other">Other</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div>
										<Label>Birthdate</Label>
										<Input
											type="date"
											value={birthdate}
											onChange={(e) => setBirthdate(e.target.value)}
										/>
									</div>
								</div>
							</>
						)}

						{/* Relationship picker — shown unless context pre-fills it */}
						{!relationshipContext && (
							<div className="rounded-md border p-3">
								<Label className="mb-2 block text-xs font-medium text-muted-foreground">
									Relationship (optional)
								</Label>
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
						)}

						{relationshipContext && (
							<div className="rounded-md border bg-muted/30 p-3 text-sm">
								Will be added as <span className="font-medium">{friendlyRelType(relationshipContext.type)}</span>{" "}
								<span className="font-medium">{relationshipContext.personName}</span>
							</div>
						)}

						{/* Error message */}
						{error && (
							<div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
								<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
								{error}
							</div>
						)}

						{/* Actions */}
						<div className="flex gap-2 pt-2">
							<Button variant="outline" onClick={() => setStep("search")} className="flex-1">
								Back
							</Button>
							<Button
								onClick={handleSubmit}
								disabled={isPending || (!linkExisting && (!firstName.trim() || !lastName.trim()))}
								className="flex-1"
							>
								{isPending ? (
									"Saving..."
								) : (
									<>
										<Check className="mr-1.5 h-4 w-4" />
										{linkExisting ? "Link Person" : "Add Person"}
									</>
								)}
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

// --- Helpers ---

function friendlyRelType(type: string): string {
	switch (type) {
		case "parent": return "parent of";
		case "child": return "child of";
		case "spouse": return "spouse of";
		case "sibling": return "sibling of";
		case "partner": return "partner of";
		default: return type;
	}
}

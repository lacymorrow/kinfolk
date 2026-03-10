"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddPersonDialog, type RelationshipContext } from "./add-person-dialog";
import type { Person } from "@/server/db/schema";

interface AddRelationshipButtonsProps {
	person: Person;
	familyId: string;
	allPeople: Person[];
}

const QUICK_ACTIONS: {
	label: string;
	type: RelationshipContext["type"];
}[] = [
	{ label: "Add Parent", type: "child" },
	{ label: "Add Child", type: "parent" },
	{ label: "Add Spouse", type: "spouse" },
	{ label: "Add Sibling", type: "sibling" },
];

export function AddRelationshipButtons({
	person,
	familyId,
	allPeople,
}: AddRelationshipButtonsProps) {
	const [open, setOpen] = useState(false);
	const [context, setContext] = useState<RelationshipContext | undefined>();

	const handleClick = (type: RelationshipContext["type"]) => {
		setContext({
			personId: person.id,
			personName: `${person.firstName} ${person.lastName}`,
			type,
		});
		setOpen(true);
	};

	return (
		<>
			<div className="flex flex-wrap gap-2">
				{QUICK_ACTIONS.map((action) => (
					<Button
						key={action.type}
						variant="outline"
						size="sm"
						onClick={() => handleClick(action.type)}
					>
						<Plus className="mr-1 h-3.5 w-3.5" />
						{action.label}
					</Button>
				))}
			</div>
			<AddPersonDialog
				open={open}
				onOpenChange={setOpen}
				familyId={familyId}
				allPeople={allPeople}
				relationshipContext={context}
			/>
		</>
	);
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteEvent } from "@/server/actions/kinfolk/events";

export const EventActions = ({ eventId }: { eventId: string }) => {
	const router = useRouter();
	const [deleting, setDeleting] = useState(false);

	const handleDelete = async () => {
		if (!confirm("Delete this event?")) return;
		setDeleting(true);
		await deleteEvent(eventId);
		router.push("/kinfolk/events");
	};

	return (
		<Button variant="destructive" size="sm" disabled={deleting} onClick={handleDelete}>
			{deleting ? "Deleting..." : "Delete"}
		</Button>
	);
};

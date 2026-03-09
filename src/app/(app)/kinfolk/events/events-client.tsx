"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { createEvent } from "@/server/actions/kinfolk/events";
import { useRealtimeSubscription, KINFOLK_TABLES } from "@/hooks/use-realtime";
import type { KinfolkEvent } from "@/server/db/schema";

const EVENT_TYPES = [
	{ value: "birth", label: "Birth" },
	{ value: "marriage", label: "Marriage" },
	{ value: "graduation", label: "Graduation" },
	{ value: "death", label: "Death" },
	{ value: "reunion", label: "Reunion" },
	{ value: "move", label: "Move" },
	{ value: "custom", label: "Custom" },
];

const typeColors: Record<string, string> = {
	birth: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
	marriage: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
	graduation: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
	death: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
	reunion: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
	move: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
	custom: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

interface EventsClientProps {
	events: KinfolkEvent[];
	familyId: string;
}

export const EventsClient = ({ events, familyId }: EventsClientProps) => {
	useRealtimeSubscription([KINFOLK_TABLES.kinfolkEvent]);

	const router = useRouter();
	const [filter, setFilter] = useState("all");
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);

	const filtered = filter === "all" ? events : events.filter((e) => e.type === filter);

	const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setSaving(true);
		const fd = new FormData(e.currentTarget);
		try {
			await createEvent({
				familyId,
				type: fd.get("type") as string,
				title: fd.get("title") as string,
				description: (fd.get("description") as string) || null,
				date: (fd.get("date") as string) || null,
				location: (fd.get("location") as string) || null,
			});
			setOpen(false);
			router.refresh();
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold tracking-tight">Events Timeline</h1>
				<Dialog open={open} onOpenChange={setOpen}>
					<DialogTrigger asChild>
						<Button>New Event</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Create Event</DialogTitle>
						</DialogHeader>
						<form onSubmit={handleCreate} className="space-y-4">
							<div>
								<Label htmlFor="ev-title">Title</Label>
								<Input id="ev-title" name="title" required />
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label>Type</Label>
									<Select name="type" defaultValue="custom">
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{EVENT_TYPES.map((t) => (
												<SelectItem key={t.value} value={t.value}>
													{t.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label htmlFor="ev-date">Date</Label>
									<Input id="ev-date" name="date" type="date" />
								</div>
							</div>
							<div>
								<Label htmlFor="ev-location">Location</Label>
								<Input id="ev-location" name="location" />
							</div>
							<div>
								<Label htmlFor="ev-description">Description</Label>
								<Textarea id="ev-description" name="description" rows={3} />
							</div>
							<Button type="submit" disabled={saving} className="w-full">
								{saving ? "Creating..." : "Create Event"}
							</Button>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			{/* Filter */}
			<div className="mb-6 flex flex-wrap gap-2">
				<Button
					variant={filter === "all" ? "default" : "outline"}
					size="sm"
					onClick={() => setFilter("all")}
				>
					All
				</Button>
				{EVENT_TYPES.map((t) => (
					<Button
						key={t.value}
						variant={filter === t.value ? "default" : "outline"}
						size="sm"
						onClick={() => setFilter(t.value)}
					>
						{t.label}
					</Button>
				))}
			</div>

			{/* Timeline */}
			{filtered.length === 0 ? (
				<div className="flex min-h-[30vh] items-center justify-center">
					<p className="text-muted-foreground">
						{events.length === 0 ? "No events yet. Create one to get started." : "No events match this filter."}
					</p>
				</div>
			) : (
				<div className="relative space-y-4 border-l-2 border-muted pl-6">
					{filtered.map((event) => (
						<div key={event.id} className="relative">
							<div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-background bg-primary" />
							<Link href={`/kinfolk/events/${event.id}`}>
								<Card className="transition-colors hover:bg-muted/50">
									<CardContent className="p-4">
										<div className="mb-1 flex items-center gap-2">
											<Badge className={typeColors[event.type] ?? typeColors.custom} variant="secondary">
												{event.type}
											</Badge>
											{event.date && (
												<span className="text-sm text-muted-foreground">
													{new Date(event.date).toLocaleDateString()}
												</span>
											)}
										</div>
										<h3 className="font-semibold">{event.title}</h3>
										{event.description && (
											<p className="mt-1 text-sm text-muted-foreground line-clamp-2">
												{event.description}
											</p>
										)}
										{event.location && (
											<p className="mt-1 text-xs text-muted-foreground">
												{event.location}
											</p>
										)}
									</CardContent>
								</Card>
							</Link>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

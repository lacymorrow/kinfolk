import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventWithPeople } from "@/server/actions/kinfolk/events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EVENT_TYPE_COLORS } from "@/lib/kinfolk/event-types";
import { Badge } from "@/components/ui/badge";
import { EventActions } from "./event-actions";

export default async function EventDetailPage({
	params,
}: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const event = await getEventWithPeople(id);
	if (!event) return notFound();

	return (
		<div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
			<Link href="/kinfolk/events" className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground">
				&larr; Back to Events
			</Link>

			<div className="mb-6 flex items-start justify-between">
				<div>
					<div className="mb-2 flex items-center gap-2">
						<Badge className={EVENT_TYPE_COLORS[event.type] ?? EVENT_TYPE_COLORS.custom} variant="secondary">
							{event.type}
						</Badge>
						{event.date && (
							<span className="text-sm text-muted-foreground">
								{new Date(event.date).toLocaleDateString("en-US", {
									year: "numeric",
									month: "long",
									day: "numeric",
								})}
							</span>
						)}
					</div>
					<h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
					{event.location && (
						<p className="mt-1 text-muted-foreground">{event.location}</p>
					)}
				</div>
				<EventActions eventId={event.id} />
			</div>

			{event.description && (
				<p className="mb-8 text-muted-foreground">{event.description}</p>
			)}

			<div className="grid gap-6 md:grid-cols-2">
				{/* Linked People */}
				{event.people.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>People</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							{event.people.map(({ eventPerson, person }) => (
								<div key={eventPerson.id} className="flex items-center justify-between">
									<Link
										href={`/kinfolk/person/${person.id}`}
										className="text-sm text-primary hover:underline"
									>
										{person.firstName} {person.lastName}
									</Link>
									<Badge variant="outline" className="text-xs capitalize">
										{eventPerson.role}
									</Badge>
								</div>
							))}
						</CardContent>
					</Card>
				)}


			</div>
		</div>
	);
}

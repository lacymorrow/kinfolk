import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventWithPeople } from "@/server/actions/kinfolk/events";
import { getPhotosByEvent } from "@/server/actions/kinfolk/photos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventActions } from "./event-actions";

export default async function EventDetailPage({
	params,
}: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const event = await getEventWithPeople(id);
	if (!event) return notFound();

	const eventPhotos = await getPhotosByEvent(id);

	const typeColors: Record<string, string> = {
		birth: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
		marriage: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
		graduation: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
		death: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
		reunion: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
		move: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
		custom: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
	};

	return (
		<div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
			<Link href="/kinfolk/events" className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground">
				&larr; Back to Events
			</Link>

			<div className="mb-6 flex items-start justify-between">
				<div>
					<div className="mb-2 flex items-center gap-2">
						<Badge className={typeColors[event.type] ?? typeColors.custom} variant="secondary">
							{event.type}
						</Badge>
						{event.date && (
							<span className="text-sm text-muted-foreground">
								{new Date(event.date).toLocaleDateString()}
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

				{/* Event Photos */}
				{eventPhotos.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>Photos</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-3 gap-2">
								{eventPhotos.map((photo) => (
									<img
										key={photo.id}
										src={photo.thumbnailUrl ?? photo.url}
										alt={photo.caption ?? "Event photo"}
										className="aspect-square rounded-md object-cover"
									/>
								))}
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}

import { getEvents } from "@/server/actions/kinfolk/events";
import { getFirstFamily } from "@/server/actions/kinfolk/queries";
import { EventsClient } from "./events-client";

export default async function EventsPage() {
	const family = await getFirstFamily();
	if (!family) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center">
				<p className="text-muted-foreground">No family data found.</p>
			</div>
		);
	}

	const events = await getEvents(family.id);

	return <EventsClient events={events} familyId={family.id} />;
}

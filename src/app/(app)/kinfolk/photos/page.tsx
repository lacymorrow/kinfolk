import { getPhotos } from "@/server/actions/kinfolk/photos";
import { getFirstFamily, getPeople } from "@/server/actions/kinfolk/queries";
import { PhotosClient } from "./photos-client";

export default async function PhotosPage() {
	const family = await getFirstFamily();
	if (!family) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center">
				<p className="text-muted-foreground">No family data found.</p>
			</div>
		);
	}

	const [allPhotos, peopleRows] = await Promise.all([
		getPhotos(family.id),
		getPeople(family.id),
	]);

	const people = peopleRows.map((r) => r.person);

	return <PhotosClient photos={allPhotos} familyId={family.id} people={people} />;
}

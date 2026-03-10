import { getPhotos } from "@/server/actions/kinfolk/photos";
import { getFirstFamily } from "@/server/actions/kinfolk/queries";
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

	const allPhotos = await getPhotos(family.id);

	return <PhotosClient photos={allPhotos} familyId={family.id} />;
}

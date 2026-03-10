import { getPosts } from "@/server/actions/kinfolk/posts";
import { getFirstFamily } from "@/server/actions/kinfolk/queries";
import { FeedClient } from "./feed-client";

export default async function FeedPage() {
	const family = await getFirstFamily();
	if (!family) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center">
				<p className="text-muted-foreground">No family data found.</p>
			</div>
		);
	}

	const postRows = await getPosts(family.id);

	return <FeedClient posts={postRows} familyId={family.id} />;
}

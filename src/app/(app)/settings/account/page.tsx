import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DeleteAccountCard } from "@/app/(app)/settings/_components/delete-account-card";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { constructMetadata } from "@/config/metadata";
import { routes } from "@/config/routes";
import { auth } from "@/server/auth";

export const metadata: Metadata = constructMetadata({
	title: "Account Settings",
	description: "Manage your account preferences.",
});

export default async function AccountPage() {
	const session = await auth();
	if (!session?.user) redirect(routes.auth.signIn);

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">Account</h3>
				<p className="text-sm text-muted-foreground">Manage your account settings.</p>
			</div>
			<Separator />

			<Card>
				<CardHeader>
					<CardTitle>Account Info</CardTitle>
					<CardDescription>Your account details.</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<p className="text-sm">
							<span className="font-medium">Email:</span> {session.user.email}
						</p>
						{session.user.name && (
							<p className="text-sm">
								<span className="font-medium">Name:</span> {session.user.name}
							</p>
						)}
					</div>
				</CardContent>
			</Card>

			<DeleteAccountCard />
		</div>
	);
}

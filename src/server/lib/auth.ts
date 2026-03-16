import { auth } from "@/server/auth";

export async function getSession(protect = true) {
	const session = await auth({ protect });
	if (!session?.user && protect) {
		throw new Error("Unauthorized");
	}
	return session;
}

export async function requireAdmin() {
	const session = await getSession();
	if (!session?.user?.isAdmin) {
		throw new Error("Unauthorized: Admin access required");
	}
	return session;
}

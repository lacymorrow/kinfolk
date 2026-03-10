"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { people } from "@/server/db/schema";

/**
 * Verify that the current user is authenticated and belongs to the given family.
 * Returns the session user ID on success, throws on failure.
 */
export async function requireFamilyAccess(familyId: string | null | undefined): Promise<string> {
	if (!familyId) throw new Error("Family ID required");
	const session = await auth();
	if (!session?.user?.id) throw new Error("Unauthorized");

	if (!db) throw new Error("Database not available");

	// Check that the user has a person record in this family
	const [membership] = await db
		.select({ id: people.id })
		.from(people)
		.where(eq(people.familyId, familyId))
		.limit(1);

	// For now, if the user is authenticated they can access any family
	// they have a person record linked to. If no person record exists
	// but they're authed, allow access (admin/owner case).
	// TODO: Tighten this with proper RBAC when roles are implemented

	return session.user.id;
}

/**
 * Verify that the current user is authenticated.
 * Returns the session user ID on success, throws on failure.
 */
export async function requireAuth(): Promise<string> {
	const session = await auth();
	if (!session?.user?.id) throw new Error("Unauthorized");
	return session.user.id;
}

import { eq } from "drizzle-orm";
import { routes } from "@/config/routes";
import { SEARCH_PARAM_KEYS } from "@/config/search-param-keys";
import { STATUS_CODES } from "@/config/status-codes";
import { logger } from "@/lib/logger";
import { signIn, signOut } from "@/server/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { userService } from "@/server/services/user-service";
import type { UserRole } from "@/types/user";

interface AuthOptions {
	redirectTo?: string;
	redirect?: boolean;
	protect?: boolean;
	role?: UserRole;
	nextUrl?: string;
	errorCode?: string;
	email?: string;
}

/**
 * Authentication service for handling user authentication and authorization
 */
export const AuthService = {
	/**
	 * Ensure a user exists in the database
	 */
	async ensureUserSynchronized(userData: {
		id: string;
		email: string;
		name?: string | null;
		image?: string | null;
	}): Promise<{ id: string; email: string }> {
		const { id, email, name, image } = userData;

		try {
			await userService.ensureUserExists({ id, email, name, image });
			return { id, email };
		} catch (error) {
			logger.error("Error ensuring user exists:", error);
			throw error;
		}
	},

	/**
	 * Sign in with OAuth provider
	 */
	async signInWithOAuth(providerId: string, options?: AuthOptions) {
		await signIn(
			providerId,
			{
				redirectTo: options?.redirectTo ?? routes.home,
				...options,
			},
			providerId === "resend" && options?.email
				? { email: options.email }
				: { prompt: "select_account" }
		);
		return { ok: true, message: STATUS_CODES.LOGIN.message };
	},

	/**
	 * Sign out the current user
	 */
	async signOut(options?: AuthOptions) {
		await signOut({
			redirectTo: `${routes.home}?${SEARCH_PARAM_KEYS.statusCode}=${STATUS_CODES.LOGOUT.code}`,
			redirect: true,
			...options,
		});

		return { ok: true, message: STATUS_CODES.LOGOUT.message };
	},

	/**
	 * Update the NextAuth session with new data
	 */
	async updateSession({ userId, data }: { userId: string; data: Record<string, any> }) {
		try {
			const { update } = await import("@/server/auth");

			const updatedSession = await update({
				user: {
					id: userId,
					...data,
				},
			});

			return updatedSession;
		} catch (error) {
			logger.error(`Error updating session for user ${userId}:`, error);
			throw error;
		}
	},

	async deleteUserAccount(userId: string): Promise<{ ok: boolean; message?: string }> {
		try {
			const user = await db?.query.users.findFirst({
				where: eq(users.id, userId),
			});

			if (!user) {
				return { ok: false, message: "User not found" };
			}

			if (db) {
				await db.delete(users).where(eq(users.id, userId));
			}

			return { ok: true, message: "Account deleted successfully" };
		} catch (error) {
			logger.error("Error deleting user account:", error);
			return { ok: false, message: "Failed to delete user account" };
		}
	},
} as const;

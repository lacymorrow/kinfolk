"use server";

import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import type { User } from "@/server/db/schema";
import { users } from "@/server/db/schema";

/**
 * Service for managing users
 */
export class UserService {
	/**
	 * Ensures a user exists in the database, creating them if necessary.
	 */
	async ensureUserExists(authUser: {
		id: string;
		email: string;
		name?: string | null;
		image?: string | null;
	}) {
		if (!db) {
			throw new Error("Database is not initialized");
		}

		if (!authUser.email) {
			throw new Error("User does not have a primary email");
		}

		const normalizedEmail = authUser.email.toLowerCase();

		let dbUser = await db.query.users.findFirst({
			where: eq(users.email, normalizedEmail),
		});

		if (!dbUser) {
			const [newUser] = await db
				.insert(users)
				.values({
					id: authUser.id,
					email: normalizedEmail,
					name: authUser.name ?? null,
					image: authUser.image ?? null,
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.returning();

			if (!newUser) {
				throw new Error(`Failed to create user: ${authUser.id}`);
			}

			dbUser = newUser;
		} else {
			const needsUpdate =
				(authUser.name !== undefined && authUser.name !== dbUser.name) ||
				(authUser.image !== undefined && authUser.image !== dbUser.image);

			if (needsUpdate) {
				const updateData: Partial<typeof users.$inferInsert> = {
					updatedAt: new Date(),
				};

				if (authUser.name !== undefined && authUser.name !== dbUser.name) {
					updateData.name = authUser.name;
				}

				if (authUser.image !== undefined && authUser.image !== dbUser.image) {
					updateData.image = authUser.image;
				}

				const [updatedUser] = await db
					.update(users)
					.set(updateData)
					.where(eq(users.id, authUser.id))
					.returning();

				if (updatedUser) {
					dbUser = updatedUser;
				}
			}
		}

		return dbUser;
	}

	/**
	 * Gets a user by their email address.
	 */
	async getUserByEmail(email: string) {
		if (!db) {
			throw new Error("Database is not initialized");
		}

		return db.query.users.findFirst({
			where: eq(users.email, email.toLowerCase()),
		});
	}

	/**
	 * Updates a user's profile information.
	 */
	async updateProfile(
		userId: string,
		data: {
			name?: string | null;
			image?: string | null;
		}
	) {
		if (!db) {
			throw new Error("Database is not initialized");
		}

		const [user] = await db
			.update(users)
			.set({
				...data,
				updatedAt: new Date(),
			})
			.where(eq(users.id, userId))
			.returning();

		return user;
	}

	/**
	 * Finds a user by email or creates one if they don't exist.
	 */
	async findOrCreateUserByEmail(
		email: string,
		userData?: { name?: string | null; image?: string | null }
	): Promise<{ user: User; created: boolean }> {
		if (!db) {
			throw new Error("Database is not initialized");
		}
		if (!email) {
			throw new Error("Email is required to find or create a user.");
		}

		const normalizedEmail = email.toLowerCase();

		return await db.transaction(async (tx) => {
			let user = await tx.query.users.findFirst({
				where: eq(users.email, normalizedEmail),
			});

			if (user) {
				logger.debug("Found existing user by email.", {
					email: normalizedEmail,
					userId: user.id,
				});
				return { user, created: false };
			}

			logger.info("User not found by email, creating new user.", { email: normalizedEmail });
			const newUserId = crypto.randomUUID();

			const [newUserRecord] = await tx
				.insert(users)
				.values({
					id: newUserId,
					email: normalizedEmail,
					name: userData?.name ?? null,
					image: userData?.image ?? null,
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.returning();

			if (!newUserRecord) {
				throw new Error(`Failed to create user with email: ${normalizedEmail}`);
			}

			return { user: newUserRecord, created: true };
		});
	}
}

export const userService = new UserService();

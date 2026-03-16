import { eq } from "drizzle-orm";
import type { NextAuthConfig } from "next-auth";
import { routes } from "@/config/routes";
import { SEARCH_PARAM_KEYS } from "@/config/search-param-keys";
import { logger } from "@/lib/logger";
import { providers } from "@/server/auth-js/auth-providers.config";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { userService } from "@/server/services/user-service";
import type { User } from "@/types/user";

/** Simple admin check — matches by email or role */
async function isAdmin(opts: { email?: string | null; userId?: string }): Promise<boolean> {
	const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ?? [];
	if (opts.email && adminEmails.includes(opts.email.toLowerCase())) return true;
	if (opts.userId && db) {
		const user = await db.query.users.findFirst({ where: eq(users.id, opts.userId) });
		if (user?.role === "admin") return true;
	}
	return false;
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthConfig = {
	debug: process.env.DEBUG_AUTH === "true",
	providers,
	pages: {
		error: routes.auth.error,
		signIn: routes.auth.signIn,
		signOut: routes.auth.signOut,
	},
	session: {
		strategy: "jwt",
		maxAge: 30 * 24 * 60 * 60, // 30 days
		updateAge: 24 * 60 * 60, // 24 hours
	},
	// cookies: {
	// 	sessionToken: {
	// 		name:
	// 			process.env.NODE_ENV === "production"
	// 				? "__Secure-next-auth.session-token"
	// 				: "next-auth.session-token",
	// 		options: {
	// 			httpOnly: true,
	// 			sameSite: "lax",
	// 			path: "/",
	// 			secure: process.env.NODE_ENV === "production",
	// 		},
	// 	},
	// },
	callbacks: {
		async signIn({ user, account, profile }) {
			if (!user.id) return false;

			// Handle guest user sign-in
			if (account?.provider === "guest") {
				return true;
			}

			// Ensure user exists in the database
			try {
				await userService.ensureUserExists({
					id: user.id,
					email: user.email!,
					name: profile?.name || user.name,
					image: (profile as any)?.image || (profile as any)?.picture || user.image,
				});
			} catch (error) {
				console.error("Error ensuring user exists:", error);
			}

			return true;
		},
		async redirect({ url, baseUrl }) {
			// Handle the nextUrl parameter for redirects
			const redirectUrl = new URL(url, baseUrl);
			const nextUrl = redirectUrl.searchParams.get(SEARCH_PARAM_KEYS.nextUrl);

			if (nextUrl) {
				// Ensure it's a relative URL for security
				if (nextUrl.startsWith("/")) {
					return `${baseUrl}${nextUrl}`;
				}
			}

			// Default redirect
			if (url.startsWith("/")) return `${baseUrl}${url}`;
			if (new URL(url).origin === baseUrl) return url;
			return baseUrl;
		},
		async jwt({ token, user, account, trigger, session }) {
			if (user) {
				token.id = user.id;
				token.name = user.name;
				token.email = user.email;

				token.isAdmin = await isAdmin({ email: user.email, userId: user.id });

				const typedUser = user as User;
				if ("image" in typedUser) token.image = typedUser.image;
				if ("role" in typedUser) token.role = typedUser.role;
				if ("createdAt" in typedUser)
					token.createdAt = typedUser.createdAt
						? new Date(typedUser.createdAt).toISOString()
						: undefined;
				if ("updatedAt" in typedUser)
					token.updatedAt = typedUser.updatedAt
						? new Date(typedUser.updatedAt).toISOString()
						: undefined;

				if (account?.provider === "guest") {
					token.isGuest = true;
				}

				if ("bio" in typedUser) token.bio = typedUser.bio;
				if ("theme" in typedUser) token.theme = typedUser.theme;
				if ("emailVerified" in typedUser)
					token.emailVerified = typedUser.emailVerified
						? new Date(typedUser.emailVerified).toISOString()
						: null;
			}

			if (session?.user?.accounts) {
				token.accounts = session.user.accounts;
			}

			if (trigger === "update" && session) {
				if (session.theme) token.theme = session.theme;
				if (session.name) token.name = session.name;
				if (session.bio) token.bio = session.bio;
			}
			return token;
		},
		async session({ session, token, user }) {
			if (token?.id) {
				session.user.id = token.id as string;
				session.user.name = token.name as string | null;
				session.user.email = token.email ?? "";
				session.user.emailVerified = token.emailVerified
					? new Date(token.emailVerified as unknown as string | number | Date)
					: null;
				session.user.image = (token.image as string | null) ?? session.user.image ?? null;
				session.user.role = token.role as import("@/types/user").UserRole;
				session.user.theme = token.theme as "light" | "dark" | "system" | undefined;
				session.user.bio = token.bio as string | null;
				session.user.createdAt = token.createdAt
					? new Date(token.createdAt as unknown as string | number | Date)
					: undefined;
				session.user.updatedAt = token.updatedAt
					? new Date(token.updatedAt as unknown as string | number | Date)
					: undefined;
				session.user.metadata = token.metadata as string | null;
				session.user.isGuest = token.isGuest as boolean | undefined;
				session.user.isAdmin = token.isAdmin as boolean | undefined;
				session.user.accounts = token.accounts as {
					provider: string;
					providerAccountId: string;
				}[];
			}

			if (!token?.id && user) {
				const typedUser = user as User;
				session.user.id = typedUser.id;
				session.user.name = typedUser.name;
				session.user.email = typedUser.email ?? "";
				session.user.emailVerified = typedUser.emailVerified ?? null;
				session.user.image = typedUser.image ?? null;
				session.user.role = typedUser.role ?? session.user.role;
				session.user.theme = typedUser.theme ?? session.user.theme;
				session.user.bio = typedUser.bio ?? session.user.bio;
				session.user.createdAt = typedUser.createdAt ?? session.user.createdAt;
				session.user.updatedAt = typedUser.updatedAt ?? session.user.updatedAt;
				session.user.isAdmin = await isAdmin({
					email: typedUser.email,
					userId: typedUser.id,
				});
			}

			if (!session.user.accounts && user && !session.user.isGuest) {
				try {
					const accts = await db?.query.accounts.findMany({
						where: (accounts, { eq }) => eq(accounts.userId, user.id),
						columns: {
							provider: true,
							providerAccountId: true,
						},
					});

					if (accts) {
						session.user.accounts = accts;
					}
				} catch (error) {
					console.error("Error fetching user accounts:", error);
				}
			}

			return session;
		},
	},
} satisfies NextAuthConfig;

"use server";

import { AuthService } from "@/server/services/auth-service";
import type { UserRole } from "@/types/user";

export interface AuthOptions {
	redirectTo?: string;
	redirect?: boolean;
	protect?: boolean;
	role?: UserRole;
	nextUrl?: string;
	errorCode?: string;
	email?: string;
}

export const signInWithOAuthAction = async ({
	providerId,
	options,
}: {
	providerId: string;
	options?: AuthOptions;
}) => {
	return await AuthService.signInWithOAuth(providerId, options);
};

export const signOutAction = async (options?: AuthOptions) => {
	return await AuthService.signOut(options);
};

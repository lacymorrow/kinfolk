import { AuthForm } from "@/app/(app)/(authentication)/_components/auth-form";
import { GuestForm } from "@/app/(app)/(authentication)/_components/guest-form";
import { env } from "@/env";

export const SignIn = () => {
	// Special handling for guest-only mode
	const isGuestOnlyMode =
		!!env.NEXT_PUBLIC_FEATURE_AUTH_GUEST_ENABLED && !env.NEXT_PUBLIC_FEATURE_AUTH_METHODS_ENABLED;
	if (isGuestOnlyMode) {
		return (
			<AuthForm
				mode="sign-in"
				withFooter={false}
				title="Welcome"
				description="Enter your name to get started"
			>
				<GuestForm />
			</AuthForm>
		);
	}

	return <AuthForm mode="sign-in" withFooter={false} />;
};

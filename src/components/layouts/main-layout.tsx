import type React from "react";
import { cn } from "@/lib/utils";

export default function MainLayout({
	children,
	className,
	header,
	footer,
}: {
	children: React.ReactNode;
	header?: React.ReactNode;
	footer?: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("", className)}>
			{header}
			{children}
			{footer}
		</div>
	);
}

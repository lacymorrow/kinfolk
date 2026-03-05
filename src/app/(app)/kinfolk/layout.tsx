import Link from "next/link";
import { type ReactNode } from "react";

const navItems = [
	{ href: "/kinfolk/tree", label: "Family Tree" },
	{ href: "/kinfolk/directory", label: "Directory" },
	{ href: "/kinfolk/admin/family", label: "Manage" },
];

export default function KinfolkLayout({ children }: { children: ReactNode }) {
	return (
		<div className="min-h-screen">
			<header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
				<div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
					<Link href="/kinfolk/directory" className="text-lg font-bold tracking-tight">
						Kinfolk
					</Link>
					<nav className="flex items-center gap-4">
						{navItems.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className="text-sm text-muted-foreground transition-colors hover:text-foreground"
							>
								{item.label}
							</Link>
						))}
					</nav>
				</div>
			</header>
			{children}
		</div>
	);
}

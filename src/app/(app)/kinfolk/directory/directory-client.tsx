"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { exportVCard, exportCSV } from "@/server/actions/kinfolk/export";
import { useRealtimeSubscription, KINFOLK_TABLES } from "@/hooks/use-realtime";
import type { Person, Address } from "@/server/db/schema";
import { AddPersonDialog } from "@/components/kinfolk/add-person-dialog";
import { UserPlus } from "lucide-react";

interface PersonWithAddress {
	person: Person;
	address: Address | null;
}

interface DirectoryClientProps {
	people: PersonWithAddress[];
	familyId: string;
}

export const DirectoryClient = ({ people, familyId }: DirectoryClientProps) => {
	useRealtimeSubscription([KINFOLK_TABLES.person]);

	const [addOpen, setAddOpen] = useState(false);
	const allPeople = useMemo(() => people.map((p) => p.person), [people]);

	const [search, setSearch] = useState("");
	const [sortBy, setSortBy] = useState<"name" | "age">("name");
	const [filterLastName, setFilterLastName] = useState<string>("all");
	const [exporting, setExporting] = useState(false);

	const downloadFile = (content: string, filename: string, mime: string) => {
		const blob = new Blob([content], { type: mime });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleExportVCard = async () => {
		setExporting(true);
		try {
			const vcf = await exportVCard(familyId);
			downloadFile(vcf, "kinfolk-family.vcf", "text/vcard");
		} finally {
			setExporting(false);
		}
	};

	const handleExportCSV = async () => {
		setExporting(true);
		try {
			const csv = await exportCSV(familyId);
			downloadFile(csv, "kinfolk-family.csv", "text/csv");
		} finally {
			setExporting(false);
		}
	};

	const lastNames = useMemo(() => {
		const names = new Set(people.map((p) => p.person.lastName));
		return [...names].sort();
	}, [people]);

	const filtered = useMemo(() => {
		let result = people;

		if (search) {
			const q = search.toLowerCase();
			result = result.filter(
				(p) =>
					p.person.firstName.toLowerCase().includes(q) ||
					p.person.lastName.toLowerCase().includes(q) ||
					p.person.nickname?.toLowerCase().includes(q) ||
					p.person.maidenName?.toLowerCase().includes(q),
			);
		}

		if (filterLastName && filterLastName !== "all") {
			result = result.filter((p) => p.person.lastName === filterLastName);
		}

		result.sort((a, b) => {
			if (sortBy === "name") {
				return (
					a.person.lastName.localeCompare(b.person.lastName) ||
					a.person.firstName.localeCompare(b.person.firstName)
				);
			}
			// Sort by birthdate (oldest first, null last)
			if (!a.person.birthdate) return 1;
			if (!b.person.birthdate) return -1;
			return a.person.birthdate.localeCompare(b.person.birthdate);
		});

		return result;
	}, [people, search, sortBy, filterLastName]);

	return (
		<div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
			<div className="mb-6 flex items-start justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Family Directory</h1>
					<p className="mt-1 text-muted-foreground">
						{people.length} family members
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={handleExportVCard} disabled={exporting}>
						Export vCard
					</Button>
					<Button variant="outline" size="sm" onClick={handleExportCSV} disabled={exporting}>
						Export CSV
					</Button>
					<Button size="sm" onClick={() => setAddOpen(true)}>
						<UserPlus className="mr-1.5 h-4 w-4" />
						Add Person
					</Button>
				</div>
				<AddPersonDialog
					open={addOpen}
					onOpenChange={setAddOpen}
					familyId={familyId}
					allPeople={allPeople}
				/>
			</div>

			<div className="mb-6 flex flex-col gap-3 sm:flex-row">
				<Input
					placeholder="Search by name..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="sm:max-w-xs"
				/>
				<Select value={filterLastName} onValueChange={setFilterLastName}>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Filter by last name" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All last names</SelectItem>
						{lastNames.map((name) => (
							<SelectItem key={name} value={name}>
								{name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={sortBy} onValueChange={(v) => setSortBy(v as "name" | "age")}>
					<SelectTrigger className="w-[150px]">
						<SelectValue placeholder="Sort by" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="name">Name</SelectItem>
						<SelectItem value="age">Age</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{filtered.map(({ person, address }) => (
					<PersonCard key={person.id} person={person} address={address} />
				))}
			</div>

			{filtered.length === 0 && (
				<div className="py-12 text-center text-muted-foreground">
					No family members found matching your search.
				</div>
			)}
		</div>
	);
};

const PersonCard = ({
	person,
	address,
}: { person: Person; address: Address | null }) => {
	const initials = `${person.firstName[0]}${person.lastName[0]}`;
	const displayName = person.maidenName
		? `${person.firstName} ${person.lastName} (née ${person.maidenName})`
		: `${person.firstName} ${person.lastName}`;

	const location = address ? `${address.city}, ${address.state}` : null;

	return (
		<Link
			href={`/kinfolk/person/${person.id}`}
			className="group rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md"
		>
			<div className="flex items-start gap-3">
				<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
					{person.avatarUrl ? (
						<img
							src={person.avatarUrl}
							alt={person.firstName}
							className="h-full w-full rounded-full object-cover"
						/>
					) : (
						initials
					)}
				</div>
				<div className="min-w-0 flex-1">
					<h3 className="truncate font-medium group-hover:text-primary">
						{displayName}
					</h3>
					{person.nickname && (
						<p className="text-xs text-muted-foreground">
							&ldquo;{person.nickname}&rdquo;
						</p>
					)}
					{location && (
						<p className="mt-1 text-sm text-muted-foreground">{location}</p>
					)}
				</div>
			</div>
		</Link>
	);
};

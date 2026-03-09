"use client";

import {
	ReactFlow,
	Background,
	Controls,
	MiniMap,
	useNodesState,
	useEdgesState,
	useReactFlow,
	ReactFlowProvider,
	type Node,
	type Edge,
	type NodeProps,
	Handle,
	Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";
import {
	useCallback,
	useMemo,
	useState,
	useRef,
	useEffect,
	type Dispatch,
	type SetStateAction,
} from "react";
import type { Person, Relationship } from "@/server/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RelType = "parent" | "spouse" | "sibling";

interface PersonNodeData {
	person: Person;
	label: string;
	branchColor?: string;
	highlighted?: boolean;
	dimmed?: boolean;
	collapsed?: boolean;
	[key: string]: unknown;
}

interface TreeFilters {
	showParent: boolean;
	showSpouse: boolean;
	showSibling: boolean;
}

// ---------------------------------------------------------------------------
// Branch palette
// ---------------------------------------------------------------------------

const BRANCH_COLORS = [
	"#6366f1", // indigo
	"#0ea5e9", // sky
	"#10b981", // emerald
	"#f59e0b", // amber
	"#ef4444", // red
	"#8b5cf6", // violet
	"#ec4899", // pink
	"#14b8a6", // teal
];

function getBranchColor(index: number) {
	return BRANCH_COLORS[index % BRANCH_COLORS.length]!;
}

// ---------------------------------------------------------------------------
// Person Node
// ---------------------------------------------------------------------------

const PersonNode = ({ data }: NodeProps<Node<PersonNodeData>>) => {
	const router = useRouter();
	const person = data.person;
	const initials = `${person.firstName?.[0] ?? ""}${person.lastName?.[0] ?? ""}`;
	const birthYear = person.birthdate
		? new Date(person.birthdate).getFullYear()
		: null;

	const borderColor = data.branchColor ?? "#6366f1";
	const dimmed = data.dimmed;
	const highlighted = data.highlighted;

	return (
		<div
			className="cursor-pointer rounded-lg border-2 bg-card p-3 shadow-sm transition-all hover:shadow-md"
			style={{
				borderColor: highlighted ? borderColor : dimmed ? "transparent" : borderColor,
				opacity: dimmed ? 0.25 : 1,
				transform: highlighted ? "scale(1.05)" : undefined,
				zIndex: highlighted ? 10 : undefined,
			}}
			onClick={() => router.push(`/kinfolk/person/${person.id}`)}
		>
			<Handle type="target" position={Position.Top} className="!bg-muted-foreground" />
			<div className="flex items-center gap-3">
				<div
					className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white"
					style={{ backgroundColor: borderColor }}
				>
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
				<div className="min-w-0">
					<div className="truncate text-sm font-medium">
						{person.firstName} {person.lastName}
					</div>
					{birthYear && (
						<div className="text-xs text-muted-foreground">b. {birthYear}</div>
					)}
					{data.collapsed && (
						<div className="text-[10px] text-muted-foreground italic">collapsed</div>
					)}
				</div>
			</div>
			<Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
		</div>
	);
};

const nodeTypes = { person: PersonNode };

// ---------------------------------------------------------------------------
// Legend / Controls Panel
// ---------------------------------------------------------------------------

function TreeLegend({
	filters,
	setFilters,
	branches,
	searchQuery,
	setSearchQuery,
	onSearchSelect,
	searchResults,
	onReset,
	onFocusMyBranch,
}: {
	filters: TreeFilters;
	setFilters: Dispatch<SetStateAction<TreeFilters>>;
	branches: { name: string; color: string }[];
	searchQuery: string;
	setSearchQuery: (q: string) => void;
	onSearchSelect: (personId: string) => void;
	searchResults: { id: string; name: string }[];
	onReset: () => void;
	onFocusMyBranch?: () => void;
}) {
	const [searchOpen, setSearchOpen] = useState(false);

	return (
		<div className="absolute left-4 top-4 z-50 flex flex-col gap-2 rounded-lg border bg-card/95 p-3 shadow-lg backdrop-blur-sm max-w-[260px]">
			{/* Search */}
			<div className="relative">
				<input
					type="text"
					placeholder="Search people..."
					value={searchQuery}
					onChange={(e) => {
						setSearchQuery(e.target.value);
						setSearchOpen(true);
					}}
					onFocus={() => setSearchOpen(true)}
					className="w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary"
				/>
				{searchOpen && searchResults.length > 0 && (
					<div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md border bg-card shadow-lg">
						{searchResults.map((r) => (
							<button
								type="button"
								key={r.id}
								className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted truncate"
								onClick={() => {
									onSearchSelect(r.id);
									setSearchOpen(false);
									setSearchQuery("");
								}}
							>
								{r.name}
							</button>
						))}
					</div>
				)}
			</div>

			{/* Relationship toggles */}
			<div className="space-y-1">
				<div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					Relationships
				</div>
				<ToggleRow
					label="Parent → Child"
					color="#6366f1"
					dashed={false}
					checked={filters.showParent}
					onChange={(v) => setFilters((f) => ({ ...f, showParent: v }))}
				/>
				<ToggleRow
					label="Spouse / Partner"
					color="#ec4899"
					dashed
					checked={filters.showSpouse}
					onChange={(v) => setFilters((f) => ({ ...f, showSpouse: v }))}
				/>
				<ToggleRow
					label="Sibling"
					color="#94a3b8"
					dashed
					checked={filters.showSibling}
					onChange={(v) => setFilters((f) => ({ ...f, showSibling: v }))}
				/>
			</div>

			{/* Branch colors */}
			{branches.length > 1 && (
				<div className="space-y-1">
					<div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						Branches
					</div>
					{branches.map((b) => (
						<div key={b.name} className="flex items-center gap-2 text-xs">
							<span
								className="inline-block h-3 w-3 rounded-full"
								style={{ backgroundColor: b.color }}
							/>
							<span className="truncate">{b.name}</span>
						</div>
					))}
				</div>
			)}

			{/* Actions */}
			<div className="flex gap-2 mt-1">
				{onFocusMyBranch && (
					<button
						type="button"
						onClick={onFocusMyBranch}
						className="flex-1 rounded-md bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
					>
						🌿 My Branch
					</button>
				)}
				<button
					type="button"
					onClick={onReset}
					className="flex-1 rounded-md border px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
				>
					Reset
				</button>
			</div>
		</div>
	);
}

function ToggleRow({
	label,
	color,
	dashed,
	checked,
	onChange,
}: {
	label: string;
	color: string;
	dashed: boolean;
	checked: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<label className="flex cursor-pointer items-center gap-2 text-xs">
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
				className="accent-primary h-3.5 w-3.5"
			/>
			<svg width="24" height="8" className="shrink-0">
				<line
					x1="0"
					y1="4"
					x2="24"
					y2="4"
					stroke={color}
					strokeWidth="2"
					strokeDasharray={dashed ? "4 3" : undefined}
				/>
			</svg>
			<span>{label}</span>
		</label>
	);
}

// ---------------------------------------------------------------------------
// Inner tree (needs ReactFlow context)
// ---------------------------------------------------------------------------

function FamilyTreeInner({ people, relationships, currentPersonId }: FamilyTreeProps) {
	const { fitView, setCenter, getZoom } = useReactFlow();

	const [filters, setFilters] = useState<TreeFilters>({
		showParent: true,
		showSpouse: true,
		showSibling: false, // off by default since these are most overwhelming
	});

	const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
	const [collapsedUnits, setCollapsedUnits] = useState<Set<string>>(new Set());
	const [searchQuery, setSearchQuery] = useState("");

	// Build the full graph once
	const fullGraph = useMemo(
		() => buildGraph(people, relationships),
		[people, relationships],
	);

	// Branch info for legend
	const branches = useMemo(() => fullGraph.branches, [fullGraph.branches]);

	// Derive visible nodes + edges based on filters, collapsed state, highlights
	const { visibleNodes, visibleEdges } = useMemo(() => {
		const hiddenIds = new Set<string>();

		// Compute hidden nodes from collapsed units
		for (const unitId of collapsedUnits) {
			const descendants = fullGraph.unitDescendants.get(unitId);
			if (descendants) {
				for (const id of descendants) hiddenIds.add(id);
			}
		}

		const vNodes = fullGraph.nodes
			.filter((n) => !hiddenIds.has(n.id))
			.map((n) => ({
				...n,
				data: {
					...n.data,
					highlighted: highlightedIds.size > 0 && highlightedIds.has(n.id),
					dimmed: highlightedIds.size > 0 && !highlightedIds.has(n.id),
					collapsed: collapsedUnits.has(n.id),
				},
			}));

		const visibleIdSet = new Set(vNodes.map((n) => n.id));

		const vEdges = fullGraph.edges.filter((e) => {
			// Filter by type
			const relType = (e.data as { relType?: RelType })?.relType;
			if (relType === "parent" && !filters.showParent) return false;
			if ((relType === "spouse" || relType === "partner") && !filters.showSpouse) return false;
			if (relType === "sibling" && !filters.showSibling) return false;
			// Filter by visibility
			if (!visibleIdSet.has(e.source) || !visibleIdSet.has(e.target)) return false;
			return true;
		}).map((e) => ({
			...e,
			style: {
				...e.style,
				opacity: highlightedIds.size > 0
					? (highlightedIds.has(e.source) && highlightedIds.has(e.target) ? 1 : 0.08)
					: 1,
			},
		}));

		return { visibleNodes: vNodes, visibleEdges: vEdges };
	}, [fullGraph, filters, highlightedIds, collapsedUnits]);

	const [nodes, setNodes, onNodesChange] = useNodesState(visibleNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(visibleEdges);

	// Sync derived state into ReactFlow state
	useEffect(() => {
		setNodes(visibleNodes);
		setEdges(visibleEdges);
	}, [visibleNodes, visibleEdges, setNodes, setEdges]);

	// Search
	const searchResults = useMemo(() => {
		if (!searchQuery.trim()) return [];
		const q = searchQuery.toLowerCase();
		return people
			.filter(
				(p) =>
					p.firstName.toLowerCase().includes(q) ||
					p.lastName.toLowerCase().includes(q) ||
					`${p.firstName} ${p.lastName}`.toLowerCase().includes(q),
			)
			.slice(0, 8)
			.map((p) => ({ id: p.id as string, name: `${p.firstName} ${p.lastName}` }));
	}, [searchQuery, people]);

	// Build parent/child maps for lineage traversal
	const { parentMap, childMap, spouseMap } = useMemo(() => {
		const pm = new Map<string, Set<string>>(); // child → parents
		const cm = new Map<string, Set<string>>(); // parent → children
		const sm = new Map<string, Set<string>>(); // person → spouses
		for (const rel of relationships) {
			if (rel.type === "parent") {
				getOrCreate(pm, rel.relatedId).add(rel.personId);
				getOrCreate(cm, rel.personId).add(rel.relatedId);
			}
			if (rel.type === "spouse" || rel.type === "partner") {
				getOrCreate(sm, rel.personId).add(rel.relatedId);
				getOrCreate(sm, rel.relatedId).add(rel.personId);
			}
		}
		return { parentMap: pm, childMap: cm, spouseMap: sm };
	}, [relationships]);

	// Collect full lineage: all ancestors + all descendants + their spouses
	const getLineage = useCallback(
		(personId: string): Set<string> => {
			const lineage = new Set<string>([personId]);

			// Walk up ancestors
			const upQueue = [personId];
			while (upQueue.length > 0) {
				const cur = upQueue.pop()!;
				for (const parentId of parentMap.get(cur) ?? []) {
					if (!lineage.has(parentId)) {
						lineage.add(parentId);
						upQueue.push(parentId);
					}
				}
			}

			// Walk down descendants
			const downQueue = [personId];
			while (downQueue.length > 0) {
				const cur = downQueue.pop()!;
				for (const childId of childMap.get(cur) ?? []) {
					if (!lineage.has(childId)) {
						lineage.add(childId);
						downQueue.push(childId);
					}
				}
			}

			// Include spouses of everyone in lineage
			const withSpouses = new Set(lineage);
			for (const id of lineage) {
				for (const spId of spouseMap.get(id) ?? []) {
					withSpouses.add(spId);
				}
			}

			return withSpouses;
		},
		[parentMap, childMap, spouseMap],
	);

	// Focus on person (direct family only)
	const focusPerson = useCallback(
		(personId: string) => {
			const node = fullGraph.nodes.find((n) => n.id === personId);
			if (!node) return;

			// Highlight this person + their direct family
			const related = new Set<string>([personId]);
			for (const rel of relationships) {
				if (rel.personId === personId) related.add(rel.relatedId);
				if (rel.relatedId === personId) related.add(rel.personId);
			}
			setHighlightedIds(related);

			// Pan to them
			const zoom = Math.max(getZoom(), 0.8);
			setCenter(
				node.position.x + 100,
				node.position.y + 40,
				{ zoom, duration: 600 },
			);
		},
		[fullGraph.nodes, relationships, setCenter, getZoom],
	);

	// Focus My Branch — full lineage highlight
	const focusMyBranch = useCallback(() => {
		if (!currentPersonId) return;

		const lineage = getLineage(currentPersonId);
		setHighlightedIds(lineage);

		// Pan to the current person
		const node = fullGraph.nodes.find((n) => n.id === currentPersonId);
		if (node) {
			const zoom = Math.max(getZoom(), 0.5);
			setCenter(
				node.position.x + 100,
				node.position.y + 40,
				{ zoom, duration: 600 },
			);
		}
	}, [currentPersonId, getLineage, fullGraph.nodes, setCenter, getZoom]);

	// Double-click node to toggle collapse
	const onNodeDoubleClick = useCallback(
		(_event: React.MouseEvent, node: Node) => {
			const unitId = fullGraph.unitParents.has(node.id) ? node.id : undefined;
			if (!unitId) return;

			setCollapsedUnits((prev) => {
				const next = new Set(prev);
				if (next.has(unitId)) {
					next.delete(unitId);
				} else {
					next.add(unitId);
				}
				return next;
			});
		},
		[fullGraph.unitParents],
	);

	// Single click to highlight lineage
	const onNodeClick = useCallback(
		(_event: React.MouseEvent, node: Node) => {
			// If already highlighting this person, clear
			if (highlightedIds.has(node.id) && highlightedIds.size > 1) {
				setHighlightedIds(new Set());
				return;
			}
			focusPerson(node.id);
		},
		[highlightedIds, focusPerson],
	);

	const handleReset = useCallback(() => {
		setHighlightedIds(new Set());
		setCollapsedUnits(new Set());
		setSearchQuery("");
		setTimeout(() => fitView({ duration: 400 }), 50);
	}, [fitView]);

	return (
		<div className="relative h-[calc(100vh-3.5rem)] w-full">
			<TreeLegend
				filters={filters}
				setFilters={setFilters}
				branches={branches}
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				onSearchSelect={focusPerson}
				searchResults={searchResults}
				onReset={handleReset}
				onFocusMyBranch={currentPersonId ? focusMyBranch : undefined}
			/>

			{/* Keyboard hint */}
			<div className="absolute right-4 top-4 z-50 rounded-lg border bg-card/90 px-3 py-2 text-[11px] text-muted-foreground backdrop-blur-sm">
				<div><kbd className="font-mono">Click</kbd> person to highlight lineage</div>
				<div><kbd className="font-mono">Double-click</kbd> to collapse/expand branch</div>
				<div><kbd className="font-mono">Scroll</kbd> to zoom</div>
			</div>

			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onNodeClick={onNodeClick}
				onNodeDoubleClick={onNodeDoubleClick}
				nodeTypes={nodeTypes}
				fitView
				minZoom={0.05}
				maxZoom={2}
				defaultEdgeOptions={{ animated: false }}
				proOptions={{ hideAttribution: true }}
			>
				<Background />
				<Controls />
				<MiniMap
					nodeColor={(node) => {
						const data = node.data as PersonNodeData;
						return data.branchColor ?? "#6366f1";
					}}
					maskColor="rgb(0, 0, 0, 0.1)"
					className="!bg-background"
				/>
			</ReactFlow>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Exported wrapper (provides ReactFlow context)
// ---------------------------------------------------------------------------

interface FamilyTreeProps {
	people: Person[];
	relationships: Relationship[];
	currentPersonId?: string;
}

export const FamilyTree = ({ people, relationships, currentPersonId }: FamilyTreeProps) => {
	return (
		<ReactFlowProvider>
			<FamilyTreeInner people={people} relationships={relationships} currentPersonId={currentPersonId} />
		</ReactFlowProvider>
	);
};

// ---------------------------------------------------------------------------
// Graph builder
// ---------------------------------------------------------------------------

interface GraphResult {
	nodes: Node<PersonNodeData>[];
	edges: Edge[];
	branches: { name: string; color: string }[];
	unitParents: Set<string>;
	unitDescendants: Map<string, Set<string>>;
}

function buildGraph(
	people: Person[],
	relationships: Relationship[],
): GraphResult {
	const personMap = new Map(people.map((p) => [p.id, p]));

	// --- Adjacency ---
	const childToParents = new Map<string, Set<string>>();
	const parentToChildren = new Map<string, Set<string>>();
	const spouseOf = new Map<string, string>();

	for (const rel of relationships) {
		if (rel.type === "parent") {
			getOrCreate(childToParents, rel.relatedId).add(rel.personId);
			getOrCreate(parentToChildren, rel.personId).add(rel.relatedId);
		}
		if (rel.type === "spouse" || rel.type === "partner") {
			if (!spouseOf.has(rel.personId) && !spouseOf.has(rel.relatedId)) {
				spouseOf.set(rel.personId, rel.relatedId);
				spouseOf.set(rel.relatedId, rel.personId);
			}
		}
	}

	// --- Generations ---
	const generation = new Map<string, number>();
	const roots = people.filter((p) => !childToParents.has(p.id));

	for (const r of [...roots]) {
		const sp = spouseOf.get(r.id);
		if (sp && !roots.find((x) => x.id === sp)) {
			const spPerson = personMap.get(sp);
			if (spPerson) roots.push(spPerson);
		}
	}

	const queue: string[] = [];
	for (const r of roots) {
		if (!generation.has(r.id)) {
			generation.set(r.id, 0);
			queue.push(r.id);
		}
	}

	while (queue.length > 0) {
		const cur = queue.shift()!;
		const gen = generation.get(cur)!;

		const sp = spouseOf.get(cur);
		if (sp && !generation.has(sp)) {
			generation.set(sp, gen);
			queue.push(sp);
		}

		for (const childId of parentToChildren.get(cur) ?? []) {
			const existing = generation.get(childId);
			if (existing === undefined || gen + 1 > existing) {
				generation.set(childId, gen + 1);
				queue.push(childId);
			}
		}
	}

	for (const p of people) {
		if (!generation.has(p.id)) generation.set(p.id, 0);
	}

	// --- Family units ---
	interface FamilyUnit {
		parents: string[];
		children: string[];
	}

	const unitByParent = new Map<string, FamilyUnit>();
	const assignedToUnit = new Set<string>();

	for (const [parentId, kids] of parentToChildren) {
		if (assignedToUnit.has(parentId)) continue;

		const sp = spouseOf.get(parentId);
		const unitParents = [parentId];
		if (sp) unitParents.push(sp);

		const allKids = new Set<string>();
		for (const pid of unitParents) {
			for (const kid of parentToChildren.get(pid) ?? []) {
				allKids.add(kid);
			}
		}

		unitByParent.set(parentId, {
			parents: unitParents,
			children: [...allKids],
		});
		for (const pid of unitParents) assignedToUnit.add(pid);
	}

	// Track which persons are unit-parents (for collapse)
	const unitParentSet = new Set<string>();
	for (const [id] of unitByParent) {
		unitParentSet.add(id);
	}

	// Compute descendants of each unit (for collapse)
	const unitDescendants = new Map<string, Set<string>>();

	function getDescendants(unitId: string): Set<string> {
		if (unitDescendants.has(unitId)) return unitDescendants.get(unitId)!;
		const desc = new Set<string>();
		const unit = unitByParent.get(unitId);
		if (!unit) return desc;

		for (const childId of unit.children) {
			desc.add(childId);
			// Also add child's spouse
			const childSp = spouseOf.get(childId);
			if (childSp) desc.add(childSp);

			// Recurse if child has their own unit
			const childUnit = findUnitForPerson(childId);
			if (childUnit && childUnit !== unitId) {
				for (const d of getDescendants(childUnit)) desc.add(d);
			}
		}

		unitDescendants.set(unitId, desc);
		return desc;
	}

	function findUnitForPerson(personId: string): string | undefined {
		if (unitByParent.has(personId)) return personId;
		const sp = spouseOf.get(personId);
		if (sp && unitByParent.has(sp)) return sp;
		return undefined;
	}

	for (const [unitId] of unitByParent) {
		getDescendants(unitId);
	}

	// --- Branch coloring ---
	// Each root unit gets a branch color; descendants inherit
	const branchColorMap = new Map<string, string>();
	const branchNames: { name: string; color: string }[] = [];

	const rootUnits: string[] = [];
	for (const [parentId] of unitByParent) {
		const gen = generation.get(parentId) ?? 0;
		if (gen === 0) rootUnits.push(parentId);
	}

	// Also handle root-level people not in any unit
	const rootSingles = roots.filter(
		(r) => !assignedToUnit.has(r.id) && (generation.get(r.id) ?? 0) === 0,
	);

	let branchIdx = 0;
	for (const unitId of rootUnits) {
		const color = getBranchColor(branchIdx);
		const unit = unitByParent.get(unitId)!;
		for (const pid of unit.parents) branchColorMap.set(pid, color);

		const desc = unitDescendants.get(unitId);
		if (desc) {
			for (const id of desc) branchColorMap.set(id, color);
		}

		const mainPerson = personMap.get(unitId);
		branchNames.push({
			name: mainPerson ? `${mainPerson.lastName} family` : `Branch ${branchIdx + 1}`,
			color,
		});
		branchIdx++;
	}

	for (const r of rootSingles) {
		if (!branchColorMap.has(r.id)) {
			branchColorMap.set(r.id, getBranchColor(branchIdx++));
		}
	}

	// --- Layout ---
	const NODE_WIDTH = 200;
	const NODE_HEIGHT = 80;
	const COUPLE_GAP = 20;
	const SIBLING_GAP = 40;
	const GEN_GAP = 140;

	const positions = new Map<string, { x: number; y: number }>();
	const laid = new Set<string>();

	function layoutUnit(unitParentId: string, x: number, y: number): number {
		const unit = unitByParent.get(unitParentId);
		if (!unit) return 0;

		const parentIds = unit.parents;
		const childIds = unit.children.filter((id) => !laid.has(id));

		interface ChildLayout {
			id: string;
			width: number;
		}

		const childLayouts: ChildLayout[] = [];
		const childY = y + NODE_HEIGHT + GEN_GAP;
		let childX = x;

		for (const childId of childIds) {
			const childUnit = findUnitForPerson(childId);
			let width: number;

			if (childUnit && !laid.has(childId)) {
				width = layoutUnit(childUnit, childX, childY);
			} else {
				width = NODE_WIDTH;
			}

			width = Math.max(width, NODE_WIDTH);
			childLayouts.push({ id: childId, width });
			childX += width + SIBLING_GAP;
		}

		const totalChildrenWidth =
			childLayouts.reduce((sum, c) => sum + c.width, 0) +
			Math.max(0, childLayouts.length - 1) * SIBLING_GAP;

		const coupleWidth =
			parentIds.length === 2 ? NODE_WIDTH * 2 + COUPLE_GAP : NODE_WIDTH;

		const subtreeWidth = Math.max(totalChildrenWidth, coupleWidth);

		let cx = x + (subtreeWidth - totalChildrenWidth) / 2;
		for (const cl of childLayouts) {
			if (!laid.has(cl.id)) {
				const childNodeX = cx + (cl.width - NODE_WIDTH) / 2;
				positions.set(cl.id, { x: childNodeX, y: childY });
				laid.add(cl.id);

				const childSp = spouseOf.get(cl.id);
				if (childSp && !laid.has(childSp)) {
					if (!positions.has(childSp)) {
						positions.set(childSp, {
							x: childNodeX + NODE_WIDTH + COUPLE_GAP,
							y: childY,
						});
						laid.add(childSp);
					}
				}
			}
			cx += cl.width + SIBLING_GAP;
		}

		const parentY = y;
		const centerX = x + subtreeWidth / 2;

		if (parentIds.length === 2) {
			if (!laid.has(parentIds[0]!)) {
				positions.set(parentIds[0]!, {
					x: centerX - NODE_WIDTH - COUPLE_GAP / 2,
					y: parentY,
				});
				laid.add(parentIds[0]!);
			}
			if (!laid.has(parentIds[1]!)) {
				positions.set(parentIds[1]!, {
					x: centerX + COUPLE_GAP / 2,
					y: parentY,
				});
				laid.add(parentIds[1]!);
			}
		} else if (parentIds.length === 1 && !laid.has(parentIds[0]!)) {
			positions.set(parentIds[0]!, {
				x: centerX - NODE_WIDTH / 2,
				y: parentY,
			});
			laid.add(parentIds[0]!);
		}

		return subtreeWidth;
	}

	let globalX = 0;
	for (const unitId of rootUnits) {
		if (laid.has(unitId)) continue;
		const width = layoutUnit(unitId, globalX, 0);
		globalX += width + SIBLING_GAP * 2;
	}

	for (const p of people) {
		if (!positions.has(p.id)) {
			const gen = generation.get(p.id) ?? 0;
			const sp = spouseOf.get(p.id);

			if (sp && positions.has(sp)) {
				const spPos = positions.get(sp)!;
				positions.set(p.id, {
					x: spPos.x + NODE_WIDTH + COUPLE_GAP,
					y: spPos.y,
				});
			} else {
				positions.set(p.id, {
					x: globalX,
					y: gen * (NODE_HEIGHT + GEN_GAP),
				});
				globalX += NODE_WIDTH + SIBLING_GAP;
			}
		}
	}

	// --- Nodes ---
	const nodes: Node<PersonNodeData>[] = [];
	for (const p of people) {
		const pos = positions.get(p.id) ?? { x: 0, y: 0 };
		nodes.push({
			id: p.id as string,
			type: "person",
			position: pos,
			data: {
				person: p,
				label: `${p.firstName} ${p.lastName}`,
				branchColor: branchColorMap.get(p.id) ?? "#6366f1",
			},
		});
	}

	// --- Edges ---
	const edges: Edge[] = [];
	const edgeSet = new Set<string>();

	for (const rel of relationships) {
		if (rel.type === "child") continue;

		const edgeId = [rel.personId, rel.relatedId].sort().join("-");
		if (edgeSet.has(edgeId)) continue;
		edgeSet.add(edgeId);

		const isSpouse = rel.type === "spouse" || rel.type === "partner";
		const isSibling = rel.type === "sibling";

		edges.push({
			id: `edge-${rel.id}`,
			source: rel.personId,
			target: rel.relatedId,
			type: "default",
			data: { relType: rel.type },
			style: {
				stroke: isSpouse ? "#ec4899" : isSibling ? "#94a3b8" : "#6366f1",
				strokeWidth: isSpouse ? 2 : isSibling ? 1 : 1.5,
				strokeDasharray: isSpouse ? "5 5" : isSibling ? "3 3" : undefined,
			},
		});
	}

	// Deduplicate branch names
	const seen = new Set<string>();
	const uniqueBranches = branchNames.filter((b) => {
		if (seen.has(b.name)) return false;
		seen.add(b.name);
		return true;
	});

	return { nodes, edges, branches: uniqueBranches, unitParents: unitParentSet, unitDescendants };
}

function getOrCreate<K, V>(map: Map<K, Set<V>>, key: K): Set<V> {
	let set = map.get(key);
	if (!set) {
		set = new Set();
		map.set(key, set);
	}
	return set;
}

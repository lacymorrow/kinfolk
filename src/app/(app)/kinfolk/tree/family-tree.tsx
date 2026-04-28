"use client";

import {
	ReactFlow,
	ReactFlowProvider,
	Background,
	Controls,
	MiniMap,
	useNodesState,
	useEdgesState,
	useReactFlow,
	type Node,
	type Edge,
	type NodeProps,
	Handle,
	Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Person, Relationship } from "@/server/db/schema";
import { AddPersonDialog } from "@/components/kinfolk/add-person-dialog";
import { UserPlus, ChevronDown, ChevronRight } from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const NODE_WIDTH = 200;
const NODE_HEIGHT = 72;
const UNION_SIZE = 16;
const GEN_GAP = 180;
const SIBLING_GAP = 80;
const EDGE_IDLE_OPACITY = 0.15;
const EDGE_ACTIVE_OPACITY = 1;

// ---------------------------------------------------------------------------
// Node types
// ---------------------------------------------------------------------------

interface PersonNodeData {
	person: Person;
	label: string;
	[key: string]: unknown;
}

const PersonNode = ({ data }: NodeProps<Node<PersonNodeData>>) => {
	const router = useRouter();
	const person = data.person;
	const initials = `${person.firstName?.[0] ?? ""}${person.lastName?.[0] ?? ""}`;
	const birthYear = person.birthdate
		? new Date(person.birthdate).getFullYear()
		: null;

	return (
		<div
			className="cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
			onClick={() => router.push(`/kinfolk/person/${person.id}`)}
		>
			<Handle type="target" position={Position.Top} id="top" className="!bg-muted-foreground !w-2 !h-2" />
			<Handle type="source" position={Position.Bottom} id="bottom" className="!bg-muted-foreground !w-2 !h-2" />
			<Handle type="source" position={Position.Left} id="left" className="!bg-pink-400 !w-2 !h-2" />
			<Handle type="target" position={Position.Left} id="left-in" className="!bg-pink-400 !w-2 !h-2" />
			<Handle type="source" position={Position.Right} id="right" className="!bg-pink-400 !w-2 !h-2" />
			<Handle type="target" position={Position.Right} id="right-in" className="!bg-pink-400 !w-2 !h-2" />
			<div className="flex items-center gap-3">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
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
						<div className="text-xs text-muted-foreground">
							b. {birthYear}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

interface UnionNodeData {
	unionId: string;
	collapsed: boolean;
	hasChildren: boolean;
	partners: string[];
	onToggle?: (unionId: string) => void;
	[key: string]: unknown;
}

const UnionNode = ({ data }: NodeProps<UnionNodeData>) => {
	const hasChildren = data.hasChildren;
	const collapsed = data.collapsed;
	const onToggle = data.onToggle;

	return (
		<div
			className={`flex items-center justify-center rounded-full transition-colors ${
				hasChildren
					? "cursor-pointer bg-pink-400 hover:bg-pink-500"
					: "bg-pink-300"
			}`}
			style={{ width: UNION_SIZE, height: UNION_SIZE }}
			onClick={(e) => {
				e.stopPropagation();
				if (hasChildren && onToggle) onToggle(data.unionId);
			}}
		>
			{hasChildren && (
				<span className="text-white" style={{ fontSize: 10, lineHeight: 1 }}>
					{collapsed ? <ChevronRight className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
				</span>
			)}
			<Handle type="target" position={Position.Left} id="left" className="!bg-pink-400 !w-1.5 !h-1.5 !border-0" />
			<Handle type="target" position={Position.Right} id="right" className="!bg-pink-400 !w-1.5 !h-1.5 !border-0" />
			<Handle type="source" position={Position.Bottom} id="bottom" className="!bg-muted-foreground !w-1.5 !h-1.5 !border-0" />
			<Handle type="target" position={Position.Top} id="top" className="!bg-muted-foreground !w-1.5 !h-1.5 !border-0" />
		</div>
	);
};

const nodeTypes = {
	person: PersonNode,
	union: UnionNode,
};

// ---------------------------------------------------------------------------
// Generation band background
// ---------------------------------------------------------------------------
function GenerationBands({ nodes }: { nodes: Node[] }) {
	const generations = useMemo(() => {
		const genMap = new Map<number, { minY: number; maxY: number }>();
		for (const n of nodes) {
			if (n.type !== "person") continue;
			const y = n.position.y;
			// Group by rough generation band
			const genKey = Math.round(y / GEN_GAP);
			const existing = genMap.get(genKey);
			if (existing) {
				existing.minY = Math.min(existing.minY, y);
				existing.maxY = Math.max(existing.maxY, y + NODE_HEIGHT);
			} else {
				genMap.set(genKey, { minY: y, maxY: y + NODE_HEIGHT });
			}
		}
		return [...genMap.entries()].sort((a, b) => a[0] - b[0]);
	}, [nodes]);

	if (generations.length === 0) return null;

	const minX = Math.min(...nodes.map((n) => n.position.x)) - 200;
	const maxX = Math.max(...nodes.map((n) => n.position.x + NODE_WIDTH)) + 200;
	const width = maxX - minX;

	return (
		<>
			{generations.map(([genKey, { minY, maxY }], i) => (
				<div
					key={genKey}
					className="pointer-events-none absolute"
					style={{
						left: minX,
						top: minY - 20,
						width,
						height: maxY - minY + 40,
						backgroundColor: i % 2 === 0 ? "rgba(99, 102, 241, 0.03)" : "transparent",
						borderTop: "1px solid rgba(99, 102, 241, 0.06)",
					}}
				/>
			))}
		</>
	);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface FamilyTreeProps {
	familyId: string;
	people: Person[];
	relationships: Relationship[];
	currentPersonId?: string;
}

export const FamilyTree = (props: FamilyTreeProps) => (
	<ReactFlowProvider>
		<FamilyTreeInner {...props} />
	</ReactFlowProvider>
);

function AddPersonFAB({ familyId, people }: { familyId: string; people: Person[] }) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="absolute bottom-6 right-6 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
				title="Add person"
			>
				<UserPlus className="h-5 w-5" />
			</button>
			<AddPersonDialog
				open={open}
				onOpenChange={setOpen}
				familyId={familyId}
				allPeople={people}
			/>
		</>
	);
}

// ---------------------------------------------------------------------------
// Helpers: build a lookup of nodeId -> connected edge ids + family member ids
// ---------------------------------------------------------------------------
function buildAdjacency(
	edges: Edge[],
	relationships: Relationship[],
): {
	nodeToEdges: Map<string, Set<string>>;
	nodeToFamily: Map<string, Set<string>>;
	edgeToNodes: Map<string, Set<string>>;
} {
	const nodeToEdges = new Map<string, Set<string>>();
	const edgeToNodes = new Map<string, Set<string>>();
	const nodeToFamily = new Map<string, Set<string>>();

	for (const edge of edges) {
		getOrCreate(nodeToEdges, edge.source).add(edge.id);
		getOrCreate(nodeToEdges, edge.target).add(edge.id);
		const s = new Set<string>();
		s.add(edge.source);
		s.add(edge.target);
		edgeToNodes.set(edge.id, s);
	}

	// Build family: direct relationships (parents, children, spouse/partner)
	for (const rel of relationships) {
		getOrCreate(nodeToFamily, rel.personId).add(rel.relatedId);
		getOrCreate(nodeToFamily, rel.relatedId).add(rel.personId);
	}

	return { nodeToEdges, nodeToFamily, edgeToNodes };
}

const FamilyTreeInner = ({ familyId, people, relationships, currentPersonId: _currentPersonId }: FamilyTreeProps) => {
	const [collapsedUnions, setCollapsedUnions] = useState<Set<string>>(new Set());

	const toggleCollapse = useCallback((unionId: string) => {
		setCollapsedUnions((prev) => {
			const next = new Set(prev);
			if (next.has(unionId)) {
				next.delete(unionId);
			} else {
				next.add(unionId);
			}
			return next;
		});
	}, []);

	const { nodes: initialNodes, edges: initialEdges } = useMemo(
		() => buildGraph(people, relationships, collapsedUnions, toggleCollapse),
		[people, relationships, collapsedUnions, toggleCollapse],
	);

	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
	const { setCenter } = useReactFlow();

	// Precompute adjacency for hover highlighting
	const adjacency = useMemo(
		() => buildAdjacency(initialEdges, relationships),
		[initialEdges, relationships],
	);

	// Track hovered node for edge/node highlighting
	const [hoveredNode, setHoveredNode] = useState<string | null>(null);

	// Sync when graph rebuilds (collapse/expand)
	useEffect(() => {
		setNodes(initialNodes);
		setEdges(initialEdges);
	}, [initialNodes, initialEdges, setNodes, setEdges]);

	// Apply hover-based edge opacity
	useEffect(() => {
		if (!hoveredNode) {
			// Reset: all edges ghosted, all nodes full opacity
			setEdges((prev) =>
				prev.map((e) => ({
					...e,
					style: { ...e.style, opacity: EDGE_IDLE_OPACITY, transition: "opacity 0.2s" },
				})),
			);
			setNodes((prev) =>
				prev.map((n) => ({
					...n,
					style: { ...n.style, opacity: 1, transition: "opacity 0.2s" },
				})),
			);
			return;
		}

		const connectedEdges = adjacency.nodeToEdges.get(hoveredNode) ?? new Set();
		const familyMembers = adjacency.nodeToFamily.get(hoveredNode) ?? new Set();

		// Also include union nodes that are connected to this person
		const connectedNodes = new Set<string>([hoveredNode]);
		for (const eid of connectedEdges) {
			const ends = adjacency.edgeToNodes.get(eid);
			if (ends) for (const nid of ends) connectedNodes.add(nid);
		}
		for (const fid of familyMembers) connectedNodes.add(fid);

		setEdges((prev) =>
			prev.map((e) => ({
				...e,
				style: {
					...e.style,
					opacity: connectedEdges.has(e.id) ? EDGE_ACTIVE_OPACITY : EDGE_IDLE_OPACITY,
					transition: "opacity 0.2s",
				},
			})),
		);
		setNodes((prev) =>
			prev.map((n) => {
				const isHighlighted =
					connectedNodes.has(n.id) ||
					(n.type === "union" &&
						(n.data as UnionNodeData).partners.some((pid) => connectedNodes.has(pid)));
				return {
					...n,
					style: {
						...n.style,
						opacity: isHighlighted ? 1 : 0.25,
						transition: "opacity 0.2s",
					},
				};
			}),
		);
	}, [hoveredNode, adjacency, setEdges, setNodes]);

	const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
		if (node.type !== "union") setHoveredNode(node.id);
	}, []);

	const onNodeMouseLeave = useCallback(() => {
		setHoveredNode(null);
	}, []);

	// --- Search ---
	const [searchTerm, setSearchTerm] = useState("");
	const [showResults, setShowResults] = useState(false);
	const searchRef = useRef<HTMLDivElement>(null);

	const searchResults = useMemo(() => {
		if (!searchTerm.trim()) return [];
		const q = searchTerm.toLowerCase();
		return people.filter(
			(p) =>
				p.firstName.toLowerCase().includes(q) ||
				p.lastName.toLowerCase().includes(q) ||
				`${p.firstName} ${p.lastName}`.toLowerCase().includes(q),
		);
	}, [searchTerm, people]);

	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (searchRef.current && !searchRef.current.contains(e.target as globalThis.Node)) {
				setShowResults(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	const focusPerson = useCallback(
		(personId: string) => {
			const node = nodes.find((n) => n.id === personId);
			if (!node) return;
			setCenter(node.position.x + NODE_WIDTH / 2, node.position.y + NODE_HEIGHT / 2, {
				zoom: 1.2,
				duration: 600,
			});
			setHoveredNode(personId);
			// Clear hover after a brief highlight
			setTimeout(() => setHoveredNode(null), 2000);
			setSearchTerm("");
			setShowResults(false);
		},
		[nodes, setCenter],
	);

	return (
		<div className="relative h-[calc(100vh-3.5rem)] w-full">
			{/* Search bar */}
			<div ref={searchRef} className="absolute left-4 top-4 z-10 w-64">
				<input
					type="text"
					value={searchTerm}
					onChange={(e) => {
						setSearchTerm(e.target.value);
						setShowResults(true);
					}}
					onFocus={() => setShowResults(true)}
					placeholder="Search family members..."
					className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
				/>
				{showResults && searchResults.length > 0 && (
					<div className="mt-1 max-h-60 overflow-auto rounded-md border bg-background shadow-lg">
						{searchResults.map((p) => (
							<button
								key={p.id}
								type="button"
								className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
								onClick={() => focusPerson(p.id)}
							>
								{p.firstName} {p.lastName}
							</button>
						))}
					</div>
				)}
			</div>

			{/* Collapse legend */}
			{collapsedUnions.size > 0 && (
				<div className="absolute right-4 top-4 z-10 rounded-md border bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur">
					{collapsedUnions.size} branch{collapsedUnions.size > 1 ? "es" : ""} collapsed
					<button
						type="button"
						className="ml-2 text-primary hover:underline"
						onClick={() => setCollapsedUnions(new Set())}
					>
						Expand all
					</button>
				</div>
			)}

			{/* Hover hint */}
			<div className="absolute bottom-6 left-4 z-10 rounded-md bg-background/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur">
				Hover a person to highlight their family
			</div>

			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onNodeMouseEnter={onNodeMouseEnter}
				onNodeMouseLeave={onNodeMouseLeave}
				nodeTypes={nodeTypes}
				fitView
				minZoom={0.1}
				maxZoom={2}
				defaultEdgeOptions={{ animated: false }}
				proOptions={{ hideAttribution: true }}
			>
				<Background />
				<Controls />
				<MiniMap
					nodeColor={(node) => (node.type === "union" ? "#ec4899" : "#6366f1")}
					maskColor="rgb(0, 0, 0, 0.1)"
					className="!bg-background"
				/>
			</ReactFlow>

			<AddPersonFAB familyId={familyId} people={people} />
		</div>
	);
};

// ---------------------------------------------------------------------------
// Graph builder with union nodes + dagre layout
// ---------------------------------------------------------------------------

interface Union {
	id: string;
	partners: string[];
	children: string[];
}

function buildGraph(
	people: Person[],
	relationships: Relationship[],
	collapsedUnions: Set<string>,
	onToggle: (unionId: string) => void,
): { nodes: Node[]; edges: Edge[] } {
	// --- Build adjacency ---
	const childToParents = new Map<string, Set<string>>();
	const parentToChildren = new Map<string, Set<string>>();
	const partnerships = new Map<string, Set<string>>();

	for (const rel of relationships) {
		if (rel.type === "parent" || rel.type === "child") {
			const parentId = rel.type === "parent" ? rel.personId : rel.relatedId;
			const childId = rel.type === "parent" ? rel.relatedId : rel.personId;
			getOrCreate(childToParents, childId).add(parentId);
			getOrCreate(parentToChildren, parentId).add(childId);
		}
		if (rel.type === "spouse" || rel.type === "partner") {
			getOrCreate(partnerships, rel.personId).add(rel.relatedId);
			getOrCreate(partnerships, rel.relatedId).add(rel.personId);
		}
	}

	// --- Build unions ---
	const unions: Union[] = [];
	const unionMap = new Map<string, Union>();
	const personToUnions = new Map<string, string[]>();

	const seenPairs = new Set<string>();
	for (const [personId, partners] of partnerships) {
		for (const partnerId of partners) {
			const key = [personId, partnerId].sort().join("+");
			if (seenPairs.has(key)) continue;
			seenPairs.add(key);
			const union: Union = { id: `union:${key}`, partners: [personId, partnerId].sort(), children: [] };
			unions.push(union);
			unionMap.set(union.id, union);
			for (const pid of union.partners) {
				if (!personToUnions.has(pid)) personToUnions.set(pid, []);
				personToUnions.get(pid)!.push(union.id);
			}
		}
	}

	// Assign children to unions
	for (const [childId, parentIds] of childToParents) {
		const parents = [...parentIds];
		let assigned = false;

		if (parents.length >= 2) {
			for (let i = 0; i < parents.length && !assigned; i++) {
				for (let j = i + 1; j < parents.length && !assigned; j++) {
					const key = `union:${[parents[i]!, parents[j]!].sort().join("+")}`;
					const union = unionMap.get(key);
					if (union) {
						union.children.push(childId);
						assigned = true;
					}
				}
			}
			if (!assigned) {
				const key = `union:${parents.slice(0, 2).sort().join("+")}`;
				if (!unionMap.has(key)) {
					const union: Union = { id: key, partners: parents.slice(0, 2).sort(), children: [childId] };
					unions.push(union);
					unionMap.set(key, union);
					for (const pid of union.partners) {
						if (!personToUnions.has(pid)) personToUnions.set(pid, []);
						personToUnions.get(pid)!.push(key);
					}
				} else {
					unionMap.get(key)!.children.push(childId);
				}
				assigned = true;
			}
		} else if (parents.length === 1) {
			const parentId = parents[0]!;
			const existingUnions = personToUnions.get(parentId) ?? [];
			for (const uid of existingUnions) {
				const u = unionMap.get(uid)!;
				if (u.partners.length === 1 && u.partners[0] === parentId) {
					u.children.push(childId);
					assigned = true;
					break;
				}
			}
			if (!assigned) {
				const key = `union:solo:${parentId}`;
				if (!unionMap.has(key)) {
					const union: Union = { id: key, partners: [parentId], children: [childId] };
					unions.push(union);
					unionMap.set(key, union);
					if (!personToUnions.has(parentId)) personToUnions.set(parentId, []);
					personToUnions.get(parentId)!.push(key);
				} else {
					unionMap.get(key)!.children.push(childId);
				}
			}
		}
	}

	// --- Determine which nodes are hidden (collapsed descendants) ---
	const hiddenPeople = new Set<string>();
	const hiddenUnions = new Set<string>();

	function hideDescendants(unionId: string) {
		const union = unionMap.get(unionId);
		if (!union) return;
		for (const childId of union.children) {
			hiddenPeople.add(childId);
			const childUnions = personToUnions.get(childId) ?? [];
			for (const cuid of childUnions) {
				hiddenUnions.add(cuid);
				hideDescendants(cuid);
			}
		}
	}

	for (const uid of collapsedUnions) {
		if (unionMap.has(uid)) hideDescendants(uid);
	}

	// --- Build dagre graph ---
	const g = new dagre.graphlib.Graph();
	g.setGraph({
		rankdir: "TB",
		ranksep: GEN_GAP,
		nodesep: SIBLING_GAP,
		edgesep: 30,
	});
	g.setDefaultEdgeLabel(() => ({}));

	// Add person nodes (visible only)
	const visiblePeople = people.filter((p) => !hiddenPeople.has(p.id));
	for (const p of visiblePeople) {
		g.setNode(p.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
	}

	// Add union nodes (visible only)
	const visibleUnions = unions.filter((u) => !hiddenUnions.has(u.id));
	for (const union of visibleUnions) {
		g.setNode(union.id, { width: UNION_SIZE, height: UNION_SIZE });
	}

	// Edges: partner -> union (horizontal, but dagre will handle rank)
	// We use invisible edges with high weight to keep partners on the same rank as union
	for (const union of visibleUnions) {
		for (const pid of union.partners) {
			if (!hiddenPeople.has(pid)) {
				g.setEdge(pid, union.id, { weight: 5, minlen: 1 });
			}
		}
		// union -> children
		if (!collapsedUnions.has(union.id)) {
			for (const childId of union.children) {
				if (!hiddenPeople.has(childId)) {
					g.setEdge(union.id, childId, { weight: 2, minlen: 1 });
				}
			}
		}
	}

	// People with no unions still need to be in the graph (already added as nodes)

	dagre.layout(g);

	// --- Post-process: align partners horizontally with their union node ---
	// dagre puts them in the same rank but sometimes at slightly different y.
	// Force each union group onto the same y coordinate.
	for (const union of visibleUnions) {
		const unionNode = g.node(union.id);
		if (!unionNode) continue;
		for (const pid of union.partners) {
			const pNode = g.node(pid);
			if (pNode) {
				pNode.y = unionNode.y; // same vertical row
			}
		}
	}

	// --- Build ReactFlow nodes ---
	const rfNodes: Node[] = [];

	for (const p of visiblePeople) {
		const dagreNode = g.node(p.id);
		if (!dagreNode) continue;
		rfNodes.push({
			id: p.id,
			type: "person",
			position: { x: dagreNode.x - NODE_WIDTH / 2, y: dagreNode.y - NODE_HEIGHT / 2 },
			data: { person: p, label: `${p.firstName} ${p.lastName}` },
		});
	}

	for (const union of visibleUnions) {
		const dagreNode = g.node(union.id);
		if (!dagreNode) continue;
		rfNodes.push({
			id: union.id,
			type: "union",
			position: { x: dagreNode.x - UNION_SIZE / 2, y: dagreNode.y - UNION_SIZE / 2 },
			data: {
				unionId: union.id,
				collapsed: collapsedUnions.has(union.id),
				hasChildren: union.children.length > 0,
				partners: union.partners,
				onToggle: onToggle,
			},
		});
	}

	// --- Build edges ---
	const rfEdges: Edge[] = [];
	const edgeSet = new Set<string>();

	for (const union of visibleUnions) {
		// Partner -> Union edges (horizontal spouse connector)
		const partnerPositions = union.partners
			.map((pid) => {
				const dn = g.node(pid);
				return dn ? { id: pid, x: dn.x } : null;
			})
			.filter(Boolean) as { id: string; x: number }[];

		const unionDagre = g.node(union.id);
		if (!unionDagre) continue;
		const unionX = unionDagre.x;

		for (const pp of partnerPositions) {
			if (hiddenPeople.has(pp.id)) continue;
			const edgeKey = `${pp.id}->${union.id}`;
			if (edgeSet.has(edgeKey)) continue;
			edgeSet.add(edgeKey);

			const isLeft = pp.x < unionX;
			rfEdges.push({
				id: edgeKey,
				source: pp.id,
				target: union.id,
				sourceHandle: isLeft ? "right" : "left",
				targetHandle: isLeft ? "left" : "right",
				type: "straight",
				style: { stroke: "#ec4899", strokeWidth: 2, opacity: EDGE_IDLE_OPACITY, transition: "opacity 0.2s" },
			});
		}

		// Union -> children edges (vertical)
		if (!collapsedUnions.has(union.id)) {
			for (const childId of union.children) {
				if (hiddenPeople.has(childId)) continue;
				const edgeKey = `${union.id}->${childId}`;
				if (edgeSet.has(edgeKey)) continue;
				edgeSet.add(edgeKey);

				rfEdges.push({
					id: edgeKey,
					source: union.id,
					target: childId,
					sourceHandle: "bottom",
					targetHandle: "top",
					type: "smoothstep",
					style: { stroke: "#6366f1", strokeWidth: 1.5, opacity: EDGE_IDLE_OPACITY, transition: "opacity 0.2s" },
				});
			}
		}
	}

	return { nodes: rfNodes, edges: rfEdges };
}

function getOrCreate<K, V>(map: Map<K, Set<V>>, key: K): Set<V> {
	let set = map.get(key);
	if (!set) {
		set = new Set();
		map.set(key, set);
	}
	return set;
}

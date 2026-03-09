"use client";

import {
	ReactFlow,
	Background,
	Controls,
	MiniMap,
	useNodesState,
	useEdgesState,
	type Node,
	type Edge,
	type NodeProps,
	Handle,
	Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { Person, Relationship } from "@/server/db/schema";

interface PersonNodeData {
	person: Person;
	label: string;
	[key: string]: unknown;
}

const PersonNode = ({ data }: NodeProps<Node<PersonNodeData>>) => {
	const router = useRouter();
	const person = data.person;
	const initials = `${person.firstName[0]}${person.lastName[0]}`;
	const birthYear = person.birthdate ? new Date(person.birthdate).getFullYear() : null;

	return (
		<div
			className="cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
			onClick={() => router.push(`/kinfolk/person/${person.id}`)}
		>
			<Handle type="target" position={Position.Top} className="!bg-muted-foreground" />
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
						<div className="text-xs text-muted-foreground">b. {birthYear}</div>
					)}
				</div>
			</div>
			<Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
		</div>
	);
};

const nodeTypes = { person: PersonNode };

interface FamilyTreeProps {
	people: Person[];
	relationships: Relationship[];
}

export const FamilyTree = ({ people, relationships }: FamilyTreeProps) => {
	const { nodes: initialNodes, edges: initialEdges } = useMemo(
		() => buildGraph(people, relationships),
		[people, relationships],
	);

	const [nodes, , onNodesChange] = useNodesState(initialNodes);
	const [edges, , onEdgesChange] = useEdgesState(initialEdges);

	return (
		<div className="h-[calc(100vh-3.5rem)] w-full">
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				nodeTypes={nodeTypes}
				fitView
				minZoom={0.1}
				maxZoom={2}
				defaultEdgeOptions={{ animated: false }}
			>
				<Background />
				<Controls />
				<MiniMap
					nodeColor="#6366f1"
					maskColor="rgb(0, 0, 0, 0.1)"
					className="!bg-background"
				/>
			</ReactFlow>
		</div>
	);
};

/**
 * Hierarchical family tree layout.
 *
 * Strategy:
 * 1. Build a "family unit" model: each couple (or single parent) + their children
 * 2. Assign generations top-down from root ancestors
 * 3. Recursively lay out each subtree so children cluster beneath their parents
 * 4. Spouses sit side-by-side; children fan out below the couple's midpoint
 */
function buildGraph(
	people: Person[],
	relationships: Relationship[],
): { nodes: Node<PersonNodeData>[]; edges: Edge[] } {
	const personMap = new Map(people.map((p) => [p.id, p]));

	// --- Build adjacency maps ---
	const childToParents = new Map<string, Set<string>>();
	const parentToChildren = new Map<string, Set<string>>();
	const spouseOf = new Map<string, string>(); // bidirectional first-seen

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

	// --- Assign generations via BFS from roots ---
	const generation = new Map<string, number>();
	const roots = people.filter((p) => !childToParents.has(p.id));

	// Ensure married-in spouses at root level are roots too
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

		// Spouse gets same generation
		const sp = spouseOf.get(cur);
		if (sp && !generation.has(sp)) {
			generation.set(sp, gen);
			queue.push(sp);
		}

		// Children get gen + 1
		for (const childId of parentToChildren.get(cur) ?? []) {
			const existing = generation.get(childId);
			if (existing === undefined || gen + 1 > existing) {
				generation.set(childId, gen + 1);
				queue.push(childId);
			}
		}
	}

	// Anyone still unplaced
	for (const p of people) {
		if (!generation.has(p.id)) generation.set(p.id, 0);
	}

	// --- Build "family units" for layout ---
	// A family unit = one or two parents + their shared children
	// We key units by the "primary parent" (blood-relative or first found)

	interface FamilyUnit {
		parents: string[]; // 1 or 2 person IDs
		children: string[]; // ordered child IDs
	}

	const unitByParent = new Map<string, FamilyUnit>();
	const assignedToUnit = new Set<string>();

	// Deduplicate children: for a couple, children appear under both parents
	// Merge into a single unit keyed by the first parent
	for (const [parentId, kids] of parentToChildren) {
		if (assignedToUnit.has(parentId)) continue;

		const sp = spouseOf.get(parentId);
		const unitParents = [parentId];
		if (sp) unitParents.push(sp);

		// Collect all children of this couple (union)
		const allKids = new Set<string>();
		for (const pid of unitParents) {
			for (const kid of parentToChildren.get(pid) ?? []) {
				allKids.add(kid);
			}
		}

		const unit: FamilyUnit = {
			parents: unitParents,
			children: [...allKids],
		};

		unitByParent.set(parentId, unit);
		for (const pid of unitParents) assignedToUnit.add(pid);
	}

	// --- Recursive subtree layout ---
	const NODE_WIDTH = 200;
	const NODE_HEIGHT = 80;
	const COUPLE_GAP = 20; // gap between spouses
	const SIBLING_GAP = 40; // gap between sibling subtrees
	const GEN_GAP = 140; // vertical gap between generations

	const positions = new Map<string, { x: number; y: number }>();
	const laid = new Set<string>();

	/**
	 * Lay out a subtree rooted at a family unit.
	 * Returns the total width consumed by this subtree.
	 * `x` is the left edge, `y` is the top of this generation row.
	 */
	function layoutUnit(unitParentId: string, x: number, y: number): number {
		const unit = unitByParent.get(unitParentId);
		if (!unit) return 0;

		const parentIds = unit.parents;
		const childIds = unit.children.filter((id) => !laid.has(id));

		// Recursively lay out each child's subtree to compute widths
		interface ChildLayout {
			id: string;
			width: number;
		}

		const childLayouts: ChildLayout[] = [];
		const childY = y + NODE_HEIGHT + GEN_GAP;
		let childX = x;

		for (const childId of childIds) {
			// Does this child have their own family unit?
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

		// Parent couple width
		const coupleWidth =
			parentIds.length === 2
				? NODE_WIDTH * 2 + COUPLE_GAP
				: NODE_WIDTH;

		const subtreeWidth = Math.max(totalChildrenWidth, coupleWidth);

		// Position children
		let cx = x + (subtreeWidth - totalChildrenWidth) / 2;
		for (const cl of childLayouts) {
			if (!laid.has(cl.id)) {
				// Center the child node within its allocated width
				const childNodeX = cx + (cl.width - NODE_WIDTH) / 2;
				positions.set(cl.id, { x: childNodeX, y: childY });
				laid.add(cl.id);

				// Also position the child's spouse next to them if they have one
				const childSp = spouseOf.get(cl.id);
				if (childSp && !laid.has(childSp)) {
					// If this child has their own unit, spouse is already positioned
					// Otherwise, place spouse next to them
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

		// Position parents centered above children (or above subtree center)
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

	/**
	 * Find the family unit ID where this person is a parent.
	 */
	function findUnitForPerson(personId: string): string | undefined {
		if (unitByParent.has(personId)) return personId;
		// Check if they're the spouse in someone else's unit
		const sp = spouseOf.get(personId);
		if (sp && unitByParent.has(sp)) return sp;
		return undefined;
	}

	// Find the topmost family units (generation 0 parents)
	const rootUnits: string[] = [];
	for (const [parentId] of unitByParent) {
		const gen = generation.get(parentId) ?? 0;
		if (gen === 0 && !laid.has(parentId)) {
			rootUnits.push(parentId);
		}
	}

	// Layout all root units side by side
	let globalX = 0;
	for (const unitId of rootUnits) {
		if (laid.has(unitId)) continue;
		const width = layoutUnit(unitId, globalX, 0);
		globalX += width + SIBLING_GAP * 2;
	}

	// Place anyone still unpositioned (disconnected people, childless couples, etc.)
	for (const p of people) {
		if (!positions.has(p.id)) {
			const gen = generation.get(p.id) ?? 0;
			const sp = spouseOf.get(p.id);

			// Try to place next to spouse if spouse is positioned
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

	// --- Build nodes ---
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
			},
		});
	}

	// --- Build edges ---
	const edges: Edge[] = [];
	const edgeSet = new Set<string>();

	for (const rel of relationships) {
		if (rel.type === "child") continue;
		// Skip sibling edges — the tree structure implies them
		if (rel.type === "sibling") continue;

		const edgeId = [rel.personId, rel.relatedId].sort().join("-");
		if (edgeSet.has(edgeId)) continue;
		edgeSet.add(edgeId);

		const isSpouseOrPartner = rel.type === "spouse" || rel.type === "partner";

		edges.push({
			id: `edge-${rel.id}`,
			source: rel.personId,
			target: rel.relatedId,
			type: "default",
			style: {
				stroke: isSpouseOrPartner ? "#ec4899" : "#6366f1",
				strokeWidth: isSpouseOrPartner ? 2 : 1.5,
				strokeDasharray: isSpouseOrPartner ? "5 5" : undefined,
			},
		});
	}

	return { nodes, edges };
}

function getOrCreate<K, V>(map: Map<K, Set<V>>, key: K): Set<V> {
	let set = map.get(key);
	if (!set) {
		set = new Set();
		map.set(key, set);
	}
	return set;
}

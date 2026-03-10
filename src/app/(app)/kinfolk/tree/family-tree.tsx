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
import { useMemo } from "react";
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
	const birthYear = person.birthdate
		? new Date(person.birthdate).getFullYear()
		: null;

	return (
		<div
			className="cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
			onClick={() => router.push(`/kinfolk/person/${person.id}`)}
		>
			{/* Vertical handles for parent-child edges */}
			<Handle
				type="target"
				position={Position.Top}
				id="top"
				className="!bg-muted-foreground"
			/>
			<Handle
				type="source"
				position={Position.Bottom}
				id="bottom"
				className="!bg-muted-foreground"
			/>
			{/* Horizontal handles for spouse/partner edges */}
			<Handle
				type="source"
				position={Position.Left}
				id="left"
				className="!bg-pink-400"
			/>
			<Handle
				type="source"
				position={Position.Right}
				id="right"
				className="!bg-pink-400"
			/>
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

// ---------------------------------------------------------------------------
// Union-based family tree layout
//
// Key concepts:
// - A "Union" is a partnership (marriage, partner, etc.) that may have children.
//   A person can belong to multiple unions (remarriage, blended families).
// - Children belong to a specific union, not just a parent.
// - Spouses connect horizontally (left/right handles).
// - Parent-child connects vertically (bottom/top handles).
// - For children with parents in different unions, edges go to both parents.
// ---------------------------------------------------------------------------

interface Union {
	id: string;
	partners: string[]; // 1 or 2 person IDs
	children: string[]; // child IDs from this union
}

function buildGraph(
	people: Person[],
	relationships: Relationship[],
): { nodes: Node<PersonNodeData>[]; edges: Edge[] } {
	const personMap = new Map(people.map((p) => [p.id, p]));

	// --- Build adjacency maps ---
	const childToParents = new Map<string, Set<string>>();
	const parentToChildren = new Map<string, Set<string>>();

	// Track ALL spouse/partner relationships per person (supports multiple)
	const partnerships = new Map<string, Set<string>>();

	for (const rel of relationships) {
		if (rel.type === "parent") {
			getOrCreate(childToParents, rel.relatedId).add(rel.personId);
			getOrCreate(parentToChildren, rel.personId).add(rel.relatedId);
		}
		if (rel.type === "spouse" || rel.type === "partner") {
			getOrCreate(partnerships, rel.personId).add(rel.relatedId);
			getOrCreate(partnerships, rel.relatedId).add(rel.personId);
		}
	}

	// --- Build unions ---
	// A union is identified by the sorted pair of partners (or single parent).
	// Children are assigned to a union based on which parents they share.
	const unions: Union[] = [];
	const unionMap = new Map<string, Union>(); // unionKey -> Union
	const personToUnions = new Map<string, string[]>(); // personId -> unionIds[]

	// First, create unions from partnerships
	const seenPairs = new Set<string>();
	for (const [personId, partners] of partnerships) {
		for (const partnerId of partners) {
			const key = [personId, partnerId].sort().join("+");
			if (seenPairs.has(key)) continue;
			seenPairs.add(key);

			const union: Union = {
				id: key,
				partners: [personId, partnerId].sort(),
				children: [],
			};
			unions.push(union);
			unionMap.set(key, union);

			for (const pid of union.partners) {
				if (!personToUnions.has(pid)) personToUnions.set(pid, []);
				personToUnions.get(pid)!.push(key);
			}
		}
	}

	// Assign children to unions
	// A child belongs to the union of their parents. If both parents are in
	// a union together, the child goes there. Otherwise, create a "single parent" union.
	const childAssigned = new Set<string>();

	for (const [childId, parentIds] of childToParents) {
		const parents = [...parentIds];

		if (parents.length >= 2) {
			// Try to find a union that contains at least two of the parents
			let assigned = false;
			for (let i = 0; i < parents.length && !assigned; i++) {
				for (let j = i + 1; j < parents.length && !assigned; j++) {
					const key = [parents[i]!, parents[j]!].sort().join("+");
					const union = unionMap.get(key);
					if (union) {
						union.children.push(childId);
						childAssigned.add(childId);
						assigned = true;
					}
				}
			}

			// Parents exist but no union between them -- create implicit unions
			if (!assigned) {
				// Create a union for the first pair of parents
				const key = parents.slice(0, 2).sort().join("+");
				if (!unionMap.has(key)) {
					const union: Union = {
						id: key,
						partners: parents.slice(0, 2).sort(),
						children: [childId],
					};
					unions.push(union);
					unionMap.set(key, union);
					for (const pid of union.partners) {
						if (!personToUnions.has(pid)) personToUnions.set(pid, []);
						personToUnions.get(pid)!.push(key);
					}
				} else {
					unionMap.get(key)!.children.push(childId);
				}
				childAssigned.add(childId);
			}
		} else if (parents.length === 1) {
			// Single known parent -- find or create a single-parent union
			const parentId = parents[0]!;
			const existingUnions = personToUnions.get(parentId) ?? [];

			// Try to add to an existing union where this parent has a partner
			let assigned = false;
			for (const uid of existingUnions) {
				const u = unionMap.get(uid)!;
				if (u.partners.length === 1 || u.partners.includes(parentId)) {
					u.children.push(childId);
					childAssigned.add(childId);
					assigned = true;
					break;
				}
			}

			if (!assigned) {
				// Create a single-parent union
				const key = `solo:${parentId}`;
				if (!unionMap.has(key)) {
					const union: Union = {
						id: key,
						partners: [parentId],
						children: [childId],
					};
					unions.push(union);
					unionMap.set(key, union);
					if (!personToUnions.has(parentId))
						personToUnions.set(parentId, []);
					personToUnions.get(parentId)!.push(key);
				} else {
					unionMap.get(key)!.children.push(childId);
				}
				childAssigned.add(childId);
			}
		}
	}

	// Create childless partnership unions for couples who have no kids
	// (already handled above when building from partnerships)

	// --- Assign generations via BFS from roots ---
	const generation = new Map<string, number>();
	const roots = people.filter((p) => !childToParents.has(p.id));

	// Ensure married-in spouses at root level are also roots
	for (const r of [...roots]) {
		const partners = partnerships.get(r.id);
		if (partners) {
			for (const sp of partners) {
				if (!roots.find((x) => x.id === sp)) {
					const spPerson = personMap.get(sp);
					if (spPerson) roots.push(spPerson);
				}
			}
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

		// All partners get same generation
		const partners = partnerships.get(cur);
		if (partners) {
			for (const sp of partners) {
				if (!generation.has(sp)) {
					generation.set(sp, gen);
					queue.push(sp);
				}
			}
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

	// --- Layout ---
	const NODE_WIDTH = 200;
	const NODE_HEIGHT = 80;
	const COUPLE_GAP = 40; // horizontal gap between spouses (for the connector line)
	const SIBLING_GAP = 40; // gap between sibling subtrees
	const GEN_GAP = 140; // vertical gap between generations

	const positions = new Map<string, { x: number; y: number }>();
	const laid = new Set<string>();
	const laidUnions = new Set<string>();

	/**
	 * Lay out a union and its descendant subtrees.
	 * Returns the total width consumed.
	 */
	function layoutUnion(unionId: string, x: number, y: number): number {
		if (laidUnions.has(unionId)) return 0;
		laidUnions.add(unionId);

		const union = unionMap.get(unionId);
		if (!union) return 0;

		const parentIds = union.partners.filter((id) => !laid.has(id));
		const allParentIds = union.partners;
		const childIds = union.children.filter((id) => !laid.has(id));

		// Recursively lay out each child's subtree
		interface ChildLayout {
			id: string;
			width: number;
		}

		const childLayouts: ChildLayout[] = [];
		const childY = y + NODE_HEIGHT + GEN_GAP;
		let childX = x;

		for (const childId of childIds) {
			// Find this child's primary union (where they are a parent)
			const childUnionIds = personToUnions.get(childId) ?? [];
			let width = NODE_WIDTH;

			if (childUnionIds.length > 0) {
				// Lay out all unions this child participates in
				// The "primary" union determines position; others extend sideways
				let totalWidth = 0;
				for (const cuid of childUnionIds) {
					if (!laidUnions.has(cuid)) {
						const w = layoutUnion(cuid, childX + totalWidth, childY);
						totalWidth += w > 0 ? w + SIBLING_GAP : 0;
					}
				}
				if (totalWidth > 0) {
					width = totalWidth - SIBLING_GAP;
				}
			}

			width = Math.max(width, NODE_WIDTH);
			childLayouts.push({ id: childId, width });
			childX += width + SIBLING_GAP;
		}

		const totalChildrenWidth =
			childLayouts.reduce((sum, c) => sum + c.width, 0) +
			Math.max(0, childLayouts.length - 1) * SIBLING_GAP;

		// Parent cluster width: each parent node + gaps between them
		const parentCount = allParentIds.length;
		const coupleWidth =
			parentCount >= 2
				? NODE_WIDTH * parentCount +
					COUPLE_GAP * (parentCount - 1)
				: NODE_WIDTH;

		const subtreeWidth = Math.max(totalChildrenWidth, coupleWidth);

		// Position children centered under parents
		let cx = x + (subtreeWidth - totalChildrenWidth) / 2;
		for (const cl of childLayouts) {
			if (!laid.has(cl.id)) {
				const childNodeX = cx + (cl.width - NODE_WIDTH) / 2;
				positions.set(cl.id, { x: childNodeX, y: childY });
				laid.add(cl.id);

				// Position any partners of this child who don't have their own unit
				const childPartners = partnerships.get(cl.id);
				if (childPartners) {
					let offset = 1;
					for (const cp of childPartners) {
						if (!laid.has(cp)) {
							positions.set(cp, {
								x:
									childNodeX +
									(NODE_WIDTH + COUPLE_GAP) * offset,
								y: childY,
							});
							laid.add(cp);
							offset++;
						}
					}
				}
			}
			cx += cl.width + SIBLING_GAP;
		}

		// Position parents centered above children
		const parentY = y;
		const centerX = x + subtreeWidth / 2;

		if (parentIds.length >= 2) {
			// Multiple partners: spread them out from center
			const totalParentsWidth =
				parentIds.length * NODE_WIDTH +
				(parentIds.length - 1) * COUPLE_GAP;
			let px = centerX - totalParentsWidth / 2;
			for (const pid of parentIds) {
				if (!laid.has(pid)) {
					positions.set(pid, { x: px, y: parentY });
					laid.add(pid);
				}
				px += NODE_WIDTH + COUPLE_GAP;
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

	// Find root-level unions (generation 0 parents)
	const rootUnionIds: string[] = [];
	for (const union of unions) {
		const gen = Math.min(
			...union.partners.map((p) => generation.get(p) ?? 0),
		);
		if (gen === 0) {
			rootUnionIds.push(union.id);
		}
	}

	// Deduplicate: if a person appears in multiple root unions, lay them out together
	let globalX = 0;
	for (const unionId of rootUnionIds) {
		if (laidUnions.has(unionId)) continue;
		const width = layoutUnion(unionId, globalX, 0);
		globalX += width + SIBLING_GAP * 2;
	}

	// Lay out any non-root unions that haven't been placed yet
	for (const union of unions) {
		if (laidUnions.has(union.id)) continue;
		const gen = Math.min(
			...union.partners.map((p) => generation.get(p) ?? 0),
		);
		const width = layoutUnion(
			union.id,
			globalX,
			gen * (NODE_HEIGHT + GEN_GAP),
		);
		globalX += width + SIBLING_GAP * 2;
	}

	// Place anyone still unpositioned (disconnected, no unions)
	for (const p of people) {
		if (!positions.has(p.id)) {
			const gen = generation.get(p.id) ?? 0;
			const partners = partnerships.get(p.id);

			if (partners) {
				// Try to place next to a positioned partner
				for (const sp of partners) {
					if (positions.has(sp)) {
						const spPos = positions.get(sp)!;
						positions.set(p.id, {
							x: spPos.x + NODE_WIDTH + COUPLE_GAP,
							y: spPos.y,
						});
						break;
					}
				}
			}

			if (!positions.has(p.id)) {
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
		if (rel.type === "sibling") continue;

		const edgeId = [rel.personId, rel.relatedId].sort().join("-");
		if (edgeSet.has(edgeId)) continue;
		edgeSet.add(edgeId);

		const isSpouseOrPartner =
			rel.type === "spouse" || rel.type === "partner";

		if (isSpouseOrPartner) {
			// Determine which handle to use based on relative position
			const pos1 = positions.get(rel.personId);
			const pos2 = positions.get(rel.relatedId);
			let sourceHandle = "right";
			let targetHandle = "left";

			if (pos1 && pos2 && pos1.x > pos2.x) {
				sourceHandle = "left";
				targetHandle = "right";
			}

			edges.push({
				id: `edge-${rel.id}`,
				source: rel.personId,
				target: rel.relatedId,
				sourceHandle,
				targetHandle,
				type: "straight",
				style: {
					stroke: "#ec4899",
					strokeWidth: 2,
					strokeDasharray: rel.endedAt ? "5 5" : undefined, // dashed if ended (divorce)
				},
			});
		} else {
			// Parent-child: vertical edge
			edges.push({
				id: `edge-${rel.id}`,
				source: rel.personId,
				target: rel.relatedId,
				sourceHandle: "bottom",
				targetHandle: "top",
				type: "default",
				style: {
					stroke: "#6366f1",
					strokeWidth: 1.5,
				},
			});
		}
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

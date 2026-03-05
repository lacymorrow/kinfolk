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

function buildGraph(
	people: Person[],
	relationships: Relationship[],
): { nodes: Node<PersonNodeData>[]; edges: Edge[] } {
	const personMap = new Map(people.map((p) => [p.id, p]));

	// Find parent-child relationships to determine generations
	const parentChildRels = relationships.filter((r) => r.type === "parent");
	const childToParents = new Map<string, string[]>();
	const parentToChildren = new Map<string, string[]>();

	for (const rel of parentChildRels) {
		// personId is the parent, relatedId is the child
		const parents = childToParents.get(rel.relatedId) ?? [];
		parents.push(rel.personId);
		childToParents.set(rel.relatedId, parents);

		const children = parentToChildren.get(rel.personId) ?? [];
		children.push(rel.relatedId);
		parentToChildren.set(rel.personId, children);
	}

	// Determine generations via BFS
	const generations = new Map<string, number>();

	// Find root nodes (people with no parents in the dataset)
	const roots = people.filter((p) => !childToParents.has(p.id));
	for (const root of roots) {
		if (!generations.has(root.id)) {
			generations.set(root.id, 0);
		}
	}

	// BFS to assign generations
	const queue = [...roots.map((r) => r.id)];
	while (queue.length > 0) {
		const current = queue.shift()!;
		const gen = generations.get(current) ?? 0;
		const children = parentToChildren.get(current) ?? [];
		for (const childId of children) {
			const existingGen = generations.get(childId);
			if (existingGen === undefined || gen + 1 > existingGen) {
				generations.set(childId, gen + 1);
				queue.push(childId);
			}
		}
	}

	// Assign generation 0 to anyone not yet placed
	for (const p of people) {
		if (!generations.has(p.id)) {
			generations.set(p.id, 0);
		}
	}

	// Group spouses/partners together
	const spouseRels = relationships.filter(
		(r) => r.type === "spouse" || r.type === "partner",
	);
	const spouseMap = new Map<string, string>();
	for (const rel of spouseRels) {
		if (!spouseMap.has(rel.personId) && !spouseMap.has(rel.relatedId)) {
			spouseMap.set(rel.relatedId, rel.personId);
			// Ensure same generation
			const gen = generations.get(rel.personId) ?? 0;
			generations.set(rel.relatedId, gen);
		}
	}

	// Group people by generation
	const genGroups = new Map<number, string[]>();
	for (const [personId, gen] of generations) {
		const group = genGroups.get(gen) ?? [];
		group.push(personId);
		genGroups.set(gen, group);
	}

	// Layout nodes
	const NODE_WIDTH = 200;
	const NODE_HEIGHT = 80;
	const X_GAP = 40;
	const Y_GAP = 120;

	const nodes: Node<PersonNodeData>[] = [];
	const processedIds = new Set<string>();

	const sortedGens = [...genGroups.keys()].sort((a, b) => a - b);

	for (const gen of sortedGens) {
		const group = genGroups.get(gen) ?? [];

		// Order: place couples together
		const ordered: string[] = [];
		const visited = new Set<string>();

		for (const id of group) {
			if (visited.has(id)) continue;
			visited.add(id);
			ordered.push(id);

			// Check if spouse is in the same group
			const spouse = spouseMap.get(id);
			if (spouse && group.includes(spouse) && !visited.has(spouse)) {
				visited.add(spouse);
				ordered.push(spouse);
			}
			// Check reverse
			for (const [k, v] of spouseMap) {
				if (v === id && group.includes(k) && !visited.has(k)) {
					visited.add(k);
					ordered.push(k);
				}
			}
		}

		const totalWidth = ordered.length * (NODE_WIDTH + X_GAP) - X_GAP;
		const startX = -totalWidth / 2;

		for (let i = 0; i < ordered.length; i++) {
			const personId = ordered[i]!;
			const person = personMap.get(personId);
			if (!person || processedIds.has(personId)) continue;
			processedIds.add(personId);

			nodes.push({
				id: personId as string,
				type: "person",
				position: {
					x: startX + i * (NODE_WIDTH + X_GAP),
					y: gen * (NODE_HEIGHT + Y_GAP),
				},
				data: {
					person,
					label: `${person.firstName} ${person.lastName}`,
				},
			});
		}
	}

	// Build edges
	const edges: Edge[] = [];
	const edgeSet = new Set<string>();

	for (const rel of relationships) {
		if (rel.type === "child") continue; // Only use parent direction to avoid duplicates

		const edgeId = [rel.personId, rel.relatedId].sort().join("-");
		if (edgeSet.has(edgeId)) continue;
		edgeSet.add(edgeId);

		const isSpouseOrPartner = rel.type === "spouse" || rel.type === "partner";
		const isSibling = rel.type === "sibling";

		edges.push({
			id: `edge-${rel.id}`,
			source: rel.type === "parent" ? rel.personId : rel.personId,
			target: rel.relatedId,
			type: "default",
			style: {
				stroke: isSpouseOrPartner
					? "#ec4899"
					: isSibling
						? "#8b5cf6"
						: "#6366f1",
				strokeWidth: isSpouseOrPartner ? 2 : 1.5,
				strokeDasharray: isSpouseOrPartner || isSibling ? "5 5" : undefined,
			},
		});
	}

	return { nodes, edges };
}

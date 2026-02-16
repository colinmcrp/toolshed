"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { RelationshipNode, RelationshipLink } from "@/types/partnerships";

export function RelationshipGraph() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 400;
    const height = 300;

    const nodes: RelationshipNode[] = [
      { id: "1", name: "Laura M.", role: "Account Mgr", type: "internal" },
      { id: "2", name: "Jane Smith", role: "Head of CSR", type: "partner" },
      { id: "3", name: "Bob Wilson", role: "Operations", type: "partner" },
      { id: "4", name: "Sarah Key", role: "CEO Office", type: "partner" },
      { id: "5", name: "James T.", role: "Mentor Lead", type: "internal" },
    ];

    const links: RelationshipLink[] = [
      { source: "1", target: "2", strength: 1 },
      { source: "1", target: "5", strength: 1 },
      { source: "2", target: "3", strength: 1 },
      { source: "2", target: "4", strength: 1 },
      { source: "5", target: "3", strength: 1 },
    ];

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", "100%");

    svg.selectAll("*").remove();

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(80)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", 2);

    const node = svg
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(
        d3
          .drag<SVGGElement, RelationshipNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any
      );

    node
      .append("circle")
      .attr("r", 20)
      .attr("fill", (d) => (d.type === "internal" ? "#4f46e5" : "#f43f5e"))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    node
      .append("text")
      .text((d) => d.name)
      .attr("y", 35)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("font-weight", "600")
      .style("fill", "#1e293b");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, []);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
      <h3 className="font-bold text-slate-800 mb-4">Key Relationships</h3>
      <div className="flex-1 min-h-[300px]">
        <svg ref={svgRef}></svg>
      </div>
      <div className="flex gap-4 mt-2 text-[10px] font-bold uppercase">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-indigo-600"></div> MCR Staff
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-rose-500"></div> Partner
          Contacts
        </div>
      </div>
    </div>
  );
}

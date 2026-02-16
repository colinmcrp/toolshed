"use client";

import Link from "next/link";
import type { Partner } from "@/types/database";
import { Badge } from "@/components/ui/badge";

interface PartnerListTableProps {
  partners: Partner[];
}

export function PartnerListTable({ partners }: PartnerListTableProps) {
  const getHeatColor = (heat: number) => {
    if (heat > 80) return "bg-rose-500";
    if (heat > 60) return "bg-orange-500";
    if (heat > 40) return "bg-yellow-500";
    return "bg-blue-500";
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
          <tr>
            <th className="px-6 py-4">Partner</th>
            <th className="px-6 py-4">Types</th>
            <th className="px-6 py-4">Heat</th>
            <th className="px-6 py-4">Mentors</th>
            <th className="px-6 py-4">Last Contact</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {partners.map((partner) => (
            <tr
              key={partner.id}
              className="hover:bg-slate-50 transition-colors"
            >
              <td className="px-6 py-4">
                <Link
                  href={`/partnerships/${partner.id}`}
                  className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors"
                >
                  {partner.name}
                </Link>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1">
                  {partner.types.map((type) => (
                    <Badge
                      key={type}
                      variant="secondary"
                      className="text-[10px]"
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${getHeatColor(partner.heat)}`}
                  />
                  <span className="font-bold text-slate-700">
                    {partner.heat}°
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 font-medium text-slate-700">
                {partner.mentors_count}
              </td>
              <td className="px-6 py-4 text-xs text-slate-500">
                {partner.last_contact
                  ? new Date(partner.last_contact).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

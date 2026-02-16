import { getPartners } from "@/lib/partnerships/queries";
import { PartnerListTable } from "@/components/partnerships/partner-list-table";
import { Header } from "@/components/layout/header";
import { Handshake } from "lucide-react";

export default async function PartnershipsPage() {
  const partners = await getPartners();

  return (
    <>
      <Header title="Partnerships" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <Handshake size={28} className="text-indigo-600" />
              Partner Organisations
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage and monitor all MCR Pathways partnerships
            </p>
          </div>
        </div>
        <PartnerListTable partners={partners} />
      </div>
    </>
  );
}

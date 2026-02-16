import { redirect } from "next/navigation";
import { getPartnerForCurrentUser } from "@/lib/partnerships/queries";
import { PartnerPortal } from "@/components/partnerships/partner-portal";
import { Header } from "@/components/layout/header";

export default async function PartnerPortalPage() {
  const partner = await getPartnerForCurrentUser();

  if (!partner) {
    redirect("/");
  }

  return (
    <>
      <Header title="Partner Portal" />
      <div className="p-6">
        <PartnerPortal partner={partner} />
      </div>
    </>
  );
}

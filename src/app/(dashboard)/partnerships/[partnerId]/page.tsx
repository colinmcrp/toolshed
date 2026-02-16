import { notFound } from "next/navigation";
import { getPartnerById } from "@/lib/partnerships/queries";
import { InternalView } from "@/components/partnerships/internal-view";
import { Header } from "@/components/layout/header";

interface Props {
  params: Promise<{ partnerId: string }>;
}

export default async function PartnerDetailPage({ params }: Props) {
  const { partnerId } = await params;
  const partner = await getPartnerById(partnerId);

  if (!partner) {
    notFound();
  }

  return (
    <>
      <Header title={partner.name} />
      <div className="p-6">
        <InternalView partner={partner} />
      </div>
    </>
  );
}

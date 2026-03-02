import { Header } from "@/components/layout/header";
import { SecureZipCreator } from "@/components/secure-zip/secure-zip-creator";

export default function SecureZipPage() {
  return (
    <>
      <Header title="Secure ZIP Creator" />
      <main className="flex-1 overflow-auto p-6">
        <SecureZipCreator />
      </main>
    </>
  );
}

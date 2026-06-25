import { redirect } from "next/navigation";
import ArHeader from "@/components/ar/ArHeader";
import Editor from "@/components/ar/Editor";
import { getCardForEditor } from "@/lib/ar/db";
import { fetchGallery } from "@/lib/ar/gallery";

export const dynamic = "force-dynamic";

export default async function ArEditorPage({
  params,
}: {
  params: Promise<{ cardId: string }>;
}) {
  const { cardId } = await params;
  const data = await getCardForEditor(cardId);
  if (!data) redirect("/ar/login");
  if (data.tier === "free") redirect("/ar");

  const galleryAssets = await fetchGallery();

  return (
    <div className="ar-editor-page">
      <ArHeader email={data.email} />
      <Editor
        card={data.card}
        model={data.model}
        galleryAssets={galleryAssets}
        tier={data.tier}
        storageUsedBytes={data.storageUsedBytes}
        storageCapBytes={data.storageCapBytes}
      />
    </div>
  );
}

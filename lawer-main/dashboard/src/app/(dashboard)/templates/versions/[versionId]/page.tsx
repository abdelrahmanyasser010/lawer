"use client";

import { useParams } from "next/navigation";
import TemplateVersionEditor from "@/components/admin/template-editor/TemplateVersionEditor";

export default function TemplateVersionPage() {
  const { versionId } = useParams<{ versionId: string }>();
  return <TemplateVersionEditor versionId={versionId} />;
}

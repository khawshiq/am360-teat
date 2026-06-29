"use client";
import { useParams } from "next/navigation";
import BranchWorkspace from "@/components/BranchWorkspace";

export default function BranchDetail() {
  const { id } = useParams<{ id: string }>();
  return <BranchWorkspace branchId={id} isAdmin={true} />;
}

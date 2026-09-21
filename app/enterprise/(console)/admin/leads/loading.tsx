import PageSkeleton from "@/components/enterprise/Skeleton";

/** Leads: the filter toolbar, then the pool. */
export default function Loading() {
  return <PageSkeleton toolbar rows={8} actions={3} />;
}

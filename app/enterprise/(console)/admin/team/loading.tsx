import PageSkeleton from "@/components/enterprise/Skeleton";

/** Team: the pools strip, then one row per seat. */
export default function Loading() {
  return <PageSkeleton stats rows={4} />;
}

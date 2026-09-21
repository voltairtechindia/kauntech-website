import PageSkeleton from "@/components/enterprise/Skeleton";

/** Overview: four totals, the team table, and the events panel beside it. */
export default function Loading() {
  return <PageSkeleton stats side rows={5} />;
}

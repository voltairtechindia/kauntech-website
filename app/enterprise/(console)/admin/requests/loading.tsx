import PageSkeleton from "@/components/enterprise/Skeleton";

/** Requests: the ask form, then the thread of everything asked so far. */
export default function Loading() {
  return <PageSkeleton rows={4} actions={0} />;
}

import { useParams } from "react-router-dom";
import { candidates } from "@/data/seed";

const Review = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  const candidate = candidates.find((c) => c.id === candidateId);

  return (
    <div className="flex min-h-full items-center justify-center bg-background p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          {candidate ? candidate.name : "Candidate not found"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Evidence review coming next
        </p>
      </div>
    </div>
  );
};

export default Review;

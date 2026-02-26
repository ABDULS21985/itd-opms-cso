"use client";

interface MatchScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

function getScoreColor(score: number) {
  if (score >= 70) return { bg: "bg-emerald-100", text: "text-emerald-700", ring: "stroke-emerald-500" };
  if (score >= 40) return { bg: "bg-amber-100", text: "text-amber-700", ring: "stroke-amber-500" };
  return { bg: "bg-gray-100", text: "text-gray-600", ring: "stroke-gray-400" };
}

function getScoreLabel(score: number) {
  if (score >= 70) return "Strong Match";
  if (score >= 40) return "Moderate Match";
  return "Low Match";
}

const sizeMap = {
  sm: { container: "w-10 h-10", fontSize: "text-xs", ringSize: 36, strokeWidth: 3 },
  md: { container: "w-14 h-14", fontSize: "text-sm", ringSize: 52, strokeWidth: 3.5 },
  lg: { container: "w-20 h-20", fontSize: "text-lg", ringSize: 76, strokeWidth: 4 },
};

export function MatchScoreBadge({
  score,
  size = "md",
  showLabel = false,
  className = "",
}: MatchScoreBadgeProps) {
  const colors = getScoreColor(score);
  const dims = sizeMap[size];
  const radius = (dims.ringSize - dims.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`relative ${dims.container} flex items-center justify-center`}>
        <svg
          className="absolute inset-0 -rotate-90"
          width={dims.ringSize}
          height={dims.ringSize}
          viewBox={`0 0 ${dims.ringSize} ${dims.ringSize}`}
        >
          {/* Background ring */}
          <circle
            cx={dims.ringSize / 2}
            cy={dims.ringSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={dims.strokeWidth}
            className="text-gray-200"
          />
          {/* Progress ring */}
          <circle
            cx={dims.ringSize / 2}
            cy={dims.ringSize / 2}
            r={radius}
            fill="none"
            strokeWidth={dims.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className={colors.ring}
          />
        </svg>
        <span className={`relative ${dims.fontSize} font-bold ${colors.text}`}>
          {score}
        </span>
      </div>
      {showLabel && (
        <div className="flex flex-col">
          <span className={`text-xs font-medium ${colors.text}`}>
            {getScoreLabel(score)}
          </span>
          <span className="text-[10px] text-gray-400">match score</span>
        </div>
      )}
    </div>
  );
}

// Simpler inline badge variant
export function MatchScoreInline({
  score,
  className = "",
}: {
  score: number;
  className?: string;
}) {
  const colors = getScoreColor(score);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${colors.bg} ${colors.text} ${className}`}
    >
      {score}% match
    </span>
  );
}

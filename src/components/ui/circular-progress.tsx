import * as React from "react";

interface CircularProgressProps extends React.SVGProps<SVGSVGElement> {
  value?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  textClassName?: string;
}

const CircularProgress = React.forwardRef<SVGSVGElement, CircularProgressProps>(
  ({ value = 0, size = 80, strokeWidth = 8, className, textClassName, ...props }, ref) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={className}
        ref={ref}
        {...props}
      >
        <circle
          className="text-gray-200"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-blue-600 transition-all duration-500"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy=".3em"
          className={textClassName || "text-lg font-bold fill-current text-gray-700"}
        >
          {`${Math.round(value)}%`}
        </text>
      </svg>
    );
  }
);

CircularProgress.displayName = "CircularProgress";

export { CircularProgress };

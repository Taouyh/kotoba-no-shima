import { chapters, type ChapterId } from "../data/curriculum";

function Island({
  x,
  y,
  color,
  children,
}: {
  x: number;
  y: number;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="30" rx="65" ry="19" fill="#b7d6cf" opacity=".22" />
      <path d="M-57 9 Q-72 26-45 35 Q-2 52 44 34 Q72 22 54 4Z" fill="#d7c8a5" />
      <path
        d="M-60 4 Q-40-15-6-13 Q28-23 58 1 Q74 19 41 26 Q-8 40-48 24 Q-72 18-60 4"
        fill={color}
      />
      {children}
    </g>
  );
}
function Tree({
  x = 0,
  y = 0,
  scale = 1,
}: {
  x?: number;
  y?: number;
  scale?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d="M0-4V13"
        stroke="#8e9270"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M-18-3Q-27-14-11-23Q-9-44 6-35Q24-35 21-17Q34-1 15 4Q-4 12-18-3"
        fill="#76a380"
      />
      <path
        d="M-9-3Q-18-14-8-21Q-4-36 4-29Q15-30 14-17Q24-6 12-1Z"
        fill="#8bb58e"
      />
    </g>
  );
}
export default function IslandMap({
  onSelect,
  completed,
}: {
  onSelect: (id: ChapterId) => void;
  completed: ChapterId[];
}) {
  const positions = [
    [107, 126],
    [290, 191],
    [491, 113],
    [666, 186],
    [845, 110],
    [1010, 179],
  ];
  return (
    <div className="island-map">
      <div className="map-key">
        <span className="map-dot" /> 随时出发，按自己的节奏探索
      </div>
      <svg
        viewBox="0 0 1120 330"
        role="img"
        aria-label="六座学习小岛：平假名、浊音、片假名、拗音、节奏和高低音"
      >
        <defs>
          <pattern
            id="sea"
            width="46"
            height="38"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M12 23q5 4 10 0"
              fill="none"
              stroke="#d4e4de"
              strokeWidth="1.5"
            />
          </pattern>
        </defs>
        <rect width="1120" height="330" fill="url(#sea)" />
        <path
          d="M107 142C165 260 223 100 290 207S411 228 491 129S585 120 666 202S777 228 845 126S966 109 1010 195"
          fill="none"
          stroke="#b9cec3"
          strokeWidth="2"
          strokeDasharray="5 8"
        />
        <g fill="none" stroke="#b7c9bf" strokeWidth="1.5" strokeLinecap="round">
          <path d="m227 59 5-3 5 3m0 0 5-3 5 3M752 71l5-3 5 3m0 0 5-3 5 3M956 53l5-3 5 3m0 0 5-3 5 3" />
        </g>
        <g transform="translate(379 269)">
          <path d="m-12 0 24 0-5 8H-6Z" fill="#b98c60" />
          <path d="M0-22V0H-13Z" fill="#faf9eb" />
          <path d="M2-18V-1H13Z" fill="#e2b580" />
        </g>
        {chapters.map((chapter, i) => {
          const [x, y] = positions[i];
          const selected = chapter.id === "voiced";
          return (
            <g key={chapter.id}>
              <Island
                x={x}
                y={y}
                color={
                  [
                    "#b4ceb0",
                    "#d5d3a7",
                    "#b2cbbd",
                    "#d7c5c2",
                    "#b4cfc8",
                    "#c9c7d3",
                  ][i]
                }
              >
                {i === 0 && (
                  <>
                    <Tree x={-26} y={-7} scale={0.8} />
                    <Tree x={25} y={-3} />
                    <Tree x={1} y={-19} scale={1.15} />
                  </>
                )}
                {i === 1 && (
                  <>
                    <path
                      d="M-29 1Q-5-3 9 7T49 13"
                      fill="none"
                      stroke="#85b9bb"
                      strokeWidth="10"
                    />
                    <path
                      d="M-3-1 14 13m-13-17 17 13"
                      stroke="#ac805c"
                      strokeWidth="4"
                    />
                    <Tree x={-28} y={-16} scale={0.8} />
                    <path
                      d="M14-19v-22h30v22m-34-20h38M18-30h22"
                      fill="none"
                      stroke="#c98361"
                      strokeWidth="5"
                    />
                  </>
                )}
                {i === 2 && (
                  <>
                    <path d="M-25 1V-23H4V1Z" fill="#e9e6d3" />
                    <path d="m-32-23 22-18 22 18Z" fill="#768f85" />
                    <path d="M-6-1v-14h-8v14" fill="#9bad9d" />
                    <path d="M18 7V-47H32V7Z" fill="#f2f1e5" />
                    <path d="M17-32h16v8H17Z" fill="#c88269" />
                    <path d="m14-47 11-9 11 9Z" fill="#718b82" />
                  </>
                )}
                {i === 3 && (
                  <>
                    <Tree x={-20} y={-14} scale={0.9} />
                    <g fill="#e3a5a1">
                      <circle cx="-20" cy="-42" r="16" />
                      <circle cx="-35" cy="-33" r="12" />
                      <circle cx="-8" cy="-31" r="12" />
                    </g>
                    <path
                      d="M12 9q-2-23 25-23"
                      fill="none"
                      stroke="#c69b88"
                      strokeWidth="3"
                    />
                    <g fill="#f6e1d4">
                      <circle cx="12" cy="-1" r="4" />
                      <circle cx="24" cy="-10" r="4" />
                      <circle cx="37" cy="-14" r="4" />
                    </g>
                  </>
                )}
                {i === 4 && (
                  <>
                    <path
                      d="M-38 5q37-24 78 6"
                      fill="none"
                      stroke="#e4dcc2"
                      strokeWidth="17"
                    />
                    <path
                      d="M-20-1q-4-22 1-39"
                      stroke="#9d9770"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      d="M-20-37q-20-14-29 2m29-2q16-20 30-8m-30 8q10-8 24 4"
                      fill="none"
                      stroke="#78a58c"
                      strokeWidth="7"
                      strokeLinecap="round"
                    />
                    <path
                      d="m18 6 3-17 12-5 7 14"
                      fill="#f0e6cb"
                      stroke="#a2b0a0"
                      strokeWidth="2"
                    />
                  </>
                )}
                {i === 5 && (
                  <>
                    <path d="m-48 12 31-59 34 59Z" fill="#97aca5" />
                    <path d="m-24-32 7-15 10 18-10-4Z" fill="#f4f3e8" />
                    <path d="m-6 16 30-42 27 42Z" fill="#b0b6b0" />
                    <Tree x={-38} y={13} scale={0.5} />
                  </>
                )}
              </Island>
              <text x={x} y={y + 68} textAnchor="middle" className="map-label">
                {chapter.name}
              </text>
              <g transform={`translate(${x} ${y + 95})`}>
                <circle
                  r="11"
                  fill={
                    completed.includes(chapter.id)
                      ? "#285749"
                      : selected
                        ? "#cc7854"
                        : "#fffdf7"
                  }
                  stroke={selected ? "#cc7854" : "#cdd8cc"}
                />
                <text
                  textAnchor="middle"
                  y="4"
                  fontSize="11"
                  fill={
                    completed.includes(chapter.id) || selected
                      ? "#fff"
                      : "#77887a"
                  }
                >
                  {completed.includes(chapter.id) ? "✓" : `0${i + 1}`}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
      <div className="map-hotspots">
        {chapters.map((c, i) => (
          <button
            key={c.id}
            aria-label={`探索${c.name}`}
            onClick={() => onSelect(c.id)}
            style={{
              left: `${positions[i][0] / 11.2}%`,
              top: `${positions[i][1] / 3.3 - 14}%`,
            }}
          />
        ))}
      </div>
      <span className="map-caption">YOUR LITTLE WORLD OF JAPANESE</span>
    </div>
  );
}

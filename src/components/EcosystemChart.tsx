import { Building, Calendar, Users, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

// Triangle layout:
//       Organizers (top-center)
//      /                       \
// Sponsors (bottom-left)   Creators (bottom-right)

// SVG viewBox: 800 x 560
// Card nominal centers (where lines connect):
//   Organizers:  x=400, y=90   (top center)
//   Sponsors:    x=130, y=450  (bottom left)
//   Creators:    x=670, y=450  (bottom right)

const NODE_ORGANIZER  = { cx: 400, cy: 90  };
const NODE_SPONSOR    = { cx: 130, cy: 450 };
const NODE_CREATOR    = { cx: 670, cy: 450 };

const EdgeLabel = ({
  x, y, lines, align = "middle", isPrimary = false
}: {
  x: number; y: number; lines: string[]; align?: "start" | "middle" | "end"; isPrimary?: boolean;
}) => (
  <g transform={`translate(${x}, ${y})`}>
    {lines.map((line, i) => (
      <text
        key={i}
        x={0}
        y={i * 15}
        textAnchor={align}
        className={`${isPrimary ? "fill-primary" : "fill-foreground"} font-bold tracking-tight text-[12px]`}
        style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
      >
        {line}
      </text>
    ))}
  </g>
);

export const EcosystemChart = () => {
  return (
    <section className="py-24 bg-muted/10 border-y border-border/10">
      <div className="container">
        <div className="text-center mb-20 space-y-3">
          <h2 className="text-3xl font-bold md:text-5xl tracking-tighter">The Synergy Hub</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A frictionless three-way connection where brands, events, and talent thrive together.
          </p>
        </div>

        {/* Desktop: SVG Triangle Chart */}
        <div className="hidden md:block w-full max-w-5xl mx-auto">
          <svg
            viewBox="0 0 800 560"
            className="w-full overflow-visible"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <marker id="arrow-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" className="fill-primary" />
              </marker>
              
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* ── Background Connections (Faint) ── */}
            <g className="opacity-[0.05]">
               <line x1={NODE_ORGANIZER.cx} y1={NODE_ORGANIZER.cy} x2={NODE_SPONSOR.cx} y2={NODE_SPONSOR.cy} stroke="white" strokeWidth="2" />
               <line x1={NODE_ORGANIZER.cx} y1={NODE_ORGANIZER.cy} x2={NODE_CREATOR.cx} y2={NODE_CREATOR.cy} stroke="white" strokeWidth="2" />
               <line x1={NODE_SPONSOR.cx} y1={NODE_SPONSOR.cy} x2={NODE_CREATOR.cx} y2={NODE_CREATOR.cy} stroke="white" strokeWidth="2" />
            </g>

            {/* ── Edge: Organizers ↔ Sponsors ── */}
            <motion.path
              d={`M ${NODE_ORGANIZER.cx - 30} ${NODE_ORGANIZER.cy + 20} L ${NODE_SPONSOR.cx + 20} ${NODE_SPONSOR.cy - 10}`}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              strokeDasharray="20 120"
              filter="url(#glow)"
              animate={{ strokeDashoffset: [140, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              markerEnd="url(#arrow-head)"
            />
            <motion.path
              d={`M ${NODE_SPONSOR.cx + 40} ${NODE_SPONSOR.cy + 10} L ${NODE_ORGANIZER.cx + 10} ${NODE_ORGANIZER.cy + 40}`}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              strokeDasharray="20 120"
              className="opacity-40"
              animate={{ strokeDashoffset: [0, 140] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              markerEnd="url(#arrow-head)"
            />

            {/* ── Edge: Organizers ↔ Creators ── */}
            <motion.path
              d={`M ${NODE_ORGANIZER.cx + 30} ${NODE_ORGANIZER.cy + 20} L ${NODE_CREATOR.cx - 20} ${NODE_CREATOR.cy - 10}`}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              strokeDasharray="20 120"
              filter="url(#glow)"
              animate={{ strokeDashoffset: [140, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              markerEnd="url(#arrow-head)"
            />
            <motion.path
              d={`M ${NODE_CREATOR.cx - 40} ${NODE_CREATOR.cy + 10} L ${NODE_ORGANIZER.cx - 10} ${NODE_ORGANIZER.cy + 40}`}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              strokeDasharray="20 120"
              className="opacity-40"
              animate={{ strokeDashoffset: [0, 140] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              markerEnd="url(#arrow-head)"
            />

            {/* ── Edge: Sponsors ↔ Creators ── */}
            <motion.path
              d={`M ${NODE_SPONSOR.cx + 80} ${NODE_SPONSOR.cy - 10} L ${NODE_CREATOR.cx - 80} ${NODE_CREATOR.cy - 10}`}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              strokeDasharray="20 120"
              filter="url(#glow)"
              animate={{ strokeDashoffset: [140, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              markerEnd="url(#arrow-head)"
            />
            <motion.path
              d={`M ${NODE_CREATOR.cx - 80} ${NODE_CREATOR.cy + 10} L ${NODE_SPONSOR.cx + 80} ${NODE_SPONSOR.cy + 10}`}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2.5"
              strokeDasharray="20 120"
              className="opacity-40"
              animate={{ strokeDashoffset: [0, 140] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              markerEnd="url(#arrow-head)"
            />

            {/* ── Edge Labels ── */}

            {/* Organizer ↔ Sponsor */}
            <EdgeLabel x={130} y={220} lines={["Invite Sponsors", "to Events"]} align="end" isPrimary />
            <EdgeLabel x={300} y={300} lines={["Provide Funding", "& Visibility"]} align="start" />

            {/* Organizer ↔ Creator */}
            <EdgeLabel x={670} y={220} lines={["Hire Creators", "for Events"]} align="start" isPrimary />
            <EdgeLabel x={500} y={300} lines={["Deliver promotion", "& live coverage"]} align="end" />

            {/* Sponsor ↔ Creator */}
            <EdgeLabel x={400} y={390} lines={["Direct brand deals & ROI tracking"]} align="middle" isPrimary />
            <EdgeLabel x={400} y={510} lines={["Audience reach & authentic influence"]} align="middle" />

            {/* ── Nodes ── */}

            {/* Organizers Node */}
            <foreignObject x={NODE_ORGANIZER.cx - 110} y={NODE_ORGANIZER.cy - 90} width="220" height="180">
              <div
                // @ts-ignore
                xmlns="http://www.w3.org/1999/xhtml"
                className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-border/50 bg-card shadow-lg text-center"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">Organizers</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-1">
                    Host events · Find sponsors<br />Hire creators
                  </p>
                </div>
              </div>
            </foreignObject>

            {/* Sponsors Node */}
            <foreignObject x={NODE_SPONSOR.cx - 110} y={NODE_SPONSOR.cy - 90} width="220" height="180">
              <div
                // @ts-ignore
                xmlns="http://www.w3.org/1999/xhtml"
                className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-border/50 bg-card shadow-lg text-center"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">Sponsors</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-1">
                    Find events · Fund sponsorships<br />Partner with creators
                  </p>
                </div>
              </div>
            </foreignObject>

            {/* Creators Node */}
            <foreignObject x={NODE_CREATOR.cx - 110} y={NODE_CREATOR.cy - 90} width="220" height="180">
              <div
                // @ts-ignore
                xmlns="http://www.w3.org/1999/xhtml"
                className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-border/50 bg-card shadow-lg text-center"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">Creators</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-1">
                    Land gigs · Advertise brands<br />Build collaborations
                  </p>
                </div>
              </div>
            </foreignObject>
          </svg>
        </div>

        {/* Mobile: Stacked vertical layout */}
        <div className="md:hidden space-y-4">
          {[
            {
              icon: Calendar,
              title: "Organizers",
              desc: "Host events, invite sponsors for funding, and hire creators to produce content.",
              links: ["→ Invite Sponsors", "→ Hire Creators"],
            },
            {
              icon: Building,
              title: "Sponsors",
              desc: "Find relevant events and partner with creators to promote products and track ROI.",
              links: ["→ Fund Events", "→ Brand Deals with Creators"],
            },
            {
              icon: Users,
              title: "Creators",
              desc: "Advertise brands, attend events, and build long-term collaboration opportunities.",
              links: ["→ Deliver Content for Organizers", "→ Campaign ROI for Sponsors"],
            },
          ].map(({ icon: Icon, title, desc, links }) => (
            <div key={title} className="rounded-2xl border border-border/50 bg-card p-5 shadow space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <p className="font-bold text-base">{title}</p>
              </div>
              <p className="text-sm text-muted-foreground">{desc}</p>
              <div className="space-y-1">
                {links.map((l) => (
                  <p key={l} className="text-xs text-primary font-semibold flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" /> {l}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EcosystemChart;

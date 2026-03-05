"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, type LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface HexModule {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
  bgColor: string;
  notifications?: number;
}

interface HexNavigationHubProps {
  modules: HexModule[];
  centralLabel?: string;
  centralStatus?: "healthy" | "warning" | "critical";
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_RING_COLORS: Record<string, string> = {
  healthy: "#22C55E",
  warning: "#F59E0B",
  critical: "#EF4444",
};

const STATUS_GLOW_COLORS: Record<string, string> = {
  healthy: "rgba(34, 197, 94, 0.25)",
  warning: "rgba(245, 158, 11, 0.25)",
  critical: "rgba(239, 68, 68, 0.25)",
};

const HUB_RADIUS = 160;
const NODE_SIZE = 90;
const CENTER_SIZE = 100;
const ANGLE_OFFSET = -Math.PI / 2; // start from top

/* ------------------------------------------------------------------ */
/*  Orbital position calculator                                        */
/* ------------------------------------------------------------------ */

function getOrbitalPositions(count: number) {
  const positions: { x: number; y: number; angle: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = ANGLE_OFFSET + (2 * Math.PI * i) / count;
    positions.push({
      x: Math.cos(angle) * HUB_RADIUS,
      y: Math.sin(angle) * HUB_RADIUS,
      angle,
    });
  }
  return positions;
}

/* ------------------------------------------------------------------ */
/*  Notification Badge                                                  */
/* ------------------------------------------------------------------ */

function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 25, delay: 1.2 }}
      className="absolute -top-1 -right-1 z-10 flex items-center justify-center"
      style={{
        width: 18,
        height: 18,
        borderRadius: "50%",
        backgroundColor: "#EF4444",
        fontSize: 10,
        fontWeight: 700,
        color: "#fff",
        lineHeight: 1,
        boxShadow: "0 2px 6px rgba(239, 68, 68, 0.4)",
      }}
    >
      {count > 99 ? "99+" : count}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tooltip                                                            */
/* ------------------------------------------------------------------ */

function Tooltip({
  text,
  visible,
}: {
  text: string;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        bottom: "calc(100% + 8px)",
        left: "50%",
        transform: "translateX(-50%)",
        whiteSpace: "nowrap",
        maxWidth: 200,
      }}
    >
      <div
        className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium leading-snug"
        style={{
          backgroundColor: "var(--surface-1)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-md)",
          whiteSpace: "normal",
          textAlign: "center",
        }}
      >
        {text}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Connecting Line (SVG)                                              */
/* ------------------------------------------------------------------ */

function ConnectingLine({
  x: endX,
  y: endY,
  index,
  total,
}: {
  x: number;
  y: number;
  index: number;
  total: number;
}) {
  return (
    <motion.line
      x1={0}
      y1={0}
      x2={endX}
      y2={endY}
      stroke="var(--border)"
      strokeWidth={1}
      strokeDasharray="4 4"
      strokeOpacity={0.5}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{
        delay: 1.0 + index * 0.08,
        duration: 0.4,
        ease: "easeOut",
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Central Status Indicator                                           */
/* ------------------------------------------------------------------ */

function CentralStatusNode({
  label,
  status,
}: {
  label: string;
  status: "healthy" | "warning" | "critical";
}) {
  const ringColor = STATUS_RING_COLORS[status];
  const glowColor = STATUS_GLOW_COLORS[status];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5, type: "spring", damping: 18, stiffness: 200 }}
      className="absolute flex items-center justify-center"
      style={{
        width: CENTER_SIZE,
        height: CENTER_SIZE,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 20,
      }}
    >
      {/* Radial glow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          transform: "scale(2.2)",
          pointerEvents: "none",
        }}
      />

      {/* Breathing ring */}
      <div
        className="absolute inset-0 rounded-full hub-breathe"
        style={{
          border: `2.5px solid ${ringColor}`,
          boxShadow: `0 0 16px ${glowColor}, inset 0 0 12px ${glowColor}`,
        }}
      />

      {/* Rotating gradient border */}
      <div
        className="absolute rounded-full hub-gradient-rotate"
        style={{
          inset: -3,
          background: `conic-gradient(from 0deg, ${ringColor}, transparent 40%, ${ringColor} 60%, transparent)`,
          mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px))",
          WebkitMask:
            "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2.5px))",
          opacity: 0.6,
        }}
      />

      {/* Inner circle */}
      <div
        className="relative rounded-full flex flex-col items-center justify-center"
        style={{
          width: CENTER_SIZE - 6,
          height: CENTER_SIZE - 6,
          background: "var(--glass-bg)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <span
          className="text-lg font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {label}
        </span>
        <div
          className="w-1.5 h-1.5 rounded-full mt-1"
          style={{ backgroundColor: ringColor }}
        />
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Orbital Module Node (xl+ screens)                                  */
/* ------------------------------------------------------------------ */

function OrbitalNode({
  module,
  posX,
  posY,
  index,
}: {
  module: HexModule;
  posX: number;
  posY: number;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = module.icon;

  // On hover, pull node slightly toward center (5px)
  const pullFactor = 5;
  const dist = Math.sqrt(posX * posX + posY * posY) || 1;
  const pullX = hovered ? -(posX / dist) * pullFactor : 0;
  const pullY = hovered ? -(posY / dist) * pullFactor : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: 0.8 + index * 0.1,
        type: "spring",
        damping: 20,
      }}
      className="absolute"
      style={{
        width: NODE_SIZE,
        height: NODE_SIZE,
        top: "50%",
        left: "50%",
        marginLeft: posX - NODE_SIZE / 2,
        marginTop: posY - NODE_SIZE / 2,
        zIndex: hovered ? 30 : 10,
      }}
    >
      <Link href={module.href} className="block relative group">
        <motion.div
          animate={{
            x: pullX,
            y: pullY,
            scale: hovered ? 1.12 : 1,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative w-full h-full rounded-[18px] flex flex-col items-center justify-center cursor-pointer"
          style={{
            background: "var(--glass-bg)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: hovered
              ? `1.5px solid ${module.color}`
              : "1px solid var(--glass-border)",
            boxShadow: hovered
              ? `var(--shadow-lg), 0 0 20px ${module.color}22`
              : "var(--glass-shadow)",
            transition: "border 200ms ease, box-shadow 200ms ease",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Notification badge */}
          {module.notifications != null && module.notifications > 0 && (
            <NotificationBadge count={module.notifications} />
          )}

          {/* Icon */}
          <div
            className="flex items-center justify-center rounded-xl mb-1.5"
            style={{
              width: 40,
              height: 40,
              backgroundColor: module.bgColor,
            }}
          >
            <Icon size={22} style={{ color: module.color }} />
          </div>

          {/* Label */}
          <span
            className="text-[11px] font-medium text-center leading-tight px-1"
            style={{ color: "var(--text-primary)" }}
          >
            {module.title}
          </span>

          {/* Tooltip */}
          <Tooltip text={module.description} visible={hovered} />
        </motion.div>
      </Link>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Grid Card Node (< xl screens)                                      */
/* ------------------------------------------------------------------ */

function GridCard({
  module,
  index,
}: {
  module: HexModule;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = module.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: 0.8 + index * 0.1,
        type: "spring",
        damping: 20,
      }}
    >
      <Link href={module.href}>
        <div
          className="relative rounded-xl p-4 cursor-pointer group"
          style={{
            background: "var(--glass-bg)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: hovered
              ? `1.5px solid ${module.color}`
              : "1px solid var(--glass-border)",
            boxShadow: hovered ? "var(--shadow-lg)" : "var(--glass-shadow)",
            transition:
              "transform 300ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 300ms cubic-bezier(0.22, 1, 0.36, 1), border 200ms ease",
            transform: hovered ? "translateY(-4px)" : "translateY(0)",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Notification badge */}
          {module.notifications != null && module.notifications > 0 && (
            <NotificationBadge count={module.notifications} />
          )}

          {/* Icon */}
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
            style={{ backgroundColor: module.bgColor }}
          >
            <Icon size={20} style={{ color: module.color }} />
          </div>

          {/* Title */}
          <h4
            className="text-sm font-semibold mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            {module.title}
          </h4>

          {/* Description */}
          <p
            className="text-xs leading-relaxed mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            {module.description}
          </p>

          {/* Arrow on hover */}
          <div
            className="flex items-center gap-1 text-xs font-medium transition-opacity duration-200"
            style={{
              color: module.color,
              opacity: hovered ? 1 : 0,
            }}
          >
            <span>Open</span>
            <ArrowRight
              size={12}
              className="transition-transform duration-200"
              style={{
                transform: hovered ? "translateX(2px)" : "translateX(0)",
              }}
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function HexNavigationHub({
  modules,
  centralLabel = "OPMS",
  centralStatus = "healthy",
  className = "",
}: HexNavigationHubProps) {
  const positions = useMemo(
    () => getOrbitalPositions(modules.length),
    [modules.length]
  );

  // Container must be large enough to hold orbit
  const containerSize = (HUB_RADIUS + NODE_SIZE / 2) * 2 + 40; // extra padding

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className={className}
    >
      {/* Scoped keyframes */}
      <style jsx>{`
        @keyframes hub-breathe {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.06);
            opacity: 0.85;
          }
        }
        @keyframes hub-gradient-rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .hub-breathe {
          animation: hub-breathe 3s ease-in-out infinite;
        }
        .hub-gradient-rotate {
          animation: hub-gradient-rotate 8s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .hub-breathe,
          .hub-gradient-rotate {
            animation: none;
          }
        }
      `}</style>

      {/* Section header */}
      <div className="mb-6">
        <h2
          className="text-lg font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Command Hub
        </h2>
        <p
          className="text-xs mt-0.5"
          style={{ color: "var(--text-muted)" }}
        >
          Navigate to system modules and services
        </p>
      </div>

      {/* ---- Orbital layout (xl+ screens) ---- */}
      <div
        className="hidden xl:block relative mx-auto"
        style={{
          width: containerSize,
          minHeight: Math.max(420, containerSize),
        }}
      >
        {/* SVG connecting lines */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{
            width: "100%",
            height: "100%",
          }}
          viewBox={`${-containerSize / 2} ${-containerSize / 2} ${containerSize} ${containerSize}`}
        >
          {positions.map((pos, i) => (
            <ConnectingLine
              key={`line-${i}`}
              x={pos.x}
              y={pos.y}
              index={i}
              total={modules.length}
            />
          ))}
        </svg>

        {/* Central status node */}
        <CentralStatusNode label={centralLabel} status={centralStatus} />

        {/* Orbital module nodes */}
        {modules.map((mod, i) => (
          <OrbitalNode
            key={mod.href}
            module={mod}
            posX={positions[i].x}
            posY={positions[i].y}
            index={i}
          />
        ))}
      </div>

      {/* ---- Grid fallback (< xl screens) ---- */}
      <div className="xl:hidden grid grid-cols-2 sm:grid-cols-3 gap-3">
        {modules.map((mod, i) => (
          <GridCard key={mod.href} module={mod} index={i} />
        ))}
      </div>
    </motion.section>
  );
}

import type { ReactNode } from "react";

type PaintingRoomLayoutProps = {
  "aria-labelledby"?: string;
  children: ReactNode;
  className?: string;
  includeLamp?: boolean;
  includePlant?: boolean;
  tag?: "main" | "section";
  variant: "home" | "chat";
};

export function PaintingRoomLayout({
  "aria-labelledby": ariaLabelledby,
  children,
  className,
  includeLamp = false,
  includePlant = false,
  tag = "section",
  variant
}: PaintingRoomLayoutProps) {
  const Component = tag;
  const classes = ["oil-room", "painting-room-layout", `painting-room-layout-${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <Component aria-labelledby={ariaLabelledby} className={classes}>
      <div className="oil-space" aria-hidden="true">
        <span className="oil-plane oil-plane-blue" />
        <span className="oil-plane oil-plane-window" />
        <span className="oil-plane oil-plane-floor-blue" />
        <span className="oil-plane oil-plane-threshold" />
        <span className="oil-plane oil-plane-light-seam" />
        <span className="oil-plane oil-plane-warm" />
        <span className="oil-plane oil-plane-floor-brown" />
        {includePlant ? <span className="oil-plane oil-plane-plant" /> : null}
        {includeLamp ? <span className="oil-plane oil-plane-lamp" /> : null}
      </div>
      {children}
    </Component>
  );
}

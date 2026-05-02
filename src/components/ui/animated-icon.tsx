"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { lazy, Suspense } from "react";

const DotLottieReact = lazy(() =>
  import("@lottiefiles/dotlottie-react").then(m => ({ default: m.DotLottieReact }))
);

type LucideAnimation =
  | "spin"
  | "pulse"
  | "bounce"
  | "ping"
  | "wiggle"
  | "float"
  | "hover-rotate"
  | "hover-scale"
  | "none";

interface LucideIconProps {
  variant: "lucide";
  icon: LucideIcon;
  animation?: LucideAnimation;
  className?: string;
  size?: number;
}

interface LottieIconProps {
  variant: "lottie";
  src: string;
  loop?: boolean;
  autoplay?: boolean;
  size?: number;
  className?: string;
}

type AnimatedIconProps = LucideIconProps | LottieIconProps;

const ANIMATION_CLASSES: Record<LucideAnimation, string> = {
  spin: "animate-spin",
  pulse: "animate-pulse",
  bounce: "animate-bounce",
  ping: "animate-ping",
  wiggle: "animate-wiggle",
  float: "animate-float",
  "hover-rotate": "transition-transform duration-500 hover:rotate-180",
  "hover-scale": "transition-transform duration-300 hover:scale-125",
  none: "",
};

export function AnimatedIcon(props: AnimatedIconProps) {
  if (props.variant === "lucide") {
    const { icon: Icon, animation = "none", className, size = 16 } = props;
    return (
      <Icon
        width={size}
        height={size}
        className={cn(ANIMATION_CLASSES[animation], className)}
      />
    );
  }

  const { src, loop = true, autoplay = true, size = 80, className } = props;
  return (
    <div
      className={cn("inline-block", className)}
      style={{ width: size, height: size }}
    >
      <Suspense fallback={<div style={{ width: size, height: size }} />}>
        <DotLottieReact
          src={src}
          loop={loop}
          autoplay={autoplay}
          style={{ width: "100%", height: "100%" }}
        />
      </Suspense>
    </div>
  );
}

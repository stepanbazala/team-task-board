/**
 * TeamAvatar – zobrazuje avatar člena týmu
 * Používá iniciály a barvu, pokud není k dispozici fotka
 */

import { TeamMember } from "@/types/task";
import { cn } from "@/lib/utils";

interface TeamAvatarProps {
  member: TeamMember;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-12 h-12 text-base",
};

export function TeamAvatar({ member, size = "md", className }: TeamAvatarProps) {
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold text-primary-foreground shrink-0",
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: member.avatarColor }}
      title={member.name}
    >
      {member.initials}
    </div>
  );
}

import { CalendarDays, KeyRound } from "lucide-react";

import { GitHubIcon } from "@/components/auth/GitHubIcon";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Card, CardContent } from "@/components/ui/card";
import { formatLongDate } from "@/lib/format";
import type { UserProfile } from "@/types/user";

interface ProfileInfoProps {
  profile: UserProfile;
}

export function ProfileInfo({ profile }: ProfileInfoProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <UserAvatar {...profile} className="size-16 text-lg" />
        <div className="min-w-0 space-y-1">
          <h2 className="truncate text-xl font-semibold">
            {profile.name ?? profile.email}
          </h2>
          <p className="truncate text-sm text-muted-foreground">
            {profile.email}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              Member since {formatLongDate(profile.createdAt)}
            </span>
            <span className="flex items-center gap-1.5">
              {profile.hasPassword ? (
                <>
                  <KeyRound className="size-4" />
                  Email and password
                </>
              ) : (
                <>
                  <GitHubIcon className="size-4" />
                  GitHub
                </>
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

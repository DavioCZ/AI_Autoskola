import React from 'react';
import { Badge, UnlockedBadge, allBadges } from '../badges';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';

interface BadgeIconProps {
  badge: Badge;
  isUnlocked: boolean;
}

const BadgeIcon: React.FC<BadgeIconProps> = ({ badge, isUnlocked }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 ${
            isUnlocked ? 'bg-yellow-400 scale-100' : 'bg-gray-200 scale-90'
          }`}
          style={{ filter: isUnlocked ? 'none' : 'grayscale(100%)' }}
        >
          <span className="text-3xl">{badge.icon}</span>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-60">
        <div className="grid gap-2">
          <h4 className="font-bold leading-none">{badge.name}</h4>
          <p className="text-sm text-muted-foreground">{badge.description}</p>
          {!isUnlocked && <p className="text-xs text-red-500 font-semibold">Zamčeno</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface BadgesDisplayProps {
  unlockedBadges: UnlockedBadge[];
}

export const BadgesDisplay: React.FC<BadgesDisplayProps> = ({ unlockedBadges }) => {
  const unlockedBadgeIds = new Set(unlockedBadges.map(b => b.id));

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>🏆 Moje odznaky</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {allBadges.map(badge => (
            <BadgeIcon key={badge.id} badge={badge} isUnlocked={unlockedBadgeIds.has(badge.id)} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

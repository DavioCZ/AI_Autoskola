declare module '@/src/badges' {
  export type UnlockedBadge = {
    id: string;
    name: string;
    description: string;
    unlockedAt: string;
    level: number;
  };
}

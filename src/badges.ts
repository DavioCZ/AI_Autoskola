export type UnlockedBadge = {
  id: string;
  unlockedAt: string;
};

export const allBadges = [
  {
    id: 'first_test_completed',
    name: 'První test dokončen',
    description: 'Dokončili jste svůj první test.',
  },
  {
    id: 'first_test_passed',
    name: 'První test úspěšně složen',
    description: 'Úspěšně jste složili svůj první test.',
  },
  {
    id: 'ten_tests_completed',
    name: 'Deset testů dokončeno',
    description: 'Dokončili jste deset testů.',
  },
  {
    id: 'no_mistakes_test',
    name: 'Test bez chyb',
    description: 'Dokončili jste test bez jediné chyby.',
  },
];

import React from 'react';
import MigrationPlaceholder from '@/lib/MigrationPlaceholder';

export default function CardTrades() {
  return (
    <MigrationPlaceholder
      title="Exchange"
      notes={[
        'This page still referenced base44.functions + base44.entities, which caused runtime crashes (white screen).',
        'Next step: replace trade hub state with Supabase tables / RPCs and wire to the new cardService + userService.'
      ]}
    />
  );
}

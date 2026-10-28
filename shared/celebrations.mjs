// Original curated occasion edits made only from existing Epic Arts editions.
// These are contemporary generative interpretations. Mithila painting has a living
// association with weddings and households (kohbar imagery); we say so respectfully
// without claiming ritual function, artisan authorship, or cultural authenticity.
export const OCCASIONS=[
  {
    id:'newlyweds',
    name:'A home begins',
    eyebrow:'WEDDING · NEW BEGINNINGS',
    tagline:'For the first wall that is truly theirs.',
    story:'Mithila painting has welcomed weddings and new households for generations — the painted kohbar chamber held paired birds, fish and trees of life as wishes for abundance. These contemporary digital interpretations carry that spirit gently: they are not ritual objects, and they are not hand-painted originals. They are a small, honest way to begin a shared home.',
    ids:['peacock-rhapsody-005','fish-fables-005','mithila-garden-037'],
    note:'Paired motifs echoing abundance and companionship.',
  },
  {
    id:'housewarming',
    name:'A threshold, crossed',
    eyebrow:'GRIHA PRAVESH · HOUSEWARMING',
    tagline:'Blessing a doorway, the contemporary way.',
    story:'A new address deserves more than a coordinate on a map. A lotus opening to the light, geometric temple lattice, a blockprint bloom — three gentle contemporary companions for a space finding its rhythm. A thoughtful housewarming gift you can send without watching the calendar.',
    ids:['lotus-atelier-013','temple-lattice-013','blockprint-bloom-005'],
    note:'Auspicious-botanical and architectural energy, together.',
  },
  {
    id:'years-together',
    name:'Years, hand in hand',
    eyebrow:'ANNIVERSARY · TOGETHERNESS',
    tagline:'Another circuit around the sun, side by side.',
    story:'A small universe for two people who have built one. Cosmic orbits, a folk dance circle, a moonlit garden: contemporary pieces about rhythm, return and the quiet joy of coming back to each other. Better than a card that gathers dust — art that stays.',
    ids:['cosmic-orbit-006','warli-rhythm-006','moonlit-garden-030'],
    note:'A closer-together experiment across families, united by usage.',
  },
];
export function occasionsFor(resolve){
  return OCCASIONS.map(o=>({...o,products:o.ids.map(id=>resolve(id)).filter(Boolean)}));
}

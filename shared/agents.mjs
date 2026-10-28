// Operator-reviewed capabilities; no browser-supplied role, tool, prompt, or URL is executable.
export const AGENT_VERSION='1.0.0';
export const agentTeam=Object.freeze([
 {id:'curator',name:'Catalog curator',specialty:'Finds real editions, not imaginary products.',tools:['search_catalog','get_product'],skill:'epic-curator'},
 {id:'heritage',name:'Heritage guide',specialty:'Keeps the inspiration and the provenance honest.',tools:['search_guides','trend_evidence'],skill:'epic-heritage'},
 {id:'stylist',name:'Collection stylist',specialty:'Balances a palette, a little variety, and your budget.',tools:['fit_collection'],skill:'epic-stylist'},
 {id:'print',name:'Print companion',specialty:'Makes the next step clear, from file to frame.',tools:['search_guides'],skill:'epic-print'},
]);
export const directions=[{id:'heritage',name:'Heritage & folk'},{id:'botanical',name:'Botanical & gentle'},{id:'minimal',name:'Quiet & minimal'},{id:'bold',name:'Expressive & bold'},{id:'open',name:'Keep an open mind'}];
export const rooms=[{id:'living',name:'Living room'},{id:'bedroom',name:'Bedroom'},{id:'workspace',name:'Workspace'},{id:'entryway',name:'Entryway'}];

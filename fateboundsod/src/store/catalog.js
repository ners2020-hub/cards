export const PACKS = [
 {id:'starter',name:'Starter',cost:50,tag:'Begin your collection',description:'A first step into the nine dominions.',odds:{common:70,uncommon:25,rare:5}},
 {id:'premium',name:'Premium',cost:150,tag:'Find your next favorite',description:'A stronger chance at something extraordinary.',odds:{common:40,uncommon:35,rare:20,epic:5}},
 {id:'elite',name:'Elite',cost:300,tag:'Reach for the legendary',description:'The only pack with a chance at legendary cards.',odds:{common:20,uncommon:30,rare:30,epic:15,legendary:5}},
];
export const UNLOCKS = [
 {element:'blood',requires:null}, {element:'light',requires:'fire'}, {element:'cryo',requires:'water'},
 {element:'electric',requires:'earth'}, {element:'shadow',requires:'wind'},
];
export const ELEMENT_COLORS = {fire:'#f4a261',cryo:'#88d9f5',blood:'#ec708c',wind:'#89d4bb',earth:'#b4bd7f',water:'#82aaff',shadow:'#bf9ee8',light:'#edda97',electric:'#e5cd66'};

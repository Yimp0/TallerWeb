// CONSTANTES
const POKEAPI = 'https://pokeapi.co/api/v2';
const SPRITE_URL = 'https://play.pokemonshowdown.com/sprites/gen5/';
const SPRITE_DEX = 'https://play.showdown.com/sprites/dex/';
const MAX_MIEMBROS = 6;

const TIPOS = [
  'normal','fire','water','grass','electric','ice',
  'fighting','poison','ground','flying','psychic','bug',
  'rock','ghost','dragon','dark','steel','fairy'
];

// Las 25 naturalezas con sus efectos (+stat / -stat)
const NATUS = {
  fuerte:    { up: null,   down: null   },
  huraña:   { up: 'atk', down: 'def'  },
  audaz:    { up: 'atk', down: 'spe'  },
  firme:  { up: 'atk', down: 'spa'  },
  picara:  { up: 'atk', down: 'spd'  },
  osada:     { up: 'def', down: 'atk'  },
  docil:   { up: null,   down: null   },
  placida:  { up: 'def', down: 'spe'  },
  agitada:   { up: 'def', down: 'spa'  },
  floja:      { up: 'def', down: 'spd'  },
  miedosa:    { up: 'spe', down: 'atk'  },
  activa:    { up: 'spe', down: 'def'  },
  seria:  { up: null,   down: null   },
  alegre:    { up: 'spe', down: 'spa'  },
  ingenua:    { up: 'spe', down: 'spd'  },
  modesta:   { up: 'spa', down: 'atk'  },
  afable:     { up: 'spa', down: 'def'  },
  mansa:    { up: 'spa', down: 'spe'  },
  timida:  { up: null,   down: null   },
  alocada:     { up: 'spa', down: 'spd'  },
  serena:     { up: 'spd', down: 'atk'  },
  amable:   { up: 'spd', down: 'def'  },
  grosera:    { up: 'spd', down: 'spe'  },
  cauta:  { up: 'spd', down: 'spa'  },
  rara:   { up: null,   down: null   },
};


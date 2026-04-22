/*
  ═══════════════════════════════════════════════════════════════
  app.js — Pokémon Armador de Equipo
  ───────────────────────────────────────────────────────────────
  Fuentes de datos:
  • PokéAPI        https://pokeapi.co/api/v2/
  • Sprites gen5   https://play.pokemonshowdown.com/sprites/gen5/
  • Sprites dex    https://play.pokemonshowdown.com/sprites/dex/

  NOTA: Los nombres de tipos, naturalezas y estadísticas que
  vienen de la API permanecen en inglés (son claves internas).
  ═══════════════════════════════════════════════════════════════
*/


// ════════════════════════════════════════════════════════════════
// 1. CONSTANTES
// ════════════════════════════════════════════════════════════════

const URL_POKEAPI      = 'https://pokeapi.co/api/v2';
const URL_SPRITE_GEN5  = 'https://play.pokemonshowdown.com/sprites/gen5/';
const URL_SPRITE_DEX   = 'https://play.pokemonshowdown.com/sprites/dex/';
const TAMANO_PAGINA    = 30;
const MAX_EQUIPO       = 6;

// Tipos — claves en inglés porque así los devuelve la API
const TODOS_LOS_TIPOS = [
  'normal','fire','water','grass','electric','ice',
  'fighting','poison','ground','flying','psychic','bug',
  'rock','ghost','dragon','dark','steel','fairy'
];

// Las 25 naturalezas con sus efectos (suben / bajan estadística)
const NATURALEZAS = {
  hardy:    { sube: null,  baja: null  },
  lonely:   { sube: 'atk', baja: 'def' },
  brave:    { sube: 'atk', baja: 'spe' },
  adamant:  { sube: 'atk', baja: 'spa' },
  naughty:  { sube: 'atk', baja: 'spd' },
  bold:     { sube: 'def', baja: 'atk' },
  docile:   { sube: null,  baja: null  },
  relaxed:  { sube: 'def', baja: 'spe' },
  impish:   { sube: 'def', baja: 'spa' },
  lax:      { sube: 'def', baja: 'spd' },
  timid:    { sube: 'spe', baja: 'atk' },
  hasty:    { sube: 'spe', baja: 'def' },
  serious:  { sube: null,  baja: null  },
  jolly:    { sube: 'spe', baja: 'spa' },
  naive:    { sube: 'spe', baja: 'spd' },
  modest:   { sube: 'spa', baja: 'atk' },
  mild:     { sube: 'spa', baja: 'def' },
  quiet:    { sube: 'spa', baja: 'spe' },
  bashful:  { sube: null,  baja: null  },
  rash:     { sube: 'spa', baja: 'spd' },
  calm:     { sube: 'spd', baja: 'atk' },
  gentle:   { sube: 'spd', baja: 'def' },
  sassy:    { sube: 'spd', baja: 'spe' },
  careful:  { sube: 'spd', baja: 'spa' },
  quirky:   { sube: null,  baja: null  },
};

// Nombres de estadísticas para mostrar en pantalla
const NOMBRES_ESTADISTICAS = {
  hp:  'HP',
  atk: 'Ataque',
  def: 'Defensa',
  spa: 'At. Esp.',
  spd: 'Def. Esp.',
  spe: 'Velocidad'
};

// Claves internas de estadísticas (en inglés, igual que la API)
const CLAVES_ESTADISTICAS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];


// ════════════════════════════════════════════════════════════════
// 2. ESTADO GLOBAL
// ════════════════════════════════════════════════════════════════

const estado = {
  // Datos cargados de la API
  todosPokemon: [],   // [{ name, url }] lista completa
  todosObjetos: [],   // [{ name, url }] lista de objetos

  // Pokédex
  pokédexFiltrada:    [],
  pokédexPagina:      0,
  pokédexTiposActivos: new Set(),
  pokédexBusqueda:    '',

  // Selector del armador
  selectorFiltrado:    [],
  selectorPagina:      0,
  selectorTiposActivos: new Set(),
  selectorBusqueda:    '',

  // Equipo — 6 slots, cada uno es null o un objeto Pokémon con ._config
  equipo:      [null, null, null, null, null, null],
  ranuraActiva: null,  // índice 0-5 del slot que se está editando
};

// Caché para no repetir peticiones al mismo Pokémon
const cache = {};


// ════════════════════════════════════════════════════════════════
// 3. UTILIDADES DE SPRITES
// ════════════════════════════════════════════════════════════════

/**
 * Convierte nombre al formato que usa Showdown.
 * Ej: "mr-mime" → "mrmime"
 */
function nombreShowdown(nombre) {
  return nombre.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function urlSprite(nombre, tipo = 'gen5') {
  const base = tipo === 'dex' ? URL_SPRITE_DEX : URL_SPRITE_GEN5;
  return `${base}${nombreShowdown(nombre)}.png`;
}

/** Extrae el ID numérico de una URL de PokéAPI */
function idDesdeUrl(url) {
  const partes = url.split('/').filter(Boolean);
  return parseInt(partes[partes.length - 1], 10);
}


// ════════════════════════════════════════════════════════════════
// 4. PETICIONES A LA API
// ════════════════════════════════════════════════════════════════

async function obtenerJSON(url) {
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  return respuesta.json();
}

async function obtenerPokemon(nombreOId) {
  const clave = String(nombreOId).toLowerCase();
  if (cache[clave]) return cache[clave];
  const datos   = await obtenerJSON(`${URL_POKEAPI}/pokemon/${clave}`);
  cache[clave]  = datos;
  return datos;
}

async function obtenerNombresPorTipo(nombreTipo) {
  const datos = await obtenerJSON(`${URL_POKEAPI}/type/${nombreTipo}`);
  return new Set(datos.pokemon.map(p => p.pokemon.name));
}


// ════════════════════════════════════════════════════════════════
// 5. CARGA INICIAL
// ════════════════════════════════════════════════════════════════

async function cargarDatosIniciales() {
  // Lista de Pokémon
  const datosPokemon          = await obtenerJSON(`${URL_POKEAPI}/pokemon?limit=1010&offset=0`);
  estado.todosPokemon         = datosPokemon.results;
  estado.pokédexFiltrada      = [...estado.todosPokemon];
  estado.selectorFiltrado     = [...estado.todosPokemon];

  // Lista de objetos (para autocompletado)
  const datosObjetos  = await obtenerJSON(`${URL_POKEAPI}/item?limit=2000&offset=0`);
  estado.todosObjetos = datosObjetos.results;

  mostrarCuadriculaSelector();
  mostrarPaginacionSelector();
  mostrarCuadriculaPokedex();
  mostrarPaginacionPokedex();
}


// ════════════════════════════════════════════════════════════════
// 6. NAVEGACIÓN — SPA sin librería externa
// ════════════════════════════════════════════════════════════════

function irAPagina(idPagina) {
  // Ocultar todas las páginas
  document.querySelectorAll('.pagina').forEach(p => p.classList.remove('pagina-activa'));

  // Mostrar la página destino
  const destino = document.getElementById(`pagina-${idPagina}`);
  if (destino) destino.classList.add('pagina-activa');

  // Actualizar botones de navegación
  document.querySelectorAll('.boton-nav').forEach(btn => {
    btn.classList.toggle('activo', btn.dataset.pagina === idPagina);
  });

  // Cerrar menú móvil
  document.getElementById('navegacion-movil').classList.remove('abierto');

  // Acciones específicas según página
  if (idPagina === 'analisis-tipos')    mostrarAnalisisTipos();
  if (idPagina === 'importar-exportar') generarExportacion();
}

// Delegación de eventos para todos los .boton-nav
document.addEventListener('click', e => {
  const btn = e.target.closest('.boton-nav');
  if (btn && btn.dataset.pagina) irAPagina(btn.dataset.pagina);
});

// Botón hamburger móvil
document.getElementById('boton-menu').addEventListener('click', () => {
  document.getElementById('navegacion-movil').classList.toggle('abierto');
});


// ════════════════════════════════════════════════════════════════
// 7. EQUIPO — Resumen (fila de 6 slots)
// ════════════════════════════════════════════════════════════════

function mostrarResumenEquipo() {
  const fila = document.getElementById('fila-slots');
  fila.innerHTML = '';

  for (let i = 0; i < MAX_EQUIPO; i++) {
    const mon        = estado.equipo[i];
    const ranura     = document.createElement('div');
    const estaSelec  = estado.ranuraActiva === i;

    ranura.className      = `ranura-equipo ${mon ? 'ocupada' : ''} ${estaSelec ? 'seleccionada' : ''}`;
    ranura.dataset.indice = i;

    if (mon) {
      const cfg = mon._config;
      ranura.innerHTML = `
        <img src="${urlSprite(mon.name, 'gen5')}"
             alt="${mon.name}"
             onerror="this.src='${urlSprite(mon.name, 'dex')}'" />
        <span class="nombre-ranura">${cfg.apodo || mon.name}</span>
      `;
    } else {
      ranura.innerHTML = `<div class="numero-ranura">${i + 1}</div>`;
    }

    ranura.addEventListener('click', () => abrirEditorRanura(i));
    fila.appendChild(ranura);
  }

  // Actualizar contador en el pie de página
  const cantidad = estado.equipo.filter(Boolean).length;
  document.getElementById('contador-equipo-pie').textContent = `Equipo: ${cantidad} / 6`;
}


// ════════════════════════════════════════════════════════════════
// 8. EDITOR — Abrir/cerrar ranura
// ════════════════════════════════════════════════════════════════

async function abrirEditorRanura(indice) {
  estado.ranuraActiva = indice;

  const mon          = estado.equipo[indice];
  const panelVacio   = document.getElementById('editor-vacio');
  const formulario   = document.getElementById('formulario-editor');

  if (!mon) {
    panelVacio.style.display = 'flex';
    formulario.style.display = 'none';
    return;
  }

  panelVacio.style.display = 'none';
  formulario.style.display = 'block';

  const cfg   = mon._config;
  const tipos = mon.types.map(t => t.type.name);

  // Sprite y nombre en la cabecera del editor
  const spriteEl = document.getElementById('editor-sprite');
  spriteEl.src     = urlSprite(mon.name, 'gen5');
  spriteEl.onerror = function () { this.src = urlSprite(mon.name, 'dex'); };
  document.getElementById('editor-nombre-pokemon').textContent = mon.name;

  // Tipos
  document.getElementById('editor-tipos').innerHTML =
    tipos.map(t => `<span class="insignia-tipo tipo-${t}">${t}</span>`).join('');

  // Apodo
  document.getElementById('campo-apodo').value = cfg.apodo || '';

  // Formas alternativas
  await poblarSelectorFormas(mon);

  // Habilidades
  poblarSelectorHabilidades(mon, cfg.habilidad);

  // Naturaleza
  poblarSelectorNaturaleza(cfg.naturaleza);
  mostrarEfectoNaturaleza(cfg.naturaleza);

  // Movimientos
  poblarSelectoresMovimientos(mon, cfg.movimientos);

  // Nivel, género, shiny
  document.getElementById('campo-nivel').value    = cfg.nivel  || 100;
  document.getElementById('campo-genero').value   = cfg.genero || 'M';
  document.getElementById('campo-shiny').checked  = !!cfg.esShiny;

  // EVs e IVs
  mostrarCamposEstadistica('ev', cfg.evs);
  mostrarCamposEstadistica('iv', cfg.ivs);
  actualizarTotalEVs();

  // Estadísticas finales
  mostrarEstadisticasFinales(mon, cfg);

  // Objeto
  document.getElementById('campo-objeto').value = cfg.objeto || '';
}

function cerrarEditorRanura() {
  estado.ranuraActiva = null;
  document.getElementById('editor-vacio').style.display   = 'flex';
  document.getElementById('formulario-editor').style.display = 'none';
  mostrarResumenEquipo();
}


// ════════════════════════════════════════════════════════════════
// 9. FORMULARIO — Poblar selectores
// ════════════════════════════════════════════════════════════════

async function poblarSelectorFormas(mon) {
  const selector = document.getElementById('campo-forma');
  selector.innerHTML = '<option value="">— Normal —</option>';

  try {
    const urlEspecie = mon.species?.url || `${URL_POKEAPI}/pokemon-species/${mon.id}/`;
    const especie    = await obtenerJSON(urlEspecie);

    if (especie.varieties && especie.varieties.length > 1) {
      especie.varieties.forEach(v => {
        const opcion       = document.createElement('option');
        opcion.value       = v.pokemon.name;
        opcion.textContent = v.pokemon.name;
        if (v.pokemon.name === mon.name) opcion.selected = true;
        selector.appendChild(opcion);
      });
      document.getElementById('grupo-formas').style.display = '';
    } else {
      document.getElementById('grupo-formas').style.display = 'none';
    }
  } catch {
    document.getElementById('grupo-formas').style.display = 'none';
  }

  selector.addEventListener('change', async () => {
    if (!selector.value) return;
    const nuevoMon      = await obtenerPokemon(selector.value);
    nuevoMon._config    = estado.equipo[estado.ranuraActiva]._config;
    estado.equipo[estado.ranuraActiva] = nuevoMon;
    abrirEditorRanura(estado.ranuraActiva);
  });
}

function poblarSelectorHabilidades(mon, habilidadActual) {
  const selector = document.getElementById('campo-habilidad');
  selector.innerHTML = '';
  mon.abilities.forEach(h => {
    const opcion       = document.createElement('option');
    opcion.value       = h.ability.name;
    opcion.textContent = h.is_hidden ? `${h.ability.name} (oculta)` : h.ability.name;
    if (h.ability.name === habilidadActual) opcion.selected = true;
    selector.appendChild(opcion);
  });
}

function poblarSelectorNaturaleza(naturalezaActual) {
  const selector = document.getElementById('campo-naturaleza');
  selector.innerHTML = '';
  Object.keys(NATURALEZAS).forEach(nombre => {
    const opcion       = document.createElement('option');
    opcion.value       = nombre;
    opcion.textContent = nombre.charAt(0).toUpperCase() + nombre.slice(1);
    if (nombre === naturalezaActual) opcion.selected = true;
    selector.appendChild(opcion);
  });
  selector.addEventListener('change', () => mostrarEfectoNaturaleza(selector.value));
}

function mostrarEfectoNaturaleza(nombreNaturaleza) {
  const nat = NATURALEZAS[nombreNaturaleza];
  const el  = document.getElementById('efecto-naturaleza');
  if (!nat || (!nat.sube && !nat.baja)) {
    el.innerHTML = '<span>Naturaleza neutral</span>';
    return;
  }
  el.innerHTML = `
    <span class="naturaleza-sube">↑ ${NOMBRES_ESTADISTICAS[nat.sube]}</span>
    <span class="naturaleza-baja">↓ ${NOMBRES_ESTADISTICAS[nat.baja]}</span>
  `;
}

function poblarSelectoresMovimientos(mon, movimientosActuales = []) {
  const selectores = document.querySelectorAll('.campo-movimiento');
  const opciones   = mon.moves.map(m => {
    const opcion       = document.createElement('option');
    opcion.value       = m.move.name;
    opcion.textContent = m.move.name;
    return opcion;
  });

  selectores.forEach((sel, i) => {
    sel.innerHTML = `<option value="">— Movimiento ${i + 1} —</option>`;
    opciones.forEach(o => sel.appendChild(o.cloneNode(true)));
    if (movimientosActuales[i]) sel.value = movimientosActuales[i];
  });
}


// ════════════════════════════════════════════════════════════════
// 10. EVs e IVs — Renderizado y cálculo
// ════════════════════════════════════════════════════════════════

function mostrarCamposEstadistica(tipo, valoresActuales = {}) {
  const contenedor = document.getElementById(tipo === 'ev' ? 'barras-evs' : 'entradas-ivs');
  contenedor.innerHTML = '';

  const maximo   = tipo === 'ev' ? 252 : 31;
  const valorDef = tipo === 'ev' ? 0   : 31;

  CLAVES_ESTADISTICAS.forEach(clave => {
    const valor = valoresActuales[clave] ?? valorDef;
    const fila  = document.createElement('div');
    fila.className    = 'fila-estadistica';
    fila.dataset.stat = clave;

    if (tipo === 'ev') {
      fila.innerHTML = `
        <label class="etiqueta-estadistica">${NOMBRES_ESTADISTICAS[clave]}</label>
        <input type="range"  class="barra-ev"   min="0" max="${maximo}" value="${valor}" data-stat="${clave}" />
        <input type="number" class="numero-ev"  min="0" max="${maximo}" value="${valor}" data-stat="${clave}" />
      `;
      const barra  = fila.querySelector('.barra-ev');
      const numero = fila.querySelector('.numero-ev');
      barra.addEventListener('input',  () => { numero.value = barra.value;  actualizarTotalEVs(); actualizarEstadisticasFinales(); });
      numero.addEventListener('input', () => { barra.value  = numero.value; actualizarTotalEVs(); actualizarEstadisticasFinales(); });
    } else {
      fila.innerHTML = `
        <label class="etiqueta-estadistica">${NOMBRES_ESTADISTICAS[clave]}</label>
        <input type="number" class="numero-iv" min="0" max="${maximo}" value="${valor}" data-stat="${clave}" />
      `;
      fila.querySelector('.numero-iv').addEventListener('input', actualizarEstadisticasFinales);
    }

    contenedor.appendChild(fila);
  });
}

function actualizarTotalEVs() {
  const total = [...document.querySelectorAll('.numero-ev')]
    .reduce((suma, el) => suma + (parseInt(el.value) || 0), 0);
  const display = document.getElementById('total-evs');
  display.textContent = `(${total} / 510)`;
  display.style.color = total > 510 ? 'red' : '';
}

function leerEVs() {
  const evs = {};
  document.querySelectorAll('.numero-ev').forEach(el => { evs[el.dataset.stat] = parseInt(el.value) || 0; });
  return evs;
}

function leerIVs() {
  const ivs = {};
  document.querySelectorAll('.numero-iv').forEach(el => { ivs[el.dataset.stat] = parseInt(el.value) ?? 31; });
  return ivs;
}

/** Fórmula oficial de estadísticas Gen 3+ */
function calcularEstadistica(clave, base, ev, iv, naturaleza, nivel) {
  const esHP   = clave === 'hp';
  const natMod = NATURALEZAS[naturaleza]?.sube === clave ? 1.1
               : NATURALEZAS[naturaleza]?.baja === clave ? 0.9
               : 1;
  if (esHP) {
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * nivel / 100) + nivel + 10);
  }
  return Math.floor(Math.floor(((2 * base + iv + Math.floor(ev / 4)) * nivel / 100) + 5) * natMod);
}

function mostrarEstadisticasFinales(mon, cfg) {
  if (!mon) return;
  const contenedor = document.getElementById('estadisticas-finales');
  contenedor.innerHTML = '';

  const evs       = cfg?.evs       || {};
  const ivs       = cfg?.ivs       || {};
  const naturaleza = cfg?.naturaleza || 'hardy';
  const nivel     = cfg?.nivel     || 100;

  mon.stats.forEach(s => {
    const clave  = claveEstadisticaDesdeAPI(s.stat.name);
    const base   = s.base_stat;
    const ev     = evs[clave] ?? 0;
    const iv     = ivs[clave] ?? 31;
    const final  = calcularEstadistica(clave, base, ev, iv, naturaleza, nivel);
    const pct    = Math.min(100, (final / 714) * 100);

    const fila = document.createElement('div');
    fila.className = 'fila-estadistica-final';
    fila.innerHTML = `
      <span class="nombre-estadistica-final">${NOMBRES_ESTADISTICAS[clave]}</span>
      <div class="pista-barra-estadistica">
        <div class="relleno-barra-estadistica" style="width:${pct}%"></div>
      </div>
      <span class="valor-estadistica-final">${final}</span>
    `;
    contenedor.appendChild(fila);
  });
}

function actualizarEstadisticasFinales() {
  const i = estado.ranuraActiva;
  if (i === null || !estado.equipo[i]) return;
  mostrarEstadisticasFinales(estado.equipo[i], construirConfigDesdeFormulario());
}

/** Convierte el nombre de estadística de la API a clave interna */
function claveEstadisticaDesdeAPI(nombreAPI) {
  const mapa = {
    'hp':              'hp',
    'attack':          'atk',
    'defense':         'def',
    'special-attack':  'spa',
    'special-defense': 'spd',
    'speed':           'spe',
  };
  return mapa[nombreAPI] || nombreAPI;
}


// ════════════════════════════════════════════════════════════════
// 11. OBJETO — Autocompletado
// ════════════════════════════════════════════════════════════════

let temporizadorObjeto;

document.getElementById('campo-objeto').addEventListener('input', () => {
  clearTimeout(temporizadorObjeto);
  const busqueda = document.getElementById('campo-objeto').value.trim().toLowerCase();
  if (busqueda.length < 2) { document.getElementById('autocompletado-objeto').style.display = 'none'; return; }
  temporizadorObjeto = setTimeout(() => mostrarAutocompletadoObjeto(busqueda), 250);
});

function mostrarAutocompletadoObjeto(busqueda) {
  const coincidencias = estado.todosObjetos.filter(obj => obj.name.includes(busqueda)).slice(0, 8);
  const lista         = document.getElementById('autocompletado-objeto');
  if (!coincidencias.length) { lista.style.display = 'none'; return; }

  lista.innerHTML = coincidencias.map(obj => `<li data-nombre="${obj.name}">${obj.name}</li>`).join('');
  lista.style.display = 'block';

  lista.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      document.getElementById('campo-objeto').value = li.dataset.nombre;
      lista.style.display = 'none';
    });
  });
}

document.addEventListener('click', e => {
  if (!e.target.closest('#contenedor-busqueda-objeto')) {
    document.getElementById('autocompletado-objeto').style.display = 'none';
  }
});


// ════════════════════════════════════════════════════════════════
// 12. GUARDAR CONFIGURACIÓN DEL FORMULARIO
// ════════════════════════════════════════════════════════════════

function construirConfigDesdeFormulario() {
  const movimientos = [...document.querySelectorAll('.campo-movimiento')]
    .map(s => s.value)
    .filter(Boolean);

  return {
    apodo:      document.getElementById('campo-apodo').value.trim(),
    habilidad:  document.getElementById('campo-habilidad').value,
    objeto:     document.getElementById('campo-objeto').value.trim(),
    naturaleza: document.getElementById('campo-naturaleza').value,
    movimientos,
    nivel:      parseInt(document.getElementById('campo-nivel').value) || 100,
    genero:     document.getElementById('campo-genero').value,
    esShiny:    document.getElementById('campo-shiny').checked,
    evs:        leerEVs(),
    ivs:        leerIVs(),
  };
}

document.getElementById('boton-guardar-editor').addEventListener('click', () => {
  const i = estado.ranuraActiva;
  if (i === null || !estado.equipo[i]) return;
  estado.equipo[i]._config = construirConfigDesdeFormulario();
  mostrarResumenEquipo();
  guardarEquipo();
  document.getElementById('boton-guardar-editor').textContent = '✓ Guardado';
  setTimeout(() => { document.getElementById('boton-guardar-editor').textContent = '✓ Guardar cambios'; }, 1500);
});

document.getElementById('boton-quitar-pokemon').addEventListener('click', () => {
  if (estado.ranuraActiva === null) return;
  estado.equipo[estado.ranuraActiva] = null;
  cerrarEditorRanura();
  guardarEquipo();
});

document.getElementById('boton-limpiar-equipo').addEventListener('click', () => {
  if (!estado.equipo.some(Boolean)) return;
  if (confirm('¿Limpiar todo el equipo?')) {
    estado.equipo = [null, null, null, null, null, null];
    cerrarEditorRanura();
    guardarEquipo();
  }
});


// ════════════════════════════════════════════════════════════════
// 13. SELECTOR — Cuadrícula de Pokémon (columna izquierda)
// ════════════════════════════════════════════════════════════════

async function mostrarCuadriculaSelector() {
  const cuadricula = document.getElementById('cuadricula-selector');
  const inicio     = estado.selectorPagina * TAMANO_PAGINA;
  const porcion    = estado.selectorFiltrado.slice(inicio, inicio + TAMANO_PAGINA);

  cuadricula.innerHTML = '<div class="cargando">Cargando…</div>';
  if (!porcion.length) { cuadricula.innerHTML = '<div class="cargando">Sin resultados.</div>'; return; }

  const resultados = await Promise.allSettled(porcion.map(p => obtenerPokemon(p.name)));

  cuadricula.innerHTML = resultados.map(r => {
    if (r.status === 'rejected') return '';
    const p        = r.value;
    const enEquipo = estado.equipo.some(m => m && m.id === p.id);
    return `
      <div class="tarjeta-selector ${enEquipo ? 'en-equipo' : ''}" data-nombre="${p.name}">
        <img src="${urlSprite(p.name, 'gen5')}" alt="${p.name}"
             onerror="this.src='${urlSprite(p.name, 'dex')}'" loading="lazy" />
        <div class="nombre-tarjeta-selector">${p.name}</div>
        <button class="boton-agregar-selector" data-nombre="${p.name}">
          ${enEquipo ? '✓' : '+'}
        </button>
      </div>
    `;
  }).join('');

  cuadricula.querySelectorAll('.boton-agregar-selector').forEach(btn => {
    btn.addEventListener('click', () => agregarAlEquipo(btn.dataset.nombre));
  });
}

function mostrarPaginacionSelector() {
  mostrarPaginacion(
    'paginacion-selector',
    estado.selectorFiltrado.length,
    estado.selectorPagina,
    (p) => { estado.selectorPagina = p; mostrarCuadriculaSelector(); mostrarPaginacionSelector(); }
  );
}

// Búsqueda del selector
const entradaBusquedaSelector = document.getElementById('entrada-busqueda-selector');
let   temporizadorSelector;

entradaBusquedaSelector.addEventListener('input', () => {
  clearTimeout(temporizadorSelector);
  temporizadorSelector = setTimeout(() => {
    estado.selectorBusqueda = entradaBusquedaSelector.value.trim().toLowerCase();
    mostrarAutocompletadoSelector(estado.selectorBusqueda);
    aplicarFiltrosSelector();
  }, 250);
});

document.getElementById('boton-busqueda-selector').addEventListener('click', () => {
  estado.selectorBusqueda = entradaBusquedaSelector.value.trim().toLowerCase();
  document.getElementById('autocompletado-selector').style.display = 'none';
  aplicarFiltrosSelector();
});

entradaBusquedaSelector.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    estado.selectorBusqueda = entradaBusquedaSelector.value.trim().toLowerCase();
    document.getElementById('autocompletado-selector').style.display = 'none';
    aplicarFiltrosSelector();
  }
});

function mostrarAutocompletadoSelector(busqueda) {
  const lista       = document.getElementById('autocompletado-selector');
  const coincidencias = estado.todosPokemon.filter(p => p.name.includes(busqueda)).slice(0, 6);
  if (busqueda.length < 2 || !coincidencias.length) { lista.style.display = 'none'; return; }

  lista.innerHTML = coincidencias.map(p => `
    <li data-nombre="${p.name}">
      <img src="${urlSprite(p.name, 'gen5')}" alt=""
           onerror="this.src='${urlSprite(p.name, 'dex')}'" />
      ${p.name}
    </li>
  `).join('');
  lista.style.display = 'block';

  lista.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      entradaBusquedaSelector.value  = li.dataset.nombre;
      estado.selectorBusqueda        = li.dataset.nombre;
      lista.style.display            = 'none';
      aplicarFiltrosSelector();
    });
  });
}

document.addEventListener('click', e => {
  if (!e.target.closest('#contenedor-busqueda-selector')) {
    document.getElementById('autocompletado-selector').style.display = 'none';
  }
});

// Insignias de tipo (selector y pokédex)
function mostrarFiltrosTipo(contexto) {
  const idContenedor = contexto === 'selector' ? 'filtros-tipo-selector' : 'filtros-tipo-pokedex';
  const contenedor   = document.getElementById(idContenedor);
  contenedor.innerHTML = '';

  TODOS_LOS_TIPOS.forEach(tipo => {
    const insignia         = document.createElement('span');
    insignia.className     = `insignia-tipo tipo-${tipo}`;
    insignia.textContent   = tipo;
    insignia.addEventListener('click', () => {
      insignia.classList.toggle('activa');
      if (contexto === 'selector') {
        estado.selectorTiposActivos.has(tipo)
          ? estado.selectorTiposActivos.delete(tipo)
          : estado.selectorTiposActivos.add(tipo);
        aplicarFiltrosSelector();
      } else {
        estado.pokédexTiposActivos.has(tipo)
          ? estado.pokédexTiposActivos.delete(tipo)
          : estado.pokédexTiposActivos.add(tipo);
        aplicarFiltrosPokedex();
      }
    });
    contenedor.appendChild(insignia);
  });
}

async function aplicarFiltrosSelector() {
  let lista = [...estado.todosPokemon];

  if (estado.selectorBusqueda) {
    lista = lista.filter(p =>
      p.name.includes(estado.selectorBusqueda) ||
      String(idDesdeUrl(p.url)).includes(estado.selectorBusqueda)
    );
  }

  if (estado.selectorTiposActivos.size > 0) {
    const conjuntos = await Promise.all([...estado.selectorTiposActivos].map(obtenerNombresPorTipo));
    lista = lista.filter(p => conjuntos.every(c => c.has(p.name)));
  }

  estado.selectorFiltrado = lista;
  estado.selectorPagina   = 0;
  mostrarCuadriculaSelector();
  mostrarPaginacionSelector();
}


// ════════════════════════════════════════════════════════════════
// 14. AGREGAR AL EQUIPO
// ════════════════════════════════════════════════════════════════

async function agregarAlEquipo(nombre) {
  const ranuraVacia = estado.equipo.findIndex(m => m === null);
  if (ranuraVacia === -1) { alert('¡Tu equipo ya está completo! (6/6)'); return; }

  const p = await obtenerPokemon(nombre);
  if (estado.equipo.some(m => m && m.id === p.id)) { alert(`${nombre} ya está en el equipo.`); return; }

  // Configuración por defecto
  p._config = {
    apodo:      '',
    habilidad:  p.abilities[0]?.ability.name || '',
    objeto:     '',
    naturaleza: 'hardy',
    movimientos: p.moves.slice(0, 4).map(m => m.move.name),
    nivel:      100,
    genero:     'M',
    esShiny:    false,
    evs:  { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ivs:  { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  };

  estado.equipo[ranuraVacia] = p;
  mostrarResumenEquipo();
  guardarEquipo();
  await abrirEditorRanura(ranuraVacia);  // abrir editor inmediatamente
  mostrarCuadriculaSelector();           // refrescar marcas "en-equipo"
}


// ════════════════════════════════════════════════════════════════
// 15. POKÉDEX — Cuadrícula independiente
// ════════════════════════════════════════════════════════════════

async function mostrarCuadriculaPokedex() {
  const cuadricula = document.getElementById('cuadricula-pokedex');
  const titulo     = document.getElementById('titulo-resultados-pokedex');
  const inicio     = estado.pokédexPagina * TAMANO_PAGINA;
  const porcion    = estado.pokédexFiltrada.slice(inicio, inicio + TAMANO_PAGINA);

  titulo.textContent   = `${estado.pokédexFiltrada.length} Pokémon`;
  cuadricula.innerHTML = '<div class="cargando">Cargando…</div>';
  if (!porcion.length) { cuadricula.innerHTML = '<div class="cargando">Sin resultados.</div>'; return; }

  const resultados = await Promise.allSettled(porcion.map(p => obtenerPokemon(p.name)));

  cuadricula.innerHTML = resultados.map(r => {
    if (r.status === 'rejected') return '';
    const p     = r.value;
    const tipos = p.types.map(t => t.type.name);
    return `
      <div class="tarjeta-pokedex" data-nombre="${p.name}">
        <img src="${urlSprite(p.name, 'gen5')}" alt="${p.name}"
             onerror="this.src='${urlSprite(p.name, 'dex')}'" loading="lazy" />
        <div class="numero-pokedex">#${String(p.id).padStart(4, '0')}</div>
        <div class="nombre-pokedex">${p.name}</div>
        <div class="tipos-pokedex">
          ${tipos.map(t => `<span class="insignia-tipo tipo-${t}">${t}</span>`).join('')}
        </div>
      </div>
    `;
  }).join('');

  cuadricula.querySelectorAll('.tarjeta-pokedex').forEach(tarjeta => {
    tarjeta.addEventListener('click', () => abrirModalPokedex(tarjeta.dataset.nombre));
  });
}

function mostrarPaginacionPokedex() {
  mostrarPaginacion(
    'paginacion-pokedex',
    estado.pokédexFiltrada.length,
    estado.pokédexPagina,
    (p) => {
      estado.pokédexPagina = p;
      mostrarCuadriculaPokedex();
      mostrarPaginacionPokedex();
      document.getElementById('pagina-pokedex').scrollTop = 0;
    }
  );
}

// Búsqueda y filtros de la Pokédex
const entradaBusquedaPokedex = document.getElementById('entrada-busqueda-pokedex');
let   temporizadorPokedex;

entradaBusquedaPokedex.addEventListener('input', () => {
  clearTimeout(temporizadorPokedex);
  temporizadorPokedex = setTimeout(() => {
    estado.pokédexBusqueda = entradaBusquedaPokedex.value.trim().toLowerCase();
    aplicarFiltrosPokedex();
  }, 300);
});

document.getElementById('boton-buscar-pokedex').addEventListener('click', () => {
  estado.pokédexBusqueda = entradaBusquedaPokedex.value.trim().toLowerCase();
  aplicarFiltrosPokedex();
});

document.getElementById('boton-limpiar-pokedex').addEventListener('click', () => {
  entradaBusquedaPokedex.value   = '';
  estado.pokédexBusqueda         = '';
  estado.pokédexTiposActivos.clear();
  document.querySelectorAll('#filtros-tipo-pokedex .insignia-tipo').forEach(b => b.classList.remove('activa'));
  aplicarFiltrosPokedex();
});

async function aplicarFiltrosPokedex() {
  let lista = [...estado.todosPokemon];

  if (estado.pokédexBusqueda) {
    lista = lista.filter(p =>
      p.name.includes(estado.pokédexBusqueda) ||
      String(idDesdeUrl(p.url)).includes(estado.pokédexBusqueda)
    );
  }

  if (estado.pokédexTiposActivos.size > 0) {
    const conjuntos = await Promise.all([...estado.pokédexTiposActivos].map(obtenerNombresPorTipo));
    lista = lista.filter(p => conjuntos.every(c => c.has(p.name)));
  }

  estado.pokédexFiltrada = lista;
  estado.pokédexPagina   = 0;
  mostrarCuadriculaPokedex();
  mostrarPaginacionPokedex();
}

// Modal de detalle
async function abrirModalPokedex(nombre) {
  const fondo     = document.getElementById('fondo-modal-pokedex');
  const contenido = document.getElementById('contenido-modal-pokedex');
  fondo.classList.add('abierto');
  contenido.innerHTML = '<div class="cargando">Cargando…</div>';

  try {
    const p     = await obtenerPokemon(nombre);
    const tipos = p.types.map(t => t.type.name);
    const movs  = p.moves.slice(0, 20).map(m => m.move.name);

    const htmlEstadisticas = p.stats.map(s => `
      <div class="barra-estadistica-base">
        <div class="etiqueta-barra-estadistica">
          <span>${s.stat.name.toUpperCase().replace('-', ' ')}</span>
          <span>${s.base_stat}</span>
        </div>
        <div class="pista-barra-estadistica-base">
          <div class="relleno-barra-estadistica-base" style="width:${(s.base_stat / 255) * 100}%"></div>
        </div>
      </div>
    `).join('');

    contenido.innerHTML = `
      <img class="sprite-modal-pokedex" src="${urlSprite(p.name, 'dex')}" alt="${p.name}"
           onerror="this.src='${urlSprite(p.name, 'gen5')}'" />
      <h3>${p.name}</h3>
      <div class="id-modal-pokedex">#${String(p.id).padStart(4, '0')} · ${p.height / 10}m · ${p.weight / 10}kg</div>
      <div class="tipos-modal-pokedex">
        ${tipos.map(t => `<span class="insignia-tipo tipo-${t}">${t}</span>`).join('')}
      </div>
      <h4>Estadísticas Base</h4>
      ${htmlEstadisticas}
      <h4>Movimientos (primeros 20)</h4>
      <div class="lista-movimientos-modal">
        ${movs.map(m => `<span class="etiqueta-movimiento-modal">${m}</span>`).join('')}
      </div>
      <button id="boton-agregar-al-equipo" data-nombre="${p.name}">+ Añadir al equipo</button>
    `;

    contenido.querySelector('#boton-agregar-al-equipo').addEventListener('click', async () => {
      await agregarAlEquipo(p.name);
      cerrarModalPokedex();
      irAPagina('armador');
    });
  } catch (err) {
    contenido.innerHTML = `<div class="cargando">Error: ${err.message}</div>`;
  }
}

document.getElementById('cerrar-modal-pokedex').addEventListener('click', cerrarModalPokedex);
document.getElementById('fondo-modal-pokedex').addEventListener('click', e => {
  if (e.target === e.currentTarget) cerrarModalPokedex();
});

function cerrarModalPokedex() {
  document.getElementById('fondo-modal-pokedex').classList.remove('abierto');
}


// ════════════════════════════════════════════════════════════════
// 16. PAGINACIÓN — Función reutilizable
// ════════════════════════════════════════════════════════════════

function mostrarPaginacion(idContenedor, total, paginaActual, alCambiarPagina) {
  const contenedor   = document.getElementById(idContenedor);
  const totalPaginas = Math.ceil(total / TAMANO_PAGINA);
  const p            = paginaActual;

  let html = `<button class="boton-paginacion" id="${idContenedor}-anterior" ${p === 0 ? 'disabled' : ''}>◀</button>`;

  const inicio = Math.max(0, p - 2);
  const fin    = Math.min(totalPaginas - 1, p + 2);

  if (inicio > 0)       html += `<button class="boton-paginacion" data-p="0">1</button>${inicio > 1 ? '<span>…</span>' : ''}`;
  for (let i = inicio; i <= fin; i++) {
    html += `<button class="boton-paginacion ${i === p ? 'activo' : ''}" data-p="${i}">${i + 1}</button>`;
  }
  if (fin < totalPaginas - 1) html += `${fin < totalPaginas - 2 ? '<span>…</span>' : ''}<button class="boton-paginacion" data-p="${totalPaginas - 1}">${totalPaginas}</button>`;

  html += `<button class="boton-paginacion" id="${idContenedor}-siguiente" ${p >= totalPaginas - 1 ? 'disabled' : ''}>▶</button>`;

  contenedor.innerHTML = html;
  contenedor.querySelector(`#${idContenedor}-anterior`)?.addEventListener('click', () => alCambiarPagina(p - 1));
  contenedor.querySelector(`#${idContenedor}-siguiente`)?.addEventListener('click', () => alCambiarPagina(p + 1));
  contenedor.querySelectorAll('.boton-paginacion[data-p]').forEach(btn => {
    btn.addEventListener('click', () => alCambiarPagina(Number(btn.dataset.p)));
  });
}


// ════════════════════════════════════════════════════════════════
// 17. ANÁLISIS DE TIPOS
// ════════════════════════════════════════════════════════════════

// Tabla de efectividad (tipo atacante → tipo defensor)
const TABLA_TIPOS = {
  normal:   { rock:0.5, ghost:0, steel:0.5 },
  fire:     { fire:0.5, water:0.5, grass:2, ice:2, bug:2, rock:0.5, dragon:0.5, steel:2 },
  water:    { fire:2, water:0.5, grass:0.5, ground:2, rock:2, dragon:0.5 },
  grass:    { fire:0.5, water:2, grass:0.5, poison:0.5, ground:2, flying:0.5, bug:0.5, rock:2, dragon:0.5, steel:0.5 },
  electric: { water:2, grass:0.5, electric:0.5, ground:0, flying:2, dragon:0.5 },
  ice:      { fire:0.5, water:0.5, grass:2, ice:0.5, ground:2, flying:2, dragon:2, steel:0.5 },
  fighting: { normal:2, ice:2, poison:0.5, flying:0.5, psychic:0.5, bug:0.5, rock:2, ghost:0, dark:2, steel:2, fairy:0.5 },
  poison:   { grass:2, poison:0.5, ground:0.5, rock:0.5, ghost:0.5, steel:0, fairy:2 },
  ground:   { fire:2, electric:2, grass:0.5, poison:2, flying:0, bug:0.5, rock:2, steel:2 },
  flying:   { electric:0.5, grass:2, fighting:2, bug:2, rock:0.5, steel:0.5 },
  psychic:  { fighting:2, poison:2, psychic:0.5, dark:0, steel:0.5 },
  bug:      { fire:0.5, grass:2, fighting:0.5, flying:0.5, psychic:2, ghost:0.5, dark:2, steel:0.5, fairy:0.5 },
  rock:     { fire:2, ice:2, fighting:0.5, ground:0.5, flying:2, bug:2, steel:0.5 },
  ghost:    { normal:0, psychic:2, ghost:2, dark:0.5 },
  dragon:   { dragon:2, steel:0.5, fairy:0 },
  dark:     { fighting:0.5, psychic:2, ghost:2, dark:0.5, fairy:0.5 },
  steel:    { fire:0.5, water:0.5, electric:0.5, ice:2, rock:2, steel:0.5, fairy:2 },
  fairy:    { fire:0.5, fighting:2, poison:0.5, dragon:2, dark:2, steel:0.5 },
};

function mostrarAnalisisTipos() {
  const contenedor = document.getElementById('contenido-analisis-tipos');
  const equipo     = estado.equipo.filter(Boolean);

  if (!equipo.length) {
    contenedor.innerHTML = '<p class="cargando">Agrega Pokémon a tu equipo para ver el análisis.</p>';
    return;
  }

  const debilidades  = {};
  const resistencias = {};

  equipo.forEach(mon => {
    const tiposDefensores = mon.types.map(t => t.type.name);
    TODOS_LOS_TIPOS.forEach(tipoAtacante => {
      let multiplicador = 1;
      tiposDefensores.forEach(tipoDefensor => {
        multiplicador *= TABLA_TIPOS[tipoAtacante]?.[tipoDefensor] ?? 1;
      });
      if (multiplicador > 1) debilidades[tipoAtacante]  = (debilidades[tipoAtacante]  || 0) + 1;
      if (multiplicador < 1) resistencias[tipoAtacante] = (resistencias[tipoAtacante] || 0) + 1;
    });
  });

  const construirCuadricula = (datos) => {
    const ordenados = Object.entries(datos).sort((a, b) => b[1] - a[1]);
    if (!ordenados.length) return '<p class="cargando">Ninguna.</p>';
    return `<div class="cuadricula-analisis">
      ${ordenados.map(([tipo, cantidad]) => `
        <div class="elemento-tipo-analisis">
          <span class="insignia-tipo tipo-${tipo}">${tipo}</span>
          <span class="contador-analisis">×${cantidad}</span>
        </div>
      `).join('')}
    </div>`;
  };

  contenedor.innerHTML = `
    <div class="seccion-analisis">
      <h3>🔴 Debilidades del equipo</h3>
      ${construirCuadricula(debilidades)}
    </div>
    <div class="seccion-analisis">
      <h3>🟢 Resistencias del equipo</h3>
      ${construirCuadricula(resistencias)}
    </div>
  `;
}


// ════════════════════════════════════════════════════════════════
// 18. CALCULADORA DE DAÑO
// ════════════════════════════════════════════════════════════════

document.getElementById('boton-calcular').addEventListener('click', calcularDanio);

function calcularDanio() {
  const nivelAtk    = parseInt(document.getElementById('calc-nivel-atk').value)         || 100;
  const estadAtk    = parseInt(document.getElementById('calc-estadistica-atk').value)   || 1;
  const natAtk      = parseFloat(document.getElementById('calc-naturaleza-atk').value);
  const poder       = parseInt(document.getElementById('calc-poder-movimiento').value)  || 1;
  const stab        = parseFloat(document.getElementById('calc-stab').value);
  const estadDef    = parseInt(document.getElementById('calc-estadistica-def').value)   || 1;
  const natDef      = parseFloat(document.getElementById('calc-naturaleza-def').value);
  const hpDef       = parseInt(document.getElementById('calc-hp-def').value)            || 1;
  const efectividad = parseFloat(document.getElementById('calc-efectividad-tipo').value);

  // Fórmula simplificada Gen 5+
  const A    = Math.floor(estadAtk * natAtk);
  const D    = Math.floor(estadDef * natDef);
  const base = Math.floor((Math.floor((2 * nivelAtk) / 5 + 2) * poder * A / D) / 50 + 2);

  const danioMin = Math.floor(base * 0.85 * stab * efectividad);
  const danioMax = Math.floor(base * 1.00 * stab * efectividad);
  const pctMin   = ((danioMin / hpDef) * 100).toFixed(1);
  const pctMax   = ((danioMax / hpDef) * 100).toFixed(1);
  const esOHKO   = danioMin >= hpDef;

  document.getElementById('resultado-calculadora').innerHTML = `
    <div class="caja-resultado-calculadora ${esOHKO ? 'golpe-ko' : ''}">
      <div class="rango-danio">${danioMin} – ${danioMax}</div>
      <div class="rango-porcentaje">${pctMin}% – ${pctMax}% del HP</div>
      ${esOHKO ? '<div class="etiqueta-golpe-ko">¡OHKO garantizado!</div>' : ''}
    </div>
  `;
}


// ════════════════════════════════════════════════════════════════
// 19. IMPORTAR / EXPORTAR (formato Pokémon Showdown)
// ════════════════════════════════════════════════════════════════

function generarExportacion() {
  const equipo = estado.equipo.filter(Boolean);
  if (!equipo.length) { document.getElementById('area-exportar').value = ''; return; }

  const texto = equipo.map(mon => {
    const cfg    = mon._config;
    const nombre = cfg.apodo ? `${cfg.apodo} (${mon.name})` : mon.name;
    const objeto = cfg.objeto ? ` @ ${cfg.objeto}` : '';
    const lineas = [
      `${nombre}${objeto}`,
      `Ability: ${cfg.habilidad || '—'}`,
      `Level: ${cfg.nivel || 100}`,
      `${cfg.naturaleza ? cfg.naturaleza.charAt(0).toUpperCase() + cfg.naturaleza.slice(1) : 'Hardy'} Nature`,
      `EVs: ${CLAVES_ESTADISTICAS.map(k => `${cfg.evs?.[k] || 0} ${NOMBRES_ESTADISTICAS[k]}`).filter(s => !s.startsWith('0')).join(' / ') || '—'}`,
      ...(cfg.movimientos || []).map(m => `- ${m}`),
    ];
    return lineas.join('\n');
  }).join('\n\n');

  document.getElementById('area-exportar').value = texto;
}

document.getElementById('boton-generar-exportar').addEventListener('click', generarExportacion);

document.getElementById('boton-copiar-exportar').addEventListener('click', () => {
  const area = document.getElementById('area-exportar');
  navigator.clipboard.writeText(area.value).then(() => {
    document.getElementById('boton-copiar-exportar').textContent = '✓ Copiado';
    setTimeout(() => { document.getElementById('boton-copiar-exportar').textContent = '📋 Copiar'; }, 1500);
  });
});

document.getElementById('boton-cargar-importar').addEventListener('click', async () => {
  const texto    = document.getElementById('area-importar').value.trim();
  const respuesta = document.getElementById('respuesta-importar');
  if (!texto) { respuesta.innerHTML = '<span class="importar-error">Pega un equipo primero.</span>'; return; }

  const bloques = texto.split(/\n\n+/).filter(Boolean);
  const nombres = bloques.map(bloque => {
    const primeraLinea = bloque.split('\n')[0];
    const coincidencia = primeraLinea.match(/\(([^)]+)\)/);
    if (coincidencia) return coincidencia[1].toLowerCase().trim();
    return primeraLinea.split('@')[0].trim().toLowerCase();
  }).slice(0, 6);

  respuesta.innerHTML = '<span class="cargando">Cargando Pokémon…</span>';
  const pokemonCargados = await Promise.all(nombres.map(n => obtenerPokemon(n).catch(() => null)));

  estado.equipo = [null, null, null, null, null, null];
  pokemonCargados.filter(Boolean).forEach((p, i) => {
    p._config = {
      apodo: '', habilidad: p.abilities[0]?.ability.name || '', objeto: '', naturaleza: 'hardy',
      movimientos: p.moves.slice(0, 4).map(m => m.move.name), nivel: 100, genero: 'M', esShiny: false,
      evs: { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 },
      ivs: { hp:31, atk:31, def:31, spa:31, spd:31, spe:31 },
    };
    estado.equipo[i] = p;
  });

  mostrarResumenEquipo();
  mostrarCuadriculaSelector();
  guardarEquipo();
  respuesta.innerHTML = `<span class="importar-exito">✓ ${pokemonCargados.filter(Boolean).length} Pokémon importados.</span>`;
});


// ════════════════════════════════════════════════════════════════
// 20. PERSISTENCIA en localStorage
// ════════════════════════════════════════════════════════════════

function guardarEquipo() {
  const datos = estado.equipo.map(m => m ? { nombre: m.name, config: m._config } : null);
  localStorage.setItem('armador_equipo_v1', JSON.stringify(datos));
}

async function cargarEquipoGuardado() {
  const raw = localStorage.getItem('armador_equipo_v1');
  if (!raw) return;
  try {
    const datos         = JSON.parse(raw);
    const pokemonCargados = await Promise.all(datos.map(d => d ? obtenerPokemon(d.nombre).catch(() => null) : null));
    pokemonCargados.forEach((p, i) => {
      if (!p) return;
      p._config       = datos[i].config;
      estado.equipo[i] = p;
    });
    mostrarResumenEquipo();
    mostrarCuadriculaSelector();
  } catch { /* datos corruptos, ignorar */ }
}


// ════════════════════════════════════════════════════════════════
// 21. INICIALIZACIÓN
// ════════════════════════════════════════════════════════════════

(async function inicializar() {
  mostrarFiltrosTipo('selector');
  mostrarFiltrosTipo('pokedex');
  mostrarResumenEquipo();
  await cargarDatosIniciales();
  await cargarEquipoGuardado();
})();
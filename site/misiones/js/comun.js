/* =====================================================================
   Utilidades compartidas: íconos, textos para jugadores y estados.
   No contiene datos: todo llega desde js/datos.js.
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- íconos ---------- */
  var ICONOS = {
    pergamino: '<path d="M7 4.5h10.5a2.5 2.5 0 0 1 0 5H17v8a2.5 2.5 0 0 1-2.5 2.5H6"/><path d="M7 4.5A2.5 2.5 0 0 0 4.5 7v1.5H7M7 4.5v13a2.5 2.5 0 0 1-2.5 2.5h0M10 9h4M10 12.5h4"/>',
    espada: '<path d="M14.5 4.5h5v5L10 19l-2.5.5-.5-2.5z"/><path d="M5 14l5 5M4 20l2.5-2.5"/>',
    libro: '<path d="M4.5 5.5A2 2 0 0 1 6.5 3.5H19v14H6.5a2 2 0 0 0-2 2z"/><path d="M4.5 19.5a2 2 0 0 0 2 2H19v-4M8.5 8h6M8.5 11h4"/>',
    persona: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5"/>',
    candado: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    regalo: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M3.5 9h17M12 9v11M12 9c-1.5-3-5.5-4-5.5-1.5S10 9 12 9zM12 9c1.5-3 5.5-4 5.5-1.5S14 9 12 9z"/>',
    reloj_arena: '<path d="M7 3.5h10M7 20.5h10M8 3.5c0 5 8 5 8 8.5s-8 3.5-8 8.5M16 3.5c0 5-8 5-8 8.5s8 3.5 8 8.5"/>',
    repetir: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5"/>',
    check: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.3l2.4 2.4 4.6-4.9"/>',
    estrella: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
    destello: '<path d="M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z"/>',
    izq: '<path d="M14.5 6l-6 6 6 6"/>',
    der: '<path d="M9.5 6l6 6-6 6"/>',
    inicio: '<path d="M3.5 11L12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5M10 20v-5.5h4V20"/>',
    enlace: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    salir: '<path d="M14 4.5h4.5v15H14M10 8l-4 4 4 4M6 12h10"/>',
    buscar: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="M15.5 15.5l4.5 4.5"/>',
    mas: '<path d="M12 5v14M5 12h14"/>',
    editar: '<path d="M4.5 19.5h4l10-10-4-4-10 10z"/><path d="M13 7l4 4"/>',
    copiar: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6A2.5 2.5 0 0 0 13 3.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/>',
    basura: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5"/>',
    arriba: '<path d="M6 15l6-6 6 6"/>',
    abajo: '<path d="M6 9l6 6 6-6"/>',
    ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M6 6l1.8 1.8M16.2 16.2L18 18M6 18l1.8-1.8M16.2 7.8L18 6"/>',
    grupo: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c0-3.2 2.4-5.5 5.5-5.5s5.5 2.3 5.5 5.5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.5 14.2c.5-.2 1-.2 1.5-.2 2.2 0 3.8 1.8 3.8 4.4"/>',
    ojo: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    alerta: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
    corona: '<path d="M4 17l-1-9 5 4 4-7 4 7 5-4-1 9z"/><path d="M4 20h16"/>',
    panel: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>'
  };
  function ic(nombre, clase) { return '<svg class="icono ' + (clase || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONOS[nombre] || '') + '</svg>'; }
  var SELLO = '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="gsello" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF1D2"/><stop offset=".5" stop-color="#F3D08A"/><stop offset="1" stop-color="#C79BF0"/></linearGradient></defs><g fill="none" stroke="url(#gsello)" stroke-width="1.6"><circle cx="32" cy="32" r="28"/><circle cx="32" cy="32" r="21" stroke-dasharray="2 4"/><path d="M32 6l6.5 15.5L54 26l-12.5 10.5L45 52 32 43.5 19 52l3.5-15.5L10 26l15.5-4.5z"/></g><circle cx="32" cy="32" r="4" fill="#FFF1D2"/></svg>';

  /* ---------- textos ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function limpiarId(id) { return String(id || '').replace(/^minecraft:/, ''); }
  function bonito(id) { var s = limpiarId(id).replace(/_/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); }

  var ENTIDADES = {
    zombie: ['zombi', 'zombis'], zombie_villager: ['aldeano zombi', 'aldeanos zombis'], husk: ['zombi momificado', 'zombis momificados'], drowned: ['ahogado', 'ahogados'],
    skeleton: ['esqueleto', 'esqueletos'], stray: ['esqueleto glacial', 'esqueletos glaciales'], bogged: ['esqueleto pantanoso', 'esqueletos pantanosos'], wither_skeleton: ['esqueleto wither', 'esqueletos wither'],
    creeper: ['creeper', 'creepers'], spider: ['araña', 'arañas'], cave_spider: ['araña de cueva', 'arañas de cueva'], enderman: ['enderman', 'endermen'], endermite: ['endermite', 'endermites'],
    ghast: ['ghast', 'ghasts'], blaze: ['blaze', 'blazes'], magma_cube: ['cubo de magma', 'cubos de magma'], slime: ['slime', 'slimes'], shulker: ['shulker', 'shulkers'],
    witch: ['bruja', 'brujas'], phantom: ['phantom', 'phantoms'], pillager: ['saqueador', 'saqueadores'], vindicator: ['vindicador', 'vindicadores'], evoker: ['invocador', 'invocadores'],
    ravager: ['devastador', 'devastadores'], vex: ['vex', 'vexes'], guardian: ['guardián', 'guardianes'], elder_guardian: ['guardián anciano', 'guardianes ancianos'],
    piglin: ['piglin', 'piglins'], piglin_brute: ['piglin bruto', 'piglins brutos'], zombified_piglin: ['piglin zombificado', 'piglins zombificados'], hoglin: ['hoglin', 'hoglins'], zoglin: ['zoglin', 'zoglins'],
    silverfish: ['lepisma', 'lepismas'], warden: ['warden', 'wardens'], wither: ['Wither', 'Withers'], ender_dragon: ['dragón del End', 'dragones del End'], breeze: ['breeze', 'breezes'],
    cow: ['vaca', 'vacas'], pig: ['cerdo', 'cerdos'], sheep: ['oveja', 'ovejas'], chicken: ['gallina', 'gallinas'], rabbit: ['conejo', 'conejos'], horse: ['caballo', 'caballos'], donkey: ['burro', 'burros'],
    mule: ['mula', 'mulas'], camel: ['camello', 'camellos'], llama: ['llama', 'llamas'], villager: ['aldeano', 'aldeanos'], wandering_trader: ['comerciante errante', 'comerciantes errantes'],
    wolf: ['lobo', 'lobos'], cat: ['gato', 'gatos'], fox: ['zorro', 'zorros'], bee: ['abeja', 'abejas'], goat: ['cabra', 'cabras'], frog: ['rana', 'ranas'], axolotl: ['ajolote', 'ajolotes'],
    turtle: ['tortuga', 'tortugas'], panda: ['panda', 'pandas'], polar_bear: ['oso polar', 'osos polares'], iron_golem: ['gólem de hierro', 'gólems de hierro'], allay: ['allay', 'allays'],
    squid: ['calamar', 'calamares'], glow_squid: ['calamar brillante', 'calamares brillantes'], dolphin: ['delfín', 'delfines'], cod: ['bacalao', 'bacalaos'], salmon: ['salmón', 'salmones'],
    strider: ['strider', 'striders'], sniffer: ['sniffer', 'sniffers'], armadillo: ['armadillo', 'armadillos'], parrot: ['loro', 'loros'], bat: ['murciélago', 'murciélagos']
  };
  var COSAS = {
    bow: 'un arco', crossbow: 'una ballesta', trident: 'un tridente', mace: 'una maza', shield: 'un escudo', fishing_rod: 'una caña de pescar', shears: 'unas tijeras', flint_and_steel: 'un mechero',
    wooden_sword: 'una espada de madera', stone_sword: 'una espada de piedra', iron_sword: 'una espada de hierro', golden_sword: 'una espada de oro', diamond_sword: 'una espada de diamante', netherite_sword: 'una espada de netherita',
    wooden_axe: 'un hacha de madera', stone_axe: 'un hacha de piedra', iron_axe: 'un hacha de hierro', golden_axe: 'un hacha de oro', diamond_axe: 'un hacha de diamante', netherite_axe: 'un hacha de netherita',
    wooden_pickaxe: 'un pico de madera', stone_pickaxe: 'un pico de piedra', iron_pickaxe: 'un pico de hierro', golden_pickaxe: 'un pico de oro', diamond_pickaxe: 'un pico de diamante', netherite_pickaxe: 'un pico de netherita',
    wooden_shovel: 'una pala de madera', iron_shovel: 'una pala de hierro', diamond_shovel: 'una pala de diamante', iron_hoe: 'una azada de hierro', diamond_hoe: 'una azada de diamante',
    iron_helmet: 'un casco de hierro', diamond_helmet: 'un casco de diamante', golden_helmet: 'un casco de oro', leather_helmet: 'un casco de cuero', turtle_helmet: 'un caparazón de tortuga', carved_pumpkin: 'una calabaza tallada',
    iron_chestplate: 'una pechera de hierro', diamond_chestplate: 'una pechera de diamante', elytra: 'unas élitros', iron_leggings: 'unas grebas de hierro', diamond_leggings: 'unas grebas de diamante',
    iron_boots: 'unas botas de hierro', diamond_boots: 'unas botas de diamante', leather_boots: 'unas botas de cuero', totem_of_undying: 'un tótem de la inmortalidad', torch: 'una antorcha'
  };
  var NOMBRES = {
    wheat: 'trigo', bread: 'pan', apple: 'manzanas', golden_apple: 'manzanas doradas', carrot: 'zanahorias', potato: 'papas', cooked_beef: 'filetes', diamond: 'diamantes', emerald: 'esmeraldas',
    iron_ingot: 'lingotes de hierro', gold_ingot: 'lingotes de oro', coal: 'carbón', ghast_tear: 'lágrimas de ghast', blaze_rod: 'varas de blaze', ender_pearl: 'perlas de ender', string: 'hilo',
    oak_log: 'troncos de roble', oak_planks: 'tablas de roble', cobblestone: 'piedra labrada', stone: 'piedra', dirt: 'tierra', sand: 'arena', glass: 'vidrio', torch: 'antorchas', bed: 'camas',
    diamond_ore: 'menas de diamante', deepslate_diamond_ore: 'menas de diamante de pizarra', iron_ore: 'menas de hierro', gold_ore: 'menas de oro', coal_ore: 'menas de carbón', ancient_debris: 'escombros ancestrales',
    amethyst_cluster: 'racimos de amatista', amethyst_shard: 'fragmentos de amatista', cherry_log: 'troncos de cerezo', cherry_leaves: 'hojas de cerezo', pumpkin: 'calabazas', melon: 'sandías',
    sweet_berries: 'bayas dulces', honey_bottle: 'botellas de miel', milk_bucket: 'cubos de leche', potion: 'pociones', cake: 'pasteles', chest: 'cofres', crafting_table: 'mesas de trabajo', furnace: 'hornos',
    grass_block: 'bloques de césped', obsidian: 'obsidiana', netherrack: 'netherrack', end_stone: 'piedra del End', bell: 'campanas', lever: 'palancas', stone_button: 'botones', oak_door: 'puertas de roble'
  };
  var BLOQUE_SING = { grass_block: 'un bloque de césped', sand: 'arena', stone: 'piedra', diamond_block: 'un bloque de diamante', gold_block: 'un bloque de oro', obsidian: 'obsidiana', ice: 'hielo', snow: 'nieve', netherrack: 'netherrack', end_stone: 'piedra del End', soul_sand: 'arena de almas', magma_block: 'un bloque de magma', slime_block: 'un bloque de slime', honey_block: 'un bloque de miel' };
  var METODOS = {
    entityAttack: 'cuerpo a cuerpo', projectile: 'con flechas o proyectiles', fall: 'haciéndolo caer', fire: 'con fuego', fireTick: 'con fuego', lava: 'con lava', drowning: 'ahogándolo', magic: 'con magia',
    lightning: 'con un rayo', blockExplosion: 'con una explosión', entityExplosion: 'con una explosión', void: 'lanzándolo al vacío', maceSmash: 'con un golpe de maza', freezing: 'congelándolo',
    thorns: 'con espinas', anvil: 'con un yunque', suffocation: 'asfixiándolo', sonicBoom: 'con un estallido sónico', contact: 'con cactus o arbustos', wither: 'con el efecto wither', campfire: 'con una fogata', stalactite: 'con una estalactita', stalagmite: 'con una estalagmita'
  };
  var ENCANTAMIENTOS = {
    sharpness: 'Filo', smite: 'Golpe', bane_of_arthropods: 'Perdición de los artrópodos', knockback: 'Empuje', fire_aspect: 'Aspecto ígneo', looting: 'Botín', sweeping: 'Filo arrasador',
    power: 'Poder', punch: 'Retroceso', flame: 'Fuego', infinity: 'Infinidad', multishot: 'Multidisparo', piercing: 'Perforación', quick_charge: 'Carga rápida',
    efficiency: 'Eficiencia', fortune: 'Fortuna', silk_touch: 'Toque de seda', unbreaking: 'Irrompibilidad', mending: 'Reparación', protection: 'Protección', fire_protection: 'Protección contra el fuego',
    blast_protection: 'Protección contra explosiones', projectile_protection: 'Protección contra proyectiles', feather_falling: 'Caída de pluma', thorns: 'Espinas', respiration: 'Respiración',
    aqua_affinity: 'Afinidad acuática', depth_strider: 'Agilidad acuática', frost_walker: 'Paso helado', soul_speed: 'Velocidad de almas', swift_sneak: 'Sigilo rápido',
    loyalty: 'Lealtad', riptide: 'Propulsión acuática', channeling: 'Conductividad', impaling: 'Empalamiento', lure: 'Atracción', luck_of_the_sea: 'Suerte marina', density: 'Densidad', breach: 'Brecha', wind_burst: 'Ráfaga de viento'
  };
  var EFECTOS = {
    speed: 'Velocidad', slowness: 'Lentitud', haste: 'Prisa', mining_fatigue: 'Fatiga minera', strength: 'Fuerza', instant_health: 'Curación instantánea', jump_boost: 'Salto', nausea: 'Náuseas',
    regeneration: 'Regeneración', resistance: 'Resistencia', fire_resistance: 'Resistencia al fuego', water_breathing: 'Respiración acuática', invisibility: 'Invisibilidad', blindness: 'Ceguera',
    night_vision: 'Visión nocturna', hunger: 'Hambre', weakness: 'Debilidad', poison: 'Veneno', wither: 'Wither', health_boost: 'Vida extra', absorption: 'Absorción', saturation: 'Saturación',
    levitation: 'Levitación', slow_falling: 'Caída lenta', conduit_power: 'Poder del conducto', darkness: 'Oscuridad', bad_omen: 'Mal presagio', hero_of_the_village: 'Héroe de la aldea'
  };
  var BIOMAS = {
    plains: 'Llanura', sunflower_plains: 'Llanura de girasoles', forest: 'Bosque', flower_forest: 'Bosque florido', birch_forest: 'Bosque de abedules', dark_forest: 'Bosque oscuro', cherry_grove: 'Arboleda de cerezos',
    taiga: 'Taiga', snowy_taiga: 'Taiga nevada', jungle: 'Jungla', bamboo_jungle: 'Jungla de bambú', savanna: 'Sabana', desert: 'Desierto', badlands: 'Tierras baldías', swamp: 'Pantano', mangrove_swamp: 'Manglar',
    meadow: 'Pradera', snowy_plains: 'Llanura nevada', ice_spikes: 'Picos de hielo', mushroom_fields: 'Campos de champiñones', beach: 'Playa', river: 'Río', ocean: 'Océano', deep_ocean: 'Océano profundo',
    lush_caves: 'Cuevas frondosas', dripstone_caves: 'Cuevas de espeleotemas', deep_dark: 'Oscuridad profunda', jagged_peaks: 'Picos escarpados', frozen_peaks: 'Picos helados', stony_peaks: 'Picos rocosos',
    nether_wastes: 'Páramos del Nether', soul_sand_valley: 'Valle de arena de almas', crimson_forest: 'Bosque carmesí', warped_forest: 'Bosque distorsionado', basalt_deltas: 'Deltas de basalto', the_end: 'End'
  };
  var DIMENSIONES = { overworld: 'en el mundo normal', nether: 'en el Nether', end: 'en el End' };
  var CLIMAS = { clear: 'con cielo despejado', rain: 'mientras llueve', thunder: 'durante una tormenta' };
  var HORAS = { day: 'de día', noon: 'al mediodía', sunset: 'al atardecer', night: 'de noche', midnight: 'a medianoche', sunrise: 'al amanecer' };
  var LUNAS = { fullmoon: 'con luna llena', newMoon: 'con luna nueva', firstQuarter: 'en cuarto creciente', lastQuarter: 'en cuarto menguante', waxingCrescent: 'con luna creciente', waningCrescent: 'con luna menguante', waxingGibbous: 'con luna gibosa creciente', waningGibbous: 'con luna gibosa menguante' };
  var PLATAFORMAS = { console: 'jugando en consola', desktop: 'jugando en PC', mobile: 'jugando en celular' };
  var RANURAS = { helmet: 'en la cabeza', chestplate: 'en el pecho', leggings: 'en las piernas', boots: 'en los pies', offhand: 'en la mano izquierda' };
  var VERBOS = { matar: 'Derrota a', romper: 'Rompe', colocar: 'Coloca', usar: 'Usa', interactuar: 'Interactúa con', consumir: 'Come o bebe', obtener: 'Consigue' };

  function nombreEntidad(id, cantidad) {
    var k = limpiarId(id), e = ENTIDADES[k];
    if (e) return cantidad === 1 ? e[0] : e[1];
    return bonito(id).toLowerCase();
  }
  function nombreCosa(id, cantidad) {
    var k = limpiarId(id);
    if (cantidad === 1 && COSAS[k]) return COSAS[k].replace(/^(un|una|unas|unos) /, '');
    return NOMBRES[k] || (COSAS[k] ? COSAS[k].replace(/^(un|una|unas|unos) /, '') : bonito(id).toLowerCase());
  }
  function conArticulo(id) { var k = limpiarId(id); return COSAS[k] || ('«' + bonito(id) + '»'); }
  function nombreObjetivo(o) {
    var n = Number(o.cantidad) || 1;
    var esEntidad = o.tipo === 'matar' || o.tipo === 'interactuar' || ENTIDADES[limpiarId(o.objetivo)];
    return n + ' ' + (esEntidad ? nombreEntidad(o.objetivo, n) : nombreCosa(o.objetivo, n));
  }
  function textoObjetivo(o) {
    if (o.descripcion && String(o.descripcion).trim()) return String(o.descripcion).trim();
    return (VERBOS[o.tipo] || 'Completa') + ' ' + nombreObjetivo(o);
  }
  function corazones(v) { var h = Number(v) / 2; return (h % 1 ? h.toFixed(1) : h) + (h === 1 ? ' corazón' : ' corazones'); }
  function frasesCondiciones(c) {
    c = c || {};
    var f = [];
    if (c.herramienta) f.push('usando ' + conArticulo(c.herramienta));
    if (c.metodo) f.push(METODOS[c.metodo] || ('con el método «' + c.metodo + '»'));
    if (c.dimension) f.push(DIMENSIONES[c.dimension] || ('en ' + c.dimension));
    if (c.bioma) f.push('en ' + (BIOMAS[limpiarId(c.bioma)] ? 'el bioma ' + BIOMAS[limpiarId(c.bioma)] : 'el bioma «' + bonito(c.bioma) + '»'));
    if (c.hora_del_dia) f.push(HORAS[c.hora_del_dia] || c.hora_del_dia);
    if (c.fase_lunar) f.push(LUNAS[c.fase_lunar] || c.fase_lunar);
    if (c.clima) f.push(CLIMAS[c.clima] || c.clima);
    if (c.zona) { var z = c.zona; f.push('dentro de la zona entre ' + z.x1 + ', ' + z.y1 + ', ' + z.z1 + ' y ' + z.x2 + ', ' + z.y2 + ', ' + z.z2); }
    if (c.altura) f.push((c.altura.tipo === 'debajo' ? 'por debajo' : 'por encima') + ' de la altura ' + c.altura.valor);
    if (c.ubicacion_objetivo) { var u = c.ubicacion_objetivo; f.push('en las coordenadas ' + u.x + ', ' + u.y + ', ' + u.z); }
    if (c.cerca_de) f.push('a menos de ' + c.cerca_de.radio + ' bloques de ' + (ENTIDADES[limpiarId(c.cerca_de.entidad)] ? 'un ' + ENTIDADES[limpiarId(c.cerca_de.entidad)][0] : '«' + bonito(c.cerca_de.entidad) + '»'));
    if (c.montado) f.push('montado en ' + (ENTIDADES[limpiarId(c.montado)] ? 'un ' + ENTIDADES[limpiarId(c.montado)][0] : '«' + bonito(c.montado) + '»'));
    if (c.sin_dano) f.push('sin recibir daño');
    if (c.encantamiento) f.push('con el encantamiento ' + (ENCANTAMIENTOS[limpiarId(c.encantamiento.id)] || bonito(c.encantamiento.id)) + (c.encantamiento.nivel ? ' ' + romano(c.encantamiento.nivel) : ''));
    if (c.vida) f.push('con ' + (c.vida.tipo === 'debajo' ? 'menos' : 'más') + ' de ' + corazones(c.vida.valor) + ' de vida');
    if (c.efecto) f.push('con el efecto ' + (EFECTOS[limpiarId(c.efecto.id)] || bonito(c.efecto.id)) + (c.efecto.nivel ? ' ' + romano(c.efecto.nivel) : ''));
    if (c.hambre) f.push('con ' + (c.hambre.tipo === 'debajo' ? 'menos' : 'más') + ' de ' + (Number(c.hambre.valor) / 2) + ' muslos de comida');
    if (c.nivel) f.push('con nivel de experiencia ' + c.nivel + ' o más');
    if (c.puntaje) f.push('con al menos ' + c.puntaje.valor + ' puntos de «' + c.puntaje.objetivo + '»');
    if (c.bajo_agua) f.push('bajo el agua');
    if (c.agachado) f.push('agachado');
    if (c.en_llamas) f.push('en llamas');
    if (c.en_aire) f.push('en el aire');
    if (c.sin_armadura) f.push('sin armadura');
    if (c.plataforma) f.push(PLATAFORMAS[c.plataforma] || c.plataforma);
    if (c.equipo) f.push('llevando ' + conArticulo(c.equipo.item) + ' ' + (RANURAS[c.equipo.ranura] || ''));
    if (c.sobre_bloque) f.push('parado sobre ' + (BLOQUE_SING[limpiarId(c.sobre_bloque)] || '«' + bonito(c.sobre_bloque) + '»'));
    if (c.etiqueta) f.push('con la marca especial «' + c.etiqueta + '»');
    return f;
  }
  function romano(n) { return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][Number(n)] || String(n); }
  function textoDuracion(seg) {
    seg = Number(seg) || 0;
    var h = Math.floor(seg / 3600), m = Math.round((seg % 3600) / 60);
    if (h && m) return h + ' h ' + m + ' min';
    if (h) return h + (h === 1 ? ' hora' : ' horas');
    return m + (m === 1 ? ' minuto' : ' minutos');
  }
  function textoRepeticion(m) {
    if (m.categoria === 'historia' || m.repeticion === 'una_vez' || !m.repeticion) return 'Se completa una sola vez';
    if (m.repeticion === 'por_dia') { var v = Number(m.repeticion_veces) || 1; return v === 1 ? 'Se puede repetir una vez al día' : 'Se puede repetir hasta ' + v + ' veces al día'; }
    if (m.repeticion === 'cada_horas') { var h = Number(m.repeticion_horas) || 1; return 'Se puede repetir cada ' + h + (h === 1 ? ' hora' : ' horas'); }
    return '';
  }

  /* ---------- tiempo y zona horaria ---------- */
  function partes(fecha, zona) {
    try {
      var p = {};
      new Intl.DateTimeFormat('en-US', { timeZone: zona, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
        .formatToParts(fecha).forEach(function (x) { p[x.type] = +x.value; });
      return p;
    } catch (e) {
      return { year: fecha.getFullYear(), month: fecha.getMonth() + 1, day: fecha.getDate(), hour: fecha.getHours(), minute: fecha.getMinutes(), second: fecha.getSeconds() };
    }
  }
  function desfase(fecha, zona) { var p = partes(fecha, zona); return Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second) - Math.floor(fecha.getTime() / 1000) * 1000; }
  function inicioDelDia(config) {
    var zona = config.zona_horaria || 'America/La_Paz', ahora = new Date(), p = partes(ahora, zona);
    var t = Date.UTC(p.year, p.month - 1, p.day, Number(config.hora_reinicio) || 0, 0, 0) - desfase(ahora, zona);
    if (t > ahora.getTime()) t -= 864e5;
    return t;
  }
  function hora2(n) { return (n < 10 ? '0' : '') + n; }
  function cuandoAmigable(ms, config) {
    var zona = config.zona_horaria || 'America/La_Paz';
    var hoy = partes(new Date(), zona), p = partes(new Date(ms), zona);
    var dHoy = Date.UTC(hoy.year, hoy.month - 1, hoy.day), dP = Date.UTC(p.year, p.month - 1, p.day);
    var dif = Math.round((dP - dHoy) / 864e5);
    var hh = hora2(p.hour) + ':' + hora2(p.minute);
    if (dif <= 0) return 'hoy a las ' + hh;
    if (dif === 1) return 'mañana a las ' + hh;
    var meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return 'el ' + p.day + ' de ' + meses[p.month - 1] + ' a las ' + hh;
  }

  /* ---------- estado de una misión para el jugador ---------- */
  function contexto(d) {
    var porMision = {}, hechas = {};
    (d.progreso || []).forEach(function (p) {
      porMision[p.mision_id] = p;
      if ((p.veces_completada || 0) > 0 || p.estado === 'completada') hechas[p.mision_id] = true;
    });
    d.porMision = porMision; d.hechas = hechas;
    d.capCompleto = function (capId) {
      var ms = d.misiones.filter(function (m) { return m.categoria === 'historia' && m.capitulo_id === capId && m.activa; });
      return ms.length > 0 && ms.every(function (m) { return hechas[m.id]; });
    };
    return d;
  }
  function npcDe(m, d) {
    var id = m.npc_id;
    if (!id && m.categoria === 'historia') { var cap = d.capitulos.find(function (c) { return c.id === m.capitulo_id; }); if (cap) id = cap.npc_id; }
    var npc = id ? d.npcs.find(function (n) { return n.id === id; }) : null;
    return npc || d.npcs.find(function (n) { return n.es_principal; }) || null;
  }
  function requisitos(m, d) {
    var r = [];
    if (m.categoria === 'historia') {
      var cap = d.capitulos.find(function (c) { return c.id === m.capitulo_id; });
      if (cap && cap.capitulo_previo) {
        var prev = d.capitulos.find(function (c) { return c.id === cap.capitulo_previo; });
        r.push({ tipo: 'capitulo', id: cap.capitulo_previo, texto: 'Completar el capítulo «' + (prev ? prev.titulo : cap.capitulo_previo) + '»', ok: d.sesion ? d.capCompleto(cap.capitulo_previo) : null });
      }
    }
    if (m.mision_previa) {
      var mp = d.misiones.find(function (x) { return x.id === m.mision_previa; });
      r.push({ tipo: 'mision', id: m.mision_previa, texto: 'Completar la misión «' + (mp ? mp.titulo : m.mision_previa) + '»', ok: d.sesion ? !!d.hechas[m.mision_previa] : null });
    }
    return r;
  }
  function estadoMision(m, d) {
    if (!m.activa) return { clave: 'inactiva', texto: 'No disponible' };
    if (m.categoria === 'historia') {
      var cap = d.capitulos.find(function (c) { return c.id === m.capitulo_id; });
      if (cap && !cap.activo) return { clave: 'bloqueada', texto: 'Próximamente', detalle: 'Este capítulo todavía no está disponible.' };
    }
    if (!d.sesion) return { clave: 'sin_sesion', texto: '' };
    var p = d.porMision[m.id];
    if (p && p.estado === 'aceptada') return { clave: 'aceptada', texto: 'En curso', progreso: p };
    var faltan = requisitos(m, d).filter(function (r) { return r.ok === false; });
    if (faltan.length) return { clave: 'bloqueada', texto: 'Bloqueada', detalle: 'Para desbloquearla: ' + faltan.map(function (f) { return f.texto.charAt(0).toLowerCase() + f.texto.slice(1); }).join(' y ') + '.' };
    var hecha = !!d.hechas[m.id], cfg = d.config, inicio = inicioDelDia(cfg);
    if (hecha && p && p.completada_en) {
      var fin = new Date(p.completada_en).getTime();
      if (m.categoria === 'historia' || m.repeticion === 'una_vez' || !m.repeticion) return { clave: 'completada', texto: 'Completada' };
      if (m.repeticion === 'por_dia' && fin >= inicio && (Number(m.repeticion_veces) || 1) <= 1)
        return { clave: 'espera', texto: 'Completada hoy', detalle: 'Vuelve a estar disponible ' + cuandoAmigable(inicio + 864e5, cfg) + '.' };
      if (m.repeticion === 'cada_horas') {
        var prox = fin + (Number(m.repeticion_horas) || 1) * 3600e3;
        if (prox > Date.now()) return { clave: 'espera', texto: 'En espera', detalle: 'Vuelve a estar disponible ' + cuandoAmigable(prox, cfg) + '.' };
      }
    } else if (hecha && (m.categoria === 'historia' || m.repeticion === 'una_vez')) return { clave: 'completada', texto: 'Completada' };
    if (m.categoria === 'independiente') {
      var esInd = function (id) { var x = d.misiones.find(function (y) { return y.id === id; }); return x && x.categoria === 'independiente'; };
      var hoy = (d.progreso || []).filter(function (x) { return esInd(x.mision_id) && x.completada_en && new Date(x.completada_en).getTime() >= inicio; }).length;
      if (cfg.max_completadas_diarias && hoy >= cfg.max_completadas_diarias)
        return { clave: 'limite', texto: 'Límite diario', detalle: 'Ya completaste ' + hoy + (hoy === 1 ? ' misión independiente' : ' misiones independientes') + ' hoy. ¡Buen trabajo! Podrás hacer más ' + cuandoAmigable(inicio + 864e5, cfg) + '.' };
      var activas = (d.progreso || []).filter(function (x) { return x.estado === 'aceptada' && esInd(x.mision_id); }).length;
      if (cfg.max_misiones_activas && activas >= cfg.max_misiones_activas)
        return { clave: 'limite', texto: 'Máximo en curso', detalle: 'Tienes ' + activas + (activas === 1 ? ' misión independiente' : ' misiones independientes') + ' en curso. Termina alguna para aceptar otra.' };
    }
    return { clave: 'disponible', texto: 'Disponible' };
  }

  /* ---------- piezas de HTML reutilizables ---------- */
  var RESPALDO = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><radialGradient id="g" cx=".5" cy=".45" r=".55"><stop offset="0" stop-color="#FFF1D2"/><stop offset=".55" stop-color="#E4C6FF"/><stop offset="1" stop-color="#C79BF0" stop-opacity="0"/></radialGradient></defs><path d="M16 3l3 9.5 9.5 3.5-9.5 3.5L16 29l-3-9.5L3.5 16 13 12.5z" fill="url(#g)"/></svg>');
  function imgIcono(icono, alt) {
    var src = icono ? String(icono).replace(/^\/+/, '') : '';
    if (src && !/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(src) && !/^https?:/i.test(src)) src += '.png';
    return '<img class="icono-item" src="' + esc(src || RESPALDO) + '" alt="' + esc(alt || '') + '" loading="lazy" onerror="this.onerror=null;this.src=Comun.RESPALDO">';
  }
  function etiquetaEstado(e) { return e && e.texto ? '<span class="estado ' + e.clave + '">' + (e.clave === 'bloqueada' ? ic('candado') : '') + esc(e.texto) + '</span>' : ''; }
  function barras(m, p) {
    return m.objetivos.map(function (o) {
      var actual = Math.min(o.cantidad, Number((p && p.avance && p.avance[o.id]) || 0));
      var pct = Math.round(actual / o.cantidad * 100);
      return '<div class="objetivo-prog"><div class="fila"><span>' + esc(textoObjetivo(o)) + '</span><b>' + actual + ' / ' + o.cantidad + '</b></div><div class="barra-prog" role="progressbar" aria-valuemin="0" aria-valuemax="' + o.cantidad + '" aria-valuenow="' + actual + '"><i style="width:' + pct + '%"></i></div></div>';
    }).join('');
  }
  function tarjetaMision(m, d) {
    var npc = npcDe(m, d), e = estadoMision(m, d);
    var cap = m.categoria === 'historia' ? d.capitulos.find(function (c) { return c.id === m.capitulo_id; }) : null;
    return '<article class="perg tarjeta entrar" tabindex="0" role="link" data-mision="' + esc(m.id) + '" aria-label="' + esc(m.titulo) + '"><div class="perg-brillo"></div>' +
      '<div class="tarjeta-cab">' + imgIcono(m.icono, '') + '<div><h3>' + esc(m.titulo) + '</h3>' + (npc ? '<p class="npc">Te la da ' + esc(npc.nombre) + '</p>' : '') + '</div></div>' +
      '<div class="etiquetas"><span class="etq ' + m.categoria + '">' + (m.categoria === 'historia' ? ic('libro') + (cap ? 'Capítulo ' + cap.orden : 'Historia') : ic('estrella') + 'Independiente') + '</span>' + etiquetaEstado(e) + '</div>' +
      '<p class="desc">' + esc(m.descripcion) + '</p>' +
      (e.clave === 'aceptada' ? barras(m, e.progreso) : '') +
      (m.recompensa_texto ? '<div class="recompensa">' + ic('regalo') + '<span>Recompensa: <b>' + esc(m.recompensa_texto) + '</b></span></div>' : '') + '</article>';
  }
  function detalleMision(m, d, opciones) {
    opciones = opciones || {};
    var npc = npcDe(m, d), e = opciones.vistaPrevia ? { clave: 'sin_sesion', texto: '' } : estadoMision(m, d);
    var cap = m.categoria === 'historia' ? d.capitulos.find(function (c) { return c.id === m.capitulo_id; }) : null;
    var reqs = requisitos(m, opciones.vistaPrevia ? Object.assign({}, d, { sesion: null }) : d);
    var html = '<section class="perg entrar"><div class="perg-brillo"></div>' +
      '<div class="detalle-cab">' + imgIcono(m.icono, '') + '<div><h2>' + esc(m.titulo || 'Misión sin título') + '</h2>' + (npc ? '<p class="npc">Te la da ' + esc(npc.nombre) + '</p>' : '') + '</div></div>' +
      '<div class="etiquetas" style="margin-top:12px"><span class="etq ' + m.categoria + '">' + (m.categoria === 'historia' ? ic('libro') + (cap ? 'Capítulo ' + cap.orden + ' · ' + esc(cap.titulo) : 'Historia') : ic('estrella') + 'Independiente') + '</span>' + etiquetaEstado(e) + '</div>' +
      (m.descripcion ? '<p style="margin-top:14px;font-size:1.02rem">' + esc(m.descripcion) + '</p>' : '') +
      '<div class="bloque"><h3>Objetivos</h3>' + (e.clave === 'aceptada' ? '<div class="datos-mision">' + barras(m, e.progreso) + '</div>' :
        '<ol class="lista-objetivos">' + (m.objetivos || []).map(function (o, i) {
          var fr = frasesCondiciones(o.condiciones);
          return '<li><span class="num">' + (i + 1) + '</span><div><b>' + esc(textoObjetivo(o)) + '</b>' + (fr.length ? '<div class="condiciones">' + fr.map(function (t) { return '<span class="cond">' + esc(t) + '</span>'; }).join('') + '</div>' : '') + '</div></li>';
        }).join('') + '</ol>') + '</div>' +
      '<div class="bloque"><h3>Detalles</h3><div class="datos-mision">' +
        '<div class="dato">' + ic('repetir') + '<span>' + esc(textoRepeticion(m)) + '</span></div>' +
        (m.tiempo_limite_seg ? '<div class="dato">' + ic('reloj_arena') + '<span>Tienes ' + esc(textoDuracion(m.tiempo_limite_seg)) + ' para completarla</span></div>' : '<div class="dato">' + ic('reloj') + '<span>Sin tiempo límite</span></div>') +
        (reqs.length ? reqs.map(function (r) { return '<div class="dato">' + ic(r.ok === true ? 'check' : 'candado') + '<span>' + esc(r.texto) + (r.ok === true ? ' ✓' : '') + '</span></div>'; }).join('') : '') +
      '</div></div>' +
      (m.recompensa_texto ? '<div class="bloque"><h3>Recompensa</h3><div class="recompensa">' + ic('regalo') + '<span><b>' + esc(m.recompensa_texto) + '</b></span></div></div>' : '');
    if (!opciones.vistaPrevia) {
      if (e.detalle) html += '<div class="aviso ' + (e.clave === 'limite' ? 'rosa' : e.clave === 'espera' ? 'oro' : '') + '" style="margin-top:16px">' + ic(e.clave === 'bloqueada' ? 'candado' : 'info') + '<span>' + esc(e.detalle) + '</span></div>';
      html += '<div class="acciones">';
      if (e.clave === 'sin_sesion') html += '<a class="boton magico ancho" href="#aventura">' + ic('enlace') + 'Vincula tu cuenta para aceptar</a>';
      else if (e.clave === 'disponible') html += '<button class="boton ancho" type="button" data-aceptar="' + esc(m.id) + '">' + ic('destello') + 'Aceptar misión</button>';
      else if (e.clave === 'aceptada') html += '<div class="aviso" style="width:100%">' + ic('destello') + '<span>Esta misión está en curso. Tu avance se actualiza mientras juegas.</span></div>';
      html += '</div>';
    }
    return html + '</section>';
  }

  /* ---------- efectos ---------- */
  function iniciarChispas() {
    var cont = document.querySelector('.chispas'); if (!cont) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var colores = ['#FFE7B0', '#E4C6FF', '#FFD6E4', '#FFF4DA'];
    for (var i = 0; i < 22; i++) {
      var s = document.createElement('span'); s.className = 'chispa';
      s.style.cssText = 'left:' + (Math.random() * 100) + '%;--t:' + (2 + Math.random() * 3).toFixed(1) + 'px;--c:' + colores[i % colores.length] + ';--d:' + (10 + Math.random() * 14).toFixed(1) + 's;--r:-' + (Math.random() * 20).toFixed(1) + 's;--x:' + (Math.random() * 80 - 40).toFixed(0) + 'px';
      cont.appendChild(s);
    }
  }
  function iniciarNiebla() {
    var raiz = document.documentElement, pend = false;
    function act() { pend = false; var y = window.scrollY || 0; var t = Math.min(1, Math.max(0, (y - innerHeight * .25) / (innerHeight * .6))); raiz.style.setProperty('--niebla', t.toFixed(3)); }
    window.addEventListener('scroll', function () { if (!pend) { pend = true; requestAnimationFrame(act); } }, { passive: true });
    act();
  }
  var tTimer;
  function toast(msg, tipo) {
    var t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
    t.className = 'toast ' + (tipo || ''); t.textContent = msg; t.hidden = false;
    clearTimeout(tTimer); tTimer = setTimeout(function () { t.hidden = true; }, 4200);
  }
  function cargando(texto) { return '<div class="cargando"><div class="orbe"></div><span>' + esc(texto || 'Abriendo el libro de misiones…') + '</span></div>'; }

  window.Comun = {
    ic: ic, SELLO: SELLO, esc: esc, bonito: bonito, RESPALDO: RESPALDO, imgIcono: imgIcono,
    textoObjetivo: textoObjetivo, frasesCondiciones: frasesCondiciones, textoRepeticion: textoRepeticion, textoDuracion: textoDuracion,
    contexto: contexto, npcDe: npcDe, estadoMision: estadoMision, requisitos: requisitos, barras: barras,
    tarjetaMision: tarjetaMision, detalleMision: detalleMision, etiquetaEstado: etiquetaEstado,
    inicioDelDia: inicioDelDia, cuandoAmigable: cuandoAmigable,
    iniciarChispas: iniciarChispas, iniciarNiebla: iniciarNiebla, toast: toast, cargando: cargando,
    ENTIDADES: ENTIDADES, METODOS: METODOS, ENCANTAMIENTOS: ENCANTAMIENTOS, EFECTOS: EFECTOS, BIOMAS: BIOMAS,
    DIMENSIONES: DIMENSIONES, CLIMAS: CLIMAS, HORAS: HORAS, LUNAS: LUNAS, PLATAFORMAS: PLATAFORMAS, RANURAS: RANURAS
  };
})();
